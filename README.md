# Repo Trace

Repo Trace is a professional, high-fidelity GitHub repository analysis engine. It turns complex source code into AI-friendly context maps.

## 🚀 Deployment Options

### 1. Cloud Deployment (Vercel)
Repo Trace is optimized for Vercel Serverless.
- **Direct Deploy:** Click the Vercel deploy button or run `vercel --prod`.
- **Environment Variables:**
  - `GEMINI_API_KEY`: Required for AI analysis.
  - `FIREBASE_SERVICE_ACCOUNT`: (Optional) For persistent global storage. If missing, it will use local mode.
  - `DISABLE_RATE_LIMIT`: Set to `true` to disable 1000/day request limits.

### 2. Self-Hosted / Local Development
You can run Repo Trace on your own machine without any cloud dependencies.
```bash
# Install dependencies
npm install

# Start in development mode
npm run dev
```
In local mode, the system automatically:
- Uses **Device Authentication** (via localStorage).
- Saves all data to the `./data` directory on your machine.
- Unlocks all premium features (unlimited AI actions).

## 🛠️ API Access
Repo Trace provides a standard REST API:
- `GET /api/repos`: List repositories.
- `GET /api/repo/:id/context.txt`: Fetch the AI-optimized LLM context.
- `POST /api/repo/:id/chat`: Deep reasoning chat with the codebase.

## 💎 Features
- **High-Fidelity Context:** Maps your entire repo into a single, structured file.
- **On-Device Data:** Keep your code local with non-cloud storage options.
- **Agent Integration:** Compatible with Claude Code, Cursor, and custom agents.

---
© 2026 Repo Trace · Open Source · Professional Grade
