import express from "express";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import fs from "fs/promises";
import path from "path";
import admin from "firebase-admin";
import crypto from "crypto";

import { ingestRepo, parseGitHubUrl } from "./services/githubService";
import { summarizeCodebase, chatWithCodebase, aiEditFile, USE_OLLAMA, OLLAMA_MODEL, GEMINI_MODEL } from "./services/geminiService";
import { generateRandomIdentifiers } from "./services/pluginService";

// ─── Environment flags ────────────────────────────────────────────────────────
// When DISABLE_RATE_LIMIT=true (self-hosted/GitHub version), all AI limits are removed
const IS_DEPLOYED = (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") && process.env.DISABLE_RATE_LIMIT !== "true";

// ─── Firebase (optional) ─────────────────────────────────────────────────────
let db: admin.firestore.Firestore | null = null;
let auth: admin.auth.Auth | null = null;

const SA_JSON = process.env.FIREBASE_SERVICE_ACCOUNT;
if (SA_JSON) {
  try {
    let serviceAccount;
    if (SA_JSON.trim().startsWith("{")) {
      serviceAccount = JSON.parse(SA_JSON);
    } else {
      const fileContent = await fs.readFile(path.resolve(SA_JSON), "utf-8");
      serviceAccount = JSON.parse(fileContent);
    }
    if (serviceAccount) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      db = admin.firestore();
      auth = admin.auth();
      console.log("🟢 Firebase Cloud Storage synced.");
    }
  } catch (err: any) {
    console.warn(`🟡 Firebase init failed: ${err.message}. Using Local Mode.`);
  }
} else {
  console.log("⚪ Local-Only Mode (no FIREBASE_SERVICE_ACCOUNT).");
}

// ─── Local storage paths ──────────────────────────────────────────────────────
const LOCAL_DATA_DIR = path.resolve("data");
const STORE = {
  repos: path.join(LOCAL_DATA_DIR, "repositories"),
  keys:  path.join(LOCAL_DATA_DIR, "api_keys"),
  files: path.join(LOCAL_DATA_DIR, "context_files"), // .txt context files per repo
};

// ─── Promo & Cloud Restrictions ───────────────────────────────────────────────
let unlockedUsers = new Set<string>();
let promoUses = 3;

async function syncPromoState() {
  if (db) {
    const doc = await db.collection("system").doc("promo_state").get();
    if (doc.exists) {
      const data = doc.data() as any;
      promoUses = data?.uses !== undefined ? data.uses : 3;
      unlockedUsers = new Set(data?.unlocked || []);
    }
  }
}

async function updatePromoState() {
  if (db) {
    await db.collection("system").doc("promo_state").set({ uses: promoUses, unlocked: Array.from(unlockedUsers) });
  }
}

async function bootstrap() {
  await fs.mkdir(STORE.repos,  { recursive: true });
  await fs.mkdir(STORE.keys,   { recursive: true });
  await fs.mkdir(STORE.files,  { recursive: true });
  await syncPromoState();
}

async function atomicWrite(filePath: string, data: any) {
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, typeof data === "string" ? data : JSON.stringify(data), "utf-8");
  await fs.rename(tmp, filePath);
}

// ─── Auth middleware ──────────────────────────────────────────────────────────
const authenticate: express.RequestHandler = async (req, res, next) => {
  if (req.method === "OPTIONS") return next();
  const bearer = (req.headers.authorization || "").split(" ")[1];
  
  // Allow unauthenticated chat calls temporarily (will check repository publicAgent flag inside route)
  if (!bearer) {
    if (req.path.endsWith("/chat")) {
       (req as any).user = { uid: "public" };
       return next();
    }
    return res.status(401).json({ error: "Authorization required." });
  }

  // API Key
  if (bearer.startsWith("rp_live_")) {
    if (db) {
      const q = await db.collection("api_keys").where("key", "==", bearer).get();
      if (!q.empty) { (req as any).user = { uid: q.docs[0].data().userId, isApiKey: true }; return next(); }
    } else {
      try {
        const keys = await fs.readdir(STORE.keys);
        for (const f of keys) {
          const k = JSON.parse(await fs.readFile(path.join(STORE.keys, f), "utf-8"));
          if (k.key === bearer) { (req as any).user = { uid: k.userId, isApiKey: true }; return next(); }
        }
      } catch (e) {}
    }
    return res.status(403).json({ error: "Invalid API key." });
  }

  // Firebase ID token
  if (auth) {
    try {
      const decoded = await auth.verifyIdToken(bearer);
      (req as any).user = decoded;
      return next();
    } catch (e: any) {
      console.error(`[AUTH] Token failed: ${e.message}`);
    }
  } else if (process.env.NODE_ENV !== "production") {
    // Dev fallback: decode without verify
    try {
      const parts = bearer.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
        (req as any).user = { ...payload, uid: payload.user_id || payload.sub };
        console.warn(`[AUTH-DEV] Unverified identity accepted: ${payload.email}`);
        return next();
      }
    } catch (e) {}
  }

  res.status(403).json({ error: "Access denied." });
};

// Middleware restricting features on deployed version without a promo
const requireSelfHosted: express.RequestHandler = async (req, res, next) => {
  const uid = (req as any).user?.uid;
  await syncPromoState();
  if (IS_DEPLOYED && !unlockedUsers.has(uid)) {
     return res.status(403).json({ error: "Feature restricted to Self-Hosted version or Cloud with unlocked perks." });
  }
  next();
};

// ─── Public context-file access (no auth, for AI agents) ─────────────────────
// Served at GET /api/repo/:id/context.txt — the live LLM-friendly file
async function getContextFilePath(repoId: string) {
  return path.join(STORE.files, `${repoId}.txt`);
}

async function getRepoTrace(id: string): Promise<any | null> {
  if (db) {
    const doc = await db.collection("repositories").doc(id).get();
    return doc.exists ? doc.data() : null;
  }
  try {
    return JSON.parse(await fs.readFile(path.join(STORE.repos, `${id}.json`), "utf-8"));
  } catch { return null; }
}

async function saveRepoTrace(id: string, payload: any) {
  if (db) await db.collection("repositories").doc(id).set(payload);
  else await atomicWrite(path.join(STORE.repos, `${id}.json`), payload);
}

// ─── Build context .txt file from ingestion ───────────────────────────────────
function buildContextFile(owner: string, repo: string, summary: string, unifiedContent: string): string {
  return [
    `# Repo Trace CONTEXT FILE`,
    `# Repository: ${owner}/${repo}`,
    `# Generated: ${new Date().toISOString()}`,
    `# This file is the live, LLM-friendly context for this repository.`,
    `# It is auto-updated on each sync and editable via the AI tool.`,
    ``,
    `## AI SUMMARY`,
    summary,
    ``,
    `## FULL CODEBASE`,
    unifiedContent,
  ].join("\n");
}

// ─── App bootstrap ────────────────────────────────────────────────────────────
async function start() {
  await bootstrap();
  const app = express();

  app.use(compression());
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: false,
  }));
  app.use((req, res, next) => {
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });
  app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }));
  app.use(express.json({ limit: "10mb" }));

  // Request logger
  app.use((req, _res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
  });

  // ─── Rate limiting (enabled globally for all environments) ──────────
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: "Too many requests. Try again later." },
    standardHeaders: true, legacyHeaders: false,
  });
  app.use("/api", generalLimiter);

  // Daily limit – 1000 AI actions per day
  const dailyAiLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 1000,
    keyGenerator: (req) => (req as any).user?.uid || req.ip || "anon",
    handler: (_req, res) => res.status(429).json({
      error: "Daily limit reached",
      message: "Please upgrade your account for more requests.",
    }),
    standardHeaders: true, legacyHeaders: false,
  });
  app.use("/api/ingest", dailyAiLimiter);
  app.use("/api/repo/:id/refresh", dailyAiLimiter);
  app.use("/api/repo/:id/chat", dailyAiLimiter);
  app.use("/api/repo/:id/ai-edit", dailyAiLimiter);

  console.log("🔒 API Rate limits active (1000 requests).");

  // ─── Health ───────────────────────────────────────────────────────────────
  app.get("/api/health", async (_req, res) => {
    let writeStatus = "ok";
    try { await fs.writeFile(path.join(LOCAL_DATA_DIR, ".health"), Date.now().toString()); }
    catch { writeStatus = "error"; }
    
    await syncPromoState();
    
    res.json({
      status: "active", 
      version: "4.9.0",
      storage: db ? "Firebase" : "Local",
      ai: USE_OLLAMA ? `Ollama (${OLLAMA_MODEL})` : `Gemini (${GEMINI_MODEL})`,
      rateLimits: IS_DEPLOYED ? "active" : "disabled",
      write: writeStatus,
      promoExhausted: promoUses <= 0
    });
  });

  // ─── PROMO CODE REDEMPTION ────────────────────────────────────────────────
  app.post("/api/promo", authenticate, async (req, res) => {
    const { code } = req.body;
    if (code === "PRO-HOSTED-3X") {
      await syncPromoState(); // Always sync latest before checking
      if (promoUses > 0) {
        const uid = (req as any).user?.uid;
        if (uid && !unlockedUsers.has(uid)) {
          promoUses--;
          unlockedUsers.add(uid);
          await updatePromoState();
          return res.json({ success: true, message: `Code accepted! Cloud agent features unlocked for your account. (${promoUses} uses remaining globally)` });
        } else if (uid && unlockedUsers.has(uid)) {
          return res.json({ success: true, message: `Your account is already unlocked with premium privileges.` });
        }
      }
      return res.status(400).json({ error: "This promo code has already been exhausted." });
    }
    return res.status(400).json({ error: "Invalid promo code." });
  });

  // ─── REPOS ────────────────────────────────────────────────────────────────
  app.get("/api/repos", authenticate, async (req, res) => {
    try {
      if (db) {
        const snap = await db.collection("repositories").get();
        return res.json(snap.docs.map(d => ({ id: d.id, ...d.data().metadata })));
      }
      const files = (await fs.readdir(STORE.repos)).filter(f => f.endsWith(".json"));
      const repos = await Promise.all(files.map(async f => {
        const d = JSON.parse(await fs.readFile(path.join(STORE.repos, f), "utf-8"));
        return { id: f.replace(".json", ""), ...d.metadata };
      }));
      res.json(repos);
    } catch (e) { res.status(500).json({ error: "Library fetch failed." }); }
  });

  // ─── INGEST (initial) ─────────────────────────────────────────────────────
  app.post("/api/ingest", authenticate, async (req, res) => {
    const { url } = req.body;
    const parts = parseGitHubUrl(url);
    if (!parts) return res.status(400).json({ error: "Invalid GitHub URL." });

    const repoId = crypto.createHash("md5").update(`${parts.owner}/${parts.repo}`).digest("hex");
    const userGithubToken = req.headers["x-github-token"] as string | undefined;
    const ollamaModelOverride = req.headers["x-ollama-model"] as string | undefined;
    const customGeminiKey = req.headers["x-gemini-key"] as string | undefined;
    const customGeminiModel = req.headers["x-gemini-model"] as string | undefined;

    try {
      const ingestion = await ingestRepo(parts.owner, parts.repo, userGithubToken);
      const summary   = await summarizeCodebase(ingestion.unifiedContent, { 
        ollamaModel: ollamaModelOverride, customGeminiKey, customGeminiModel 
      });

      const payload = {
        metadata: {
          name: ingestion.repoName,
          owner: parts.owner,
          repo: parts.repo,
          files: ingestion.files.length,
          size: ingestion.unifiedContent.length,
          updatedAt: new Date().toISOString(),
          lastApiUsage: null,
          publicAgent: false
        },
        perception_map:  summary,
        unified_content: ingestion.unifiedContent,
      };

      await saveRepoTrace(repoId, payload);

      // Write the context .txt file
      const contextContent = buildContextFile(parts.owner, parts.repo, summary, ingestion.unifiedContent);
      await atomicWrite(await getContextFilePath(repoId), contextContent);

      res.json({ id: repoId, ...payload });
    } catch (e: any) {
      console.error("Ingest error:", e);
      res.status(500).json({ error: e.message || "Ingestion failed." });
    }
  });

  // ─── REFRESH (re-sync existing repo) ─────────────────────────────────────
  app.post("/api/repo/:id/refresh", authenticate, async (req, res) => {
    const { id } = req.params;
    const { url } = req.body; // pass original URL again
    const parts = parseGitHubUrl(url);
    if (!parts) return res.status(400).json({ error: "Valid GitHub URL required for refresh." });

    const userGithubToken = req.headers["x-github-token"] as string | undefined;
    const ollamaModelOverride = req.headers["x-ollama-model"] as string | undefined;
    const customGeminiKey = req.headers["x-gemini-key"] as string | undefined;
    const customGeminiModel = req.headers["x-gemini-model"] as string | undefined;

    try {
      const ingestion = await ingestRepo(parts.owner, parts.repo, userGithubToken);
      const summary   = await summarizeCodebase(ingestion.unifiedContent, { 
        ollamaModel: ollamaModelOverride, customGeminiKey, customGeminiModel 
      });

      const payload = {
        metadata: {
          name: ingestion.repoName,
          owner: parts.owner,
          repo: parts.repo,
          files: ingestion.files.length,
          size: ingestion.unifiedContent.length,
          updatedAt: new Date().toISOString(),
          lastApiUsage: new Date().toISOString(),
          publicAgent: false
        },
        perception_map:  summary,
        unified_content: ingestion.unifiedContent,
      };

      await saveRepoTrace(id, payload);

      // Always regenerate the context file on refresh
      const contextContent = buildContextFile(parts.owner, parts.repo, summary, ingestion.unifiedContent);
      await atomicWrite(await getContextFilePath(id), contextContent);

      res.json({ id, ...payload, refreshed: true });
    } catch (e: any) {
      console.error("Refresh error:", e);
      res.status(500).json({ error: e.message || "Refresh failed." });
    }
  });

  // ─── GET single repo ──────────────────────────────────────────────────────
  app.get("/api/repo/:id", authenticate, async (req, res) => {
    const data = await getRepoTrace(req.params.id);
    if (!data) return res.status(404).json({ error: "Repo not found." });
    res.json(data);
  });

  // ─── CHAT ─────────────────────────────────────────────────────────────────
  app.post("/api/repo/:id/chat", authenticate, async (req, res) => {
    const user = (req as any).user;
    
    // Cloud limitation: prohibit external API Key agents unless unlocked 
    if (user?.isApiKey && IS_DEPLOYED && !unlockedUsers.has(user?.uid)) {
       return res.status(403).json({ error: "Agent API access is restricted to self-hosted versions. Redeem a promo code in Settings to unlock cloud privileges." });
    }

    const { query, history } = req.body;
    if (!query) return res.status(400).json({ error: "query is required." });

    const ollamaModelOverride = req.headers["x-ollama-model"] as string | undefined;
    const customGeminiKey = req.headers["x-gemini-key"] as string | undefined;
    const customGeminiModel = req.headers["x-gemini-model"] as string | undefined;

    const data = await getRepoTrace(req.params.id);
    if (!data) return res.status(404).json({ error: "Repo not found." });

    // Enforce public agent settings
    if (user?.uid === "public" && !data.metadata.publicAgent) {
      return res.status(401).json({ error: "Authorization required. The database owner has not enabled public agent access." });
    }

    try {
      // update last used API stamp
      data.metadata.lastApiUsage = new Date().toISOString();
      await saveRepoTrace(req.params.id, data);

      const answer = await chatWithCodebase(query, data.unified_content, history || [], { 
        ollamaModel: ollamaModelOverride, customGeminiKey, customGeminiModel 
      });
      res.json({ answer });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Chat failed." });
    }
  });

  // ─── CONTEXT FILE — public read (for AI agents, no auth needed) ──────────
  app.get("/api/repo/:id/context.txt", async (req, res) => {
    try {
      const filePath = await getContextFilePath(req.params.id);
      const content = await fs.readFile(filePath, "utf-8");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.send(content);
    } catch {
      res.status(404).json({ error: "Context file not found. Ingest the repo first." });
    }
  });

  // ─── CONTEXT FORMATTED JSON (Live Data Structured API) ────────────────────
  app.get("/api/repo/:id/context.json", async (req, res) => {
    try {
      const data = await getRepoTrace(req.params.id);
      if (!data) return res.status(404).json({ error: "Repo not found." });
      
      const structured: Record<string, string> = {};
      const parts = (data.unified_content || "").split("[EOF]");
      for (const p of parts) {
        const idx = p.indexOf("]\n");
        if (p.trim().startsWith("[FILE: ") && idx !== -1) {
          const filepath = p.substring(p.indexOf("[FILE: ") + 7, idx).trim();
          const content = p.substring(idx + 2).trim();
          structured[filepath] = content;
        }
      }
      
      data.metadata.lastApiUsage = new Date().toISOString();
      await saveRepoTrace(req.params.id, data);
      
      res.json(structured);
    } catch {
      res.status(500).json({ error: "Context JSON generation failed." });
    }
  });

  // ─── SETTINGS: Public Agent Toggle ─────────────────────────────────────────
  app.post("/api/repo/:id/public-agent", authenticate, async (req, res) => {
    const data = await getRepoTrace(req.params.id);
    if (!data) return res.status(404).json({ error: "Repo not found." });
    data.metadata.publicAgent = !!req.body.enabled;
    await saveRepoTrace(req.params.id, data);
    res.json({ success: true, publicAgent: data.metadata.publicAgent });
  });

  // ─── CONTEXT FILE — update manually ──────────────────────────────────────
  app.put("/api/repo/:id/context.txt", authenticate, async (req, res) => {
    const { content } = req.body;
    if (typeof content !== "string") return res.status(400).json({ error: "content string required." });
    try {
      await atomicWrite(await getContextFilePath(req.params.id), content);

      // Also update perception_map in main data
      const data = await getRepoTrace(req.params.id);
      if (data) {
        data.perception_map = content;
        data.metadata.updatedAt = new Date().toISOString();
        await saveRepoTrace(req.params.id, data);
      }

      res.json({ success: true, size: content.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── AI EDIT context file ─────────────────────────────────────────────────
  app.post("/api/repo/:id/ai-edit", authenticate, async (req, res) => {
    const { instruction } = req.body;
    if (!instruction) return res.status(400).json({ error: "instruction required." });

    try {
      const filePath = await getContextFilePath(req.params.id);
      let current = "";
      try { current = await fs.readFile(filePath, "utf-8"); }
      catch { 
        const data = await getRepoTrace(req.params.id);
        if (data) current = data.unified_content || "";
      }

      const updated = await aiEditFile(current, instruction);
      await atomicWrite(filePath, updated);

      res.json({ updated: true, preview: updated.substring(0, 500) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── DOWNLOAD context file ────────────────────────────────────────────────
  app.get("/api/repo/:id/download", authenticate, async (req, res) => {
    try {
      const data = await getRepoTrace(req.params.id);
      if (!data) return res.status(404).json({ error: "Repo not found." });

      const filePath = await getContextFilePath(req.params.id);
      let content: string;
      try {
        content = await fs.readFile(filePath, "utf-8");
      } catch {
        // Fallback: build on the fly
        content = buildContextFile(
          data.metadata.owner,
          data.metadata.repo || data.metadata.name,
          data.perception_map,
          data.unified_content
        );
      }

      const filename = `${(data.metadata.name || req.params.id).replace(/\//g, "_")}_context.txt`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.send(content);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── KEYS ─────────────────────────────────────────────────────────────────
  app.get("/api/keys", authenticate, requireSelfHosted, async (req, res) => {
    const uid = (req as any).user?.uid;
    try {
      if (db) {
        const snap = await db.collection("api_keys").where("userId", "==", uid).get();
        return res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      const files = (await fs.readdir(STORE.keys)).filter(f => f.endsWith(".json"));
      const keys  = await Promise.all(files.map(f => fs.readFile(path.join(STORE.keys, f), "utf-8").then(JSON.parse)));
      res.json(keys.filter((k: any) => k.userId === uid));
    } catch (e) { res.status(500).json({ error: "Fetch keys failed" }); }
  });

  app.post("/api/keys", authenticate, requireSelfHosted, async (req, res) => {
    const { name } = req.body;
    const uid = (req as any).user?.uid || "anonymous";
    const key = `rp_live_${crypto.randomBytes(16).toString("hex")}`;
    const payload = { key, name, userId: uid, createdAt: new Date().toISOString() };
    try {
      if (db) {
        const doc = await db.collection("api_keys").add(payload);
        return res.json({ id: doc.id, ...payload });
      }
      const id = crypto.randomUUID();
      await atomicWrite(path.join(STORE.keys, `${id}.json`), { id, ...payload });
      res.json({ id, ...payload });
    } catch (e) { res.status(500).json({ error: "Key creation failed" }); }
  });

  app.delete("/api/keys/:id", authenticate, requireSelfHosted, async (req, res) => {
    try {
      if (db) await db.collection("api_keys").doc(req.params.id).delete();
      else await fs.unlink(path.join(STORE.keys, `${req.params.id}.json`));
      res.status(204).send();
    } catch (e) { res.status(500).json({ error: "Deletion failed." }); }
  });

  // ─── Plugins ──────────────────────────────────────────────────────────────
  app.post("/api/plugins/random-identifier", authenticate, async (req, res) => {
    const { seed, count } = req.body;
    if (!seed) return res.status(400).json({ error: "seed required." });
    try {
      const identifiers = generateRandomIdentifiers(seed, count || 5);
      res.json({ success: true, timestamp: new Date().toISOString(), identifiers });
    } catch (e) { res.status(500).json({ error: "Plugin failed." }); }
  });

  // ─── Vite / Static serving ─────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa", base: "/" });
    app.use(vite.middlewares);
    app.use("*", async (req, res) => {
      try {
        let template = await fs.readFile(path.resolve("index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) { vite.ssrFixStacktrace(e); res.status(500).end(e.stack); }
    });
  } else {
    app.use(express.static("dist", { maxAge: "30d", immutable: true, index: false }));
    app.get("*", async (req, res) => {
      try {
        const template = await fs.readFile(path.resolve("dist", "index.html"), "utf-8");
        res.set({ "Content-Type": "text/html" }).send(template);
      } catch { res.sendFile(path.resolve("dist", "index.html")); }
    });
  }

  const PORT = Number(process.env.PORT) || 3005;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Repo Trace PROTOCOL v4.8 READY`);
    console.log(`🛰️  http://localhost:${PORT}`);
    console.log(`🤖 AI Backend: ${USE_OLLAMA ? `Ollama (${OLLAMA_MODEL}) @ ${process.env.OLLAMA_HOST || "http://localhost:11434"}` : `Gemini (${GEMINI_MODEL})`}`);
    console.log(`🔒 Rate Limits: ${IS_DEPLOYED ? "ACTIVE (deployed)" : "DISABLED (self-hosted)"}`);
    console.log(`📁 Storage: ${db ? "Firebase" : "Local (./data)"}\n`);
  });
}

start();
