import express from "express";
import "dotenv/config";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import fs from "fs/promises";
import path from "path";
import admin from "firebase-admin";
import crypto from "crypto";

import { ingestRepo, parseGitHubUrl } from "../server/services/githubService.js";
import { summarizeCodebase, chatWithCodebase } from "../server/services/geminiService.js";
import { generateRandomIdentifiers } from "../server/services/pluginService.js";

// --- Firebase Admin Initialization ---
let db: admin.firestore.Firestore | null = null;
let auth: admin.auth.Auth | null = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT && !admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
    auth = admin.auth();
  } catch (err) {
    console.warn("Firebase Init Failed. Running without cloud storage.");
  }
}

// --- Local Storage Fallback (for if Firestore is unavailable) ---
const LOCAL_DATA_DIR = "/tmp/repodata";
const STORE = {
  repos: path.join(LOCAL_DATA_DIR, "repositories"),
  keys: path.join(LOCAL_DATA_DIR, "api_keys"),
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

// --- Auth Middleware ---
const authenticate: express.RequestHandler = async (req, res, next) => {
  if (req.method === "OPTIONS") return next();
  const bearer = req.headers.authorization?.split(" ")[1];
  if (!bearer) return res.status(401).json({ error: "Login required." });

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

  if (auth) {
    try {
      const decoded = await auth.verifyIdToken(bearer);
      (req as any).user = decoded;
      return next();
    } catch (e) {}
  }

  res.status(403).json({ error: "Access Denied. Identity validation required." });
};

// --- Express App ---
const app = express();
bootstrap(); // non-blocking init

app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors({ origin: "*", methods: ["GET", "POST", "DELETE", "OPTIONS"] }));
app.use(express.json({ limit: "50mb" }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
app.use("/api/", limiter);

// --- Health Check ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "online", node: "vercel-serverless", ts: new Date().toISOString() });
});

// --- List Repos ---
app.get("/api/repos", authenticate, async (_req, res) => {
  try {
    if (db) {
      const snap = await db.collection("repositories").get();
      const repos = snap.docs.map((d) => ({ id: d.id, ...d.data().metadata }));
      return res.json(repos);
    }
    const files = await fs.readdir(STORE.repos);
    const repos = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          const data = JSON.parse(await fs.readFile(path.join(STORE.repos, f), "utf-8"));
          return { id: f.replace(".json", ""), ...data.metadata };
        })
    );
    res.json(repos);
  } catch (e) {
    res.status(500).json({ error: "Library list failed." });
  }
});

// --- Ingest Repo ---
app.post("/api/ingest", authenticate, async (req, res) => {
  const { url } = req.body;
  const parts = parseGitHubUrl(url);
  if (!parts) return res.status(400).json({ error: "Invalid GitHub URL." });
  const repoId = crypto.createHash("md5").update(`${parts.owner}/${parts.repo}`).digest("hex");
  const userGithubToken = req.headers["x-github-token"] as string | undefined;
  try {
    const ingestion = await ingestRepo(parts.owner, parts.repo, userGithubToken);
    const summary = await summarizeCodebase(ingestion.unifiedContent);
    const payload = {
      metadata: {
        name: ingestion.repoName,
        owner: parts.owner,
        files: ingestion.files.length,
        size: ingestion.unifiedContent.length,
        updatedAt: new Date().toISOString(),
      },
      perception_map: summary,
      unified_content: ingestion.unifiedContent,
    };
    if (db) await db.collection("repositories").doc(repoId).set(payload);
    else await atomicWrite(path.join(STORE.repos, `${repoId}.json`), payload);
    res.json({ id: repoId, ...payload });
  } catch (e: any) {
    res.status(500).json({ error: "Ingestion failed: " + e.message });
  }
});

// --- Get Repo ---
app.get("/api/repo/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    if (db) {
      const doc = await db.collection("repositories").doc(id).get();
      if (!doc.exists) return res.status(404).json({ error: "Not found." });
      return res.json({ id, ...doc.data() });
    }
    const data = JSON.parse(await fs.readFile(path.join(STORE.repos, `${id}.json`), "utf-8"));
    res.json({ id, ...data });
  } catch (e) {
    res.status(404).json({ error: "Repository not found." });
  }
});

// --- AI Chat ---
app.post("/api/repo/:id/chat", authenticate, async (req, res) => {
  const { id } = req.params;
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Query required." });
  try {
    let repoData: any;
    if (db) {
      const doc = await db.collection("repositories").doc(id).get();
      if (!doc.exists) return res.status(404).json({ error: "Repository not found." });
      repoData = doc.data();
    } else {
      repoData = JSON.parse(await fs.readFile(path.join(STORE.repos, `${id}.json`), "utf-8"));
    }
    const answer = await chatWithCodebase(repoData.unified_content, query);
    res.json({ answer });
  } catch (e: any) {
    res.status(500).json({ error: "AI Chat failed: " + e.message });
  }
});

// --- API Keys ---
app.get("/api/keys", authenticate, async (req, res) => {
  try {
    const uid = (req as any).user?.uid;
    if (db) {
      const q = uid
        ? await db.collection("api_keys").where("uid", "==", uid).get()
        : await db.collection("api_keys").get();
      return res.json(q.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    const files = await fs.readdir(STORE.keys);
    const keys = await Promise.all(
      files.filter((f) => f.endsWith(".json")).map(async (f) => JSON.parse(await fs.readFile(path.join(STORE.keys, f), "utf-8")))
    );
    res.json(keys);
  } catch (e) {
    res.status(500).json({ error: "Failed to list keys." });
  }
});

app.post("/api/keys", authenticate, async (req, res) => {
  const { name } = req.body;
  const uid = (req as any).user?.uid || "unknown";
  const newKey = {
    id: crypto.randomUUID(),
    key: `rp_live_${crypto.randomBytes(24).toString("hex")}`,
    name: name || "Untitled",
    uid,
    createdAt: new Date().toISOString(),
  };
  try {
    if (db) await db.collection("api_keys").doc(newKey.id).set(newKey);
    else await atomicWrite(path.join(STORE.keys, `${newKey.id}.json`), newKey);
    res.json(newKey);
  } catch (e) {
    res.status(500).json({ error: "Key creation failed." });
  }
});

app.delete("/api/keys/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    if (db) await db.collection("api_keys").doc(id).delete();
    else await fs.unlink(path.join(STORE.keys, `${id}.json`));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete key." });
  }
});

// --- Plugin: Random Identifier ---
app.post("/api/plugins/random-identifier", authenticate, async (req, res) => {
  const { seed, count } = req.body;
  if (!seed) return res.status(400).json({ error: "Seed string required." });
  try {
    const identifiers = generateRandomIdentifiers(seed, count || 5);
    res.json({ success: true, timestamp: new Date().toISOString(), identifiers });
  } catch (e) {
    res.status(500).json({ error: "Plugin execution failed." });
  }
});

// --- Export for Vercel ---
export default app;
