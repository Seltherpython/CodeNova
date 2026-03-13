# CodeNova (formerly Repodata AI)

CodeNova is an advanced, blazing-fast repository analysis tool that converts complex, messy GitHub codebases into an optimized format that AI agents (like Claude Code, Cursor, and ChatGPT) can instantly digest.

## Overview

CodeNova simplifies GitHub repositories into "Project Maps"—highly compressed, unified text contexts perfect for feeding into Large Language Models (LLMs) without breaking their context windows. It natively ships with an elite AI Assistant ("Nova") focused exclusively on deep architectural software engineering.

---

## 🚀 Quickstart: Local Development

To run the full stack (Frontend & Local API Backend) natively on your machine:

**1. Clone the repository**
```bash
git clone https://github.com/Seltherpython/CodeNova.git
cd CodeNova
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**
Create a `.env` in the root and add the following:
```env
GEMINI_API_KEY="your-gemini-key-here"
# Optional: Ollama integration
USE_OLLAMA="false"
OLLAMA_HOST="http://localhost:11434"
OLLAMA_MODEL="llama3"
```

**4. Start the Local Server & App**
```bash
npm run dev
```
The client will normally launch at `http://localhost:5173`. 
*Note: In local mode, rate limits are bypassed and all external agent features are un-restricted.*

---

## 🌐 Deploying to Vercel (Serverless Cloud)

CodeNova is built specifically with a frontend-heavy Vite/React structure that maps perfectly to serverless deployments like Vercel.

**1. Vercel Configuration**
A `vercel.json` routing configuration is already included to smoothly route all `/api/*` traffic to the Express backend (`api/index.ts`). 

**2. Deploy via CLI**
```bash
npm i -g vercel
vercel
```
Ensure you provide your exact `.env` credentials in the Vercel dashboard Settings -> Environment Variables.

**3. Publish to Production**
```bash
vercel --prod
```

## 🔌 Using the Agent API

CodeNova acts as a dedicated context-engine for your external apps and terminal AI. 

### 1. Generating Keys
Navigate to your **API Keys** tab in the console and create a new key.

### 2. Fetching Raw Compressed Context (Public)
Retrieve the massive, AI-optimized `.txt` file representing an ingested codebase without auth requirements.
```bash
GET https://codenova.vercel.app/api/repo/:repo_id/context.txt
```

### 3. Fetching Structured JSON Data (Live Format)
```bash
GET https://codenova.vercel.app/api/repo/:repo_id/context.json
```

### 4. Querying the Expert Architecture Engine
Pass custom API configurations to hit your own models utilizing the codebase as context.
```bash
curl -X POST https://codenova.vercel.app/api/repo/:repo_id/chat \
  -H "Authorization: Bearer rp_live_abc123..." \
  -H "X-Gemini-Key: your_custom_key" \
  -H "Content-Type: application/json" \
  -d '{"query": "Refactor the auth middleware.", "history": []}'
```

*Note: You must use the `PRO-HOSTED-3X` promo code in your Account Settings to unlock the API privileges directly from the deployed cloud version to prevent server exhaustion.*

## License
MIT License. Free and open source software.
