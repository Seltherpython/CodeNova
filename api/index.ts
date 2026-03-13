import express from "express";
import "dotenv/config";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import fs from "fs/promises";
import path from "path";
import admin from "firebase-admin";
import crypto from "crypto";

import { ingestRepo, parseGitHubUrl } from "../server/services/githubService.js";
import { summarizeCodebase, chatWithCodebase, aiEditFile, USE_OLLAMA, OLLAMA_MODEL, GEMINI_MODEL } from "../server/services/geminiService.js";
import { generateRandomIdentifiers } from "../server/services/pluginService.js";

// --- Firebase Initialization ---
let db: admin.firestore.Firestore | null = null;
let auth: admin.auth.Auth | null = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT && !admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
    auth = admin.auth();
  } catch (err) {
    console.warn("Firebase Init Failed.");
  }
}

// --- Environment & State ---
const IS_DEPLOYED = true; 
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

const STORE = {
  repos: "/tmp/repositories",
  keys:  "/tmp/api_keys",
  files: "/tmp/context_files",
};

async function bootstrap() {
  await fs.mkdir(STORE.repos,  { recursive: true });
  await fs.mkdir(STORE.keys,   { recursive: true });
  await fs.mkdir(STORE.files,  { recursive: true });
}

// --- Middleware ---
const authenticate: express.RequestHandler = async (req, res, next) => {
  if (req.method === "OPTIONS") return next();
  const bearer = (req.headers.authorization || "").split(" ")[1];
  
  if (!bearer) {
    if (req.path.endsWith("/chat")) {
       (req as any).user = { uid: "public" };
       return next();
    }
    return res.status(401).json({ error: "Authorization required." });
  }

  if (bearer.startsWith("rp_live_")) {
    if (db) {
      const q = await db.collection("api_keys").where("key", "==", bearer).get();
      if (!q.empty) { (req as any).user = { uid: q.docs[0].data().userId, isApiKey: true }; return next(); }
    }
    return res.status(403).json({ error: "Invalid API key." });
  }

  if (auth) {
    try {
      const decoded = await auth.verifyIdToken(bearer);
      (req as any).user = decoded;
      return next();
    } catch (e) {}
  }
  res.status(403).json({ error: "Access denied." });
};

const app = express();
app.use(compression());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }));
app.use(express.json({ limit: "10mb" }));

const sanitizeString = (str: string) => str.replace(/<{1}[^<>]{0,}>{1}/g, "").trim();
const sanitize: express.RequestHandler = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    for (const k in req.body) if (typeof req.body[k] === "string") req.body[k] = sanitizeString(req.body[k]);
  }
  if (req.query && typeof req.query === "object") {
    for (const k in req.query as any) if (typeof req.query[k] === "string") (req.query as any)[k] = sanitizeString(req.query[k] as string);
  }
  next();
};

const v1 = express.Router();
v1.use(sanitize);

// --- Handlers ---
v1.get("/health", async (_req, res) => {
  await syncPromoState();
  res.json({ status: "active", version: "1.0.0-beta", serverless: true, promoExhausted: promoUses <= 0 });
});

v1.post("/promo", authenticate, async (req, res) => {
  const { code } = req.body;
  if (code === "PRO-HOSTED-3X") {
    await syncPromoState();
    if (promoUses > 0) {
      const uid = (req as any).user?.uid;
      if (uid && !unlockedUsers.has(uid)) {
        promoUses--;
        unlockedUsers.add(uid);
        await updatePromoState();
        return res.json({ success: true, message: "Code accepted!" });
      } else if (uid && unlockedUsers.has(uid)) {
        return res.json({ success: true, message: "Already unlocked." });
      }
    }
    return res.status(400).json({ error: "Exhausted." });
  }
  return res.status(400).json({ error: "Invalid code." });
});

v1.get("/repos", authenticate, async (req, res) => {
  if (db) {
    const snap = await db.collection("repositories").get();
    return res.json(snap.docs.map(d => ({ id: d.id, ...d.data().metadata })));
  }
  res.json([]);
});

v1.post("/ingest", authenticate, async (req, res) => {
  const { url } = req.body;
  const parts = parseGitHubUrl(url);
  if (!parts) return res.status(400).json({ error: "Invalid URL." });
  const repoId = crypto.createHash("md5").update(`${parts.owner}/${parts.repo}`).digest("hex");
  try {
    const ingestion = await ingestRepo(parts.owner, parts.repo, req.headers["x-github-token"] as string);
    const summary = await summarizeCodebase(ingestion.unifiedContent);
    const payload = {
      metadata: { name: ingestion.repoName, owner: parts.owner, repo: parts.repo, files: ingestion.files.length, size: ingestion.unifiedContent.length, updatedAt: new Date().toISOString() },
      perception_map: summary,
      unified_content: ingestion.unifiedContent
    };
    if (db) await db.collection("repositories").doc(repoId).set(payload);
    res.json({ id: repoId, ...payload });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

v1.get("/repo/:id", authenticate, async (req, res) => {
  if (db) {
    const doc = await db.collection("repositories").doc(req.params.id).get();
    if (doc.exists) return res.json(doc.data());
  }
  res.status(404).json({ error: "Not found." });
});

v1.post("/repo/:id/chat", authenticate, async (req, res) => {
  const user = (req as any).user;
  if (user?.isApiKey && !unlockedUsers.has(user?.uid)) {
     return res.status(403).json({ error: "Agent API access restricted." });
  }
  const { query, history } = req.body;
  if (db) {
    const doc = await db.collection("repositories").doc(req.params.id).get();
    if (doc.exists) {
      const data = doc.data() as any;
      const answer = await chatWithCodebase(query, data.unified_content, history || []);
      return res.json({ answer });
    }
  }
  res.status(404).json({ error: "Not found." });
});

app.use("/v1", v1);
app.use("/", v1);

export default app;
