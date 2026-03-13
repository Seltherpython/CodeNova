import { GoogleGenerativeAI } from "@google/generative-ai";


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
    systemInstruction: "You are the Repo Trace AI, an elite structural analysis agent. Your mission is to decode complex codebases into human-readable project maps and provide surgical-grade architectural advice. You are concise, precise, and prioritize security and scalability. Always output production-ready code blocks and favor technical depth over filler."
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

// ... (summarizeCodebase excerpt)
export async function summarizeCodebase(unifiedContent: string, opts?: GenerationOptions): Promise<string> {
  const contentToAnalyze = unifiedContent;

  const prompt = `Repo Trace Protocol Execution: Structural Perception.
Decode this codebase into a high-fidelity summary for a senior engineering team. 

Format:
1. **System Architecture**
2. **Core Functionality**
3. **Stack & Infrastructure**
4. **Data Management**
5. **Critical Components**
6. **Vulnerabilities/Debt**
7. **Trace Recommendations** (3-5 high-impact suggestions)

Be technical and direct.

REPOSITORY CONTENT:
${contentToAnalyze}`;

  try {
    return await generate(prompt, opts);
  } catch (err: any) {
    console.error("Summarize error:", err);
    return `## Structural Protocol Failed\nError: **${err.message || 'Unknown error'}**`;
  }
}

// ... (chatWithCodebase excerpt)
export async function chatWithCodebase(
  query: string,
  context: string,
  history: { role: string; content: string }[] = [],
  opts?: GenerationOptions
): Promise<string> {
  const historyText = history.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");

  const prompt = `Analysis Request: ${query}

CONTEXT ACCESS:
${context.substring(0, 150000)}

${historyText ? `PROTOCOL HISTORY:\n${historyText}\n` : ""}

Operational Directive:
- Provide high-precision codebase-specific answers.
- Use the provided context to identify nuances and edge cases.
- Format all code with triple backticks and TypeScript types where applicable.
- Represent the Repo Trace Protocol identity.`;

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
