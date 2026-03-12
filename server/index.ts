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

// Relative imports updated for new server structure
import { ingestRepo, parseGitHubUrl } from "./services/githubService";
import { summarizeCodebase, chatWithCodebase } from "./services/geminiService";
import { generateRandomIdentifiers } from "./services/pluginService";

// --- Storage Infrastructure ---
let db: admin.firestore.Firestore | null = null;
let auth: admin.auth.Auth | null = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
    auth = admin.auth();
    console.log("🟢 SYSTEM: Firebase Cloud Storage Synced.");
  } catch (err) {
    console.warn("🟡 SYSTEM: Firebase Init Failed. Starting in Local-Only Mode.");
  }
}

const LOCAL_DATA_DIR = path.resolve("data");
const STORE = {
  repos: path.join(LOCAL_DATA_DIR, "repositories"),
  keys: path.join(LOCAL_DATA_DIR, "api_keys")
};

async function bootstrap() {
  await fs.mkdir(STORE.repos, { recursive: true });
  await fs.mkdir(STORE.keys, { recursive: true });
}

async function atomicWrite(filePath: string, data: any) {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data), "utf-8");
  await fs.rename(tempPath, filePath);
}

const authenticate: express.RequestHandler = async (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  const bearer = req.headers.authorization?.split(" ")[1];
  if (!bearer) return res.status(401).json({ error: "Login required." });

  // 1. API Key Authentication (rp_live_...)
  if (bearer.startsWith("rp_live_")) {
    if (db) {
      const q = await db.collection("api_keys").where("key", "==", bearer).get();
      if (!q.empty) return next();
    } else {
      try {
        const keys = await fs.readdir(STORE.keys);
        for (const f of keys) {
          const k = JSON.parse(await fs.readFile(path.join(STORE.keys, f), "utf-8"));
          if (k.key === bearer) return next();
        }
      } catch (e) {}
    }
  }

  // 2. Firebase ID Token Authentication
  if (auth) {
    try {
      const decoded = await auth.verifyIdToken(bearer);
      (req as any).user = decoded;
      return next();
    } catch (e) {}
  }

  res.status(403).json({ error: "Access Denied. Identity validation required." });
};

async function start() {
  await bootstrap();
  const app = express();
  
  app.use(compression());
  app.use(helmet({ 
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
  
  app.use((req, res, next) => {
    res.setHeader('X-Robots-Tag', 'index, follow');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Standard cache
    next();
  });

  app.use(cors({ origin: "*", methods: ["GET", "POST", "DELETE", "OPTIONS"] }));
  app.use(express.json());

  // --- Dynamic Rate Limiting ---
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 1000, 
    message: { error: "Protocol flooded. Too many requests." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", limiter);

  app.get("/api/health", async (req, res) => {
    let writeStatus = "unknown";
    try {
      const testFile = path.join(LOCAL_DATA_DIR, ".health");
      await fs.writeFile(testFile, Date.now().toString());
      writeStatus = "ok";
    } catch (e) { writeStatus = "error"; }

    res.json({ 
      status: "active", 
      version: "3.5.0", 
      storage: db ? "Cloud" : "Local",
      write: writeStatus,
      env: process.env.NODE_ENV || "dev"
    });
  });

  app.get("/api/repos", authenticate, async (req, res) => {
    try {
      if (db) {
        const snap = await db.collection("repositories").get();
        return res.json(snap.docs.map(d => ({ id: d.id, ...d.data().metadata })));
      }
      const files = await fs.readdir(STORE.repos);
      const repos = await Promise.all(files.filter(f => f.endsWith('.json')).map(async f => {
        const data = JSON.parse(await fs.readFile(path.join(STORE.repos, f), "utf-8"));
        return { id: f.replace('.json', ''), ...data.metadata };
      }));
      res.json(repos);
    } catch (e) { res.status(500).json({ error: "Library list failed." }); }
  });

  app.post("/api/ingest", authenticate, async (req, res) => {
    const { url } = req.body;
    const parts = parseGitHubUrl(url);
    if (!parts) return res.status(400).json({ error: "Invalid Hub URL." });
    const repoId = crypto.createHash('md5').update(`${parts.owner}/${parts.repo}`).digest('hex');
    const userGithubToken = req.headers['x-github-token'] as string | undefined;
    try {
      const ingestion = await ingestRepo(parts.owner, parts.repo, userGithubToken);
      const summary = await summarizeCodebase(ingestion.unifiedContent);
      const payload = { 
        metadata: { name: ingestion.repoName, owner: parts.owner, files: ingestion.files.length, size: ingestion.unifiedContent.length, updatedAt: new Date().toISOString() },
        perception_map: summary,
        unified_content: ingestion.unifiedContent
      };
      if (db) await db.collection("repositories").doc(repoId).set(payload);
      else await atomicWrite(path.join(STORE.repos, `${repoId}.json`), payload);
      res.json({ id: repoId, ...payload });
    } catch (e: any) { res.status(500).json({ error: "Ingestion failed." }); }
  });

  app.get("/api/keys", authenticate, async (req, res) => {
    const user = (req as any).user;
    const uid = user?.uid;
    try {
      if (db) {
        const snap = await db.collection("api_keys").where("userId", "==", uid).get();
        return res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      const files = await fs.readdir(STORE.keys);
      const keys = await Promise.all(files.map(async f => JSON.parse(await fs.readFile(path.join(STORE.keys, f), "utf-8"))));
      res.json(keys.filter(k => k.userId === uid || !uid));
    } catch (e) { res.status(500).json({ error: "Keys fetch failed." }); }
  });

  app.post("/api/keys", authenticate, async (req, res) => {
    const { name } = req.body;
    const user = (req as any).user;
    const uid = user?.uid || 'anonymous';
    const key = `rp_live_${crypto.randomBytes(16).toString('hex')}`;
    const payload = { key, name, userId: uid, createdAt: new Date().toISOString() };
    try {
      if (db) {
        const doc = await db.collection("api_keys").add(payload);
        res.json({ id: doc.id, ...payload });
      } else {
        const id = crypto.randomUUID();
        await atomicWrite(path.join(STORE.keys, `${id}.json`), { id, ...payload });
        res.json({ id, ...payload });
      }
    } catch (e) { res.status(500).json({ error: "Key generation failed." }); }
  });

  app.delete("/api/keys/:id", authenticate, async (req, res) => {
    try {
      if (db) await db.collection("api_keys").doc(req.params.id).delete();
      else await fs.unlink(path.join(STORE.keys, `${req.params.id}.json`));
      res.status(204).send();
    } catch (e) { res.status(500).json({ error: "Deletion failed." }); }
  });

  app.get("/api/repo/:id", authenticate, async (req, res) => {
    try {
      let data = null;
      if (db) {
        const doc = await db.collection("repositories").doc(req.params.id).get();
        data = doc.exists ? doc.data() : null;
      } else {
        const content = await fs.readFile(path.join(STORE.repos, `${req.params.id}.json`), "utf-8");
        data = JSON.parse(content);
      }
      if (!data) return res.status(404).json({ error: "Node not indexed." });
      res.json(data);
    } catch (e) { res.status(404).json({ error: "Not found." }); }
  });

  // --- NEW: AI Chat Endpoint (Fixed missing functionality) ---
  app.post("/api/repo/:id/chat", authenticate, async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Query required." });
    
    try {
      let data = null;
      if (db) {
        const doc = await db.collection("repositories").doc(req.params.id).get();
        data = doc.exists ? doc.data() : null;
      } else {
        const content = await fs.readFile(path.join(STORE.repos, `${req.params.id}.json`), "utf-8");
        data = JSON.parse(content);
      }
      
      if (!data) return res.status(404).json({ error: "Repository not found." });
      
      const answer = await chatWithCodebase(query, data.unified_content);
      res.json({ answer });
    } catch (e) {
      res.status(500).json({ error: "Chat reasoning failed." });
    }
  });

  // --- NEW: Random Identifier Plugin Endpoint ---
  app.post("/api/plugins/random-identifier", authenticate, async (req, res) => {
    const { seed, count } = req.body;
    if (!seed) return res.status(400).json({ error: "Seed string required." });
    
    try {
      const identifiers = generateRandomIdentifiers(seed, count || 5);
      res.json({ 
        success: true, 
        timestamp: new Date().toISOString(),
        identifiers 
      });
    } catch (e) {
      res.status(500).json({ error: "Plugin execution failed." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    app.use("*", async (req, res) => {
      try {
        let template = await fs.readFile(path.resolve("index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        
        // Dynamic SEO Injection for Dev
        const metaTitle = "Repodata AI | Dev Mode";
        const metaDesc = "High-fidelity repository ingestion protocol.";
        template = template
          .replace(/<title>.*?<\/title>/, `<title>${metaTitle}</title>`)
          .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${metaDesc}" />`);

        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        res.status(500).end(e.stack);
      }
    });
  } else {
    // Production static serving with aggressive caching for speed
    app.use(express.static("dist", { 
      maxAge: '30d',
      immutable: true,
      index: false
    }));
    
    app.get("*", async (req, res) => {
      try {
        let template = await fs.readFile(path.resolve("dist", "index.html"), "utf-8");
        
        // HIGH PERFORMANCE SEO INJECTION
        // This ensures crawlers see the right info immediately without running JS
        const isBuilder = req.path.startsWith('/builder');
        const title = isBuilder ? "Workbench | Repodata AI" : "Repodata AI | Repository Ingestion for Agents";
        const desc = isBuilder ? "Analyze your repository with AI." : "The simplest way to prepare GitHub repositories for AI analysis.";
        
        template = template
          .replace(/<title>.*?<\/title>/g, `<title>${title}</title>`)
          .replace(/<meta name="description" content=".*?" \/>/g, `<meta name="description" content="${desc}" />`);
          
        res.set({ "Content-Type": "text/html" }).send(template);
      } catch (e) {
        res.sendFile(path.resolve("dist", "index.html"));
      }
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 REPODATA PROTOCOL READY`);
    console.log(`🛰️  Endpoint: http://localhost:${PORT}`);
    console.log(`📁 Storage:  ${db ? 'Firebase Cloud' : 'Local Cluster (./data)'}\n`);
  });
}

start();
