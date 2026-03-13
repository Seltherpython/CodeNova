import { GoogleGenerativeAI } from "@google/generative-ai";
import { compressRepoContent } from "./huggingfaceService";

// ─── Environment ────────────────────────────────────────────────────────────
export const USE_OLLAMA = process.env.USE_OLLAMA === "true";
export const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3"; // Defaulting to llama3

// User specifically asked for Gemini 3.1 Flash Lite Preview
export const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

interface GenerationOptions {
  ollamaModel?: string;
  customGeminiKey?: string;
  customGeminiModel?: string;
}

// ─── Gemini helper ──────────────────────────────────────────────────────────
async function geminiGenerate(prompt: string, opts?: GenerationOptions): Promise<string> {
  const keyToUse = opts?.customGeminiKey || GEMINI_KEY;
  if (!keyToUse) throw new Error("No GEMINI_API_KEY set.");
  const genAI = new GoogleGenerativeAI(keyToUse);
  const model = genAI.getGenerativeModel({
    model: opts?.customGeminiModel || GEMINI_MODEL,
    systemInstruction: "You are Nova, an elite senior software architect and deeply analytical AI engineering assistant. Your core mission is to analyze codebases to identify bugs, surface architectural inefficiencies, and proactively suggest functionality improvements. You are concise, brutally precise, and heavily prioritize technical accuracy, security, and scalability. Provide expert-level insights and actionable, production-ready code solutions."
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ─── Ollama helper ──────────────────────────────────────────────────────────
async function ollamaGenerate(prompt: string, opts?: GenerationOptions): Promise<string> {
  const model = opts?.ollamaModel || OLLAMA_MODEL;
  const endpoint = `${OLLAMA_HOST}/api/generate`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      body: JSON.stringify({ model, prompt, stream: false }),
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`);
    const data = await res.json();
    return data.response;
  } catch (err: any) {
    throw new Error(`Failed to reach Ollama at ${OLLAMA_HOST}. Is it running? Error: ${err.message}`);
  }
}

// ─── Unified dispatcher ──────────────────────────────────────────────────────
async function generate(prompt: string, opts?: GenerationOptions): Promise<string> {
  if (USE_OLLAMA || opts?.ollamaModel) {
    return ollamaGenerate(prompt, opts);
  }
  return geminiGenerate(prompt, opts);
}

// ─── Summarize codebase ──────────────────────────────────────────────────────
export async function summarizeCodebase(unifiedContent: string, opts?: GenerationOptions): Promise<string> {
  const contentToAnalyze = await compressRepoContent(unifiedContent);

  const prompt = `Nova, execute a deep architectural analysis of the provided codebase.

Your objective is to thoroughly audit the project and output a highly structured, technical summary that a senior engineering team can utilize. 

Provide your analysis in the following strict markdown format:
1. **System Architecture** – High-level structural overview and entry points.
2. **Core Functionality** – Precise breakdown of what the application does and its main business logic.
3. **Tech Stack & Tooling** – Technologies, frameworks, and infrastructure used.
4. **Data Flow & State** – How data is managed, passed, and stored.
5. **Critical Functions** – Identify the most critical files/functions and what they handle.
6. **Vulnerabilities & Bottlenecks** – Highlight potential performance issues, technical debt, or structural flaws.
7. **Actionable Improvements** – Give 3-5 high-impact suggestions to improve the functionality, scalability, or DX of this site.

Be highly technical and succinct. Do not use filler words.

REPOSITORY RAW CONTENT:
${contentToAnalyze}`;

  try {
    return await generate(prompt, opts);
  } catch (err: any) {
    console.error("Summarize error:", err);
    return `## Summary Unavailable\nThe AI backend returned an error: **${err.message || 'Unknown error'}**\n\nEnsure your AI backend (Gemini or Ollama) is correctly configured.`;
  }
}

// ─── Chat with codebase ──────────────────────────────────────────────────────
export async function chatWithCodebase(
  query: string,
  context: string,
  history: { role: string; content: string }[] = [],
  opts?: GenerationOptions
): Promise<string> {
  const historyText = history.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");

  const prompt = `User's Question: ${query}

PROJECT INFO (EXTENDED CONTEXT):
${context.substring(0, 150000)}

${historyText ? `RECENT CHAT HISTORY:\n${historyText}\n` : ""}

Nova's Operational Guidelines:
- Answer directly and with high technical precision.
- Focus exclusively on structural integrity, functionality improvement, and resolving the query.
- Proactively identify hidden consequences or edge cases related to the user's question.
- Always provide fully typed, production-ready code examples formatted with triple backticks.
- If context is missing, clearly state the assumptions made.`;

  try {
    return await generate(prompt, opts);
  } catch (err: any) {
    console.error("Chat error:", err);
    throw new Error(`Nova's reasoning failed: ${err.message}`);
  }
}

// ─── Edit context file via AI ────────────────────────────────────────────────
export async function aiEditFile(
  currentContent: string,
  instruction: string,
  opts?: GenerationOptions
): Promise<string> {
  const prompt = `Instruction: ${instruction}

CURRENT FILE TO MODIFY:
${currentContent.substring(0, 100000)}

Note: Apply the instruction and return the COMPLETE updated file contents ONLY. No commentary, no markdown fences.`;

  try {
    return await generate(prompt, opts);
  } catch (err: any) {
    console.error("AI edit error:", err);
    throw new Error(`Nova's file edit failed: ${err.message}`);
  }
}
