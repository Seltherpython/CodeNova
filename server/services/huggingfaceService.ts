import { pipeline, env } from "@xenova/transformers";
import path from "path";
import fs from "fs";

// Configure cache to be inside the project folder as requested.
// This ensures the ~40MB quantized t5-small model downloads directly here.
const modelDir = path.resolve('./models');
if (!fs.existsSync(modelDir)) {
  fs.mkdirSync(modelDir, { recursive: true });
}
env.cacheDir = modelDir;

let summarizer: any = null;

export async function compressRepoContent(fullContent: string): Promise<string> {
  if (!summarizer) {
    console.log("🤖 Loading Xenova/t5-small (Quantized, ~40MB) to locally compress codebase...");
    summarizer = await pipeline('summarization', 'Xenova/t5-small', {
      quantized: true,
    });
  }

  // If content is already under Gemini's limits, return as is.
  if (fullContent.length <= 80000) {
    return fullContent;
  }

  console.log(`🗜️ Compressing massive codebase (${fullContent.length} chars) with local HF model...`);
  
  // Cut into chunks. T5 has an ~512 token context window, so ~2000 chars is safe.
  const chunkSize = 2000;
  let compressedBlocks = [];

  for (let i = 0; i < fullContent.length; i += chunkSize) {
    // Cap iterations to avoid taking longer than 60 seconds on standard CPUs
    if (compressedBlocks.length >= 30) {
      compressedBlocks.push("\n...[REMAINDER OMITTED DUE TO EXTREME REPO SIZE]...");
      break; 
    }

    const chunk = fullContent.substring(i, i + chunkSize);
    try {
      const res = await summarizer(`summarize: ${chunk}`, {
        max_new_tokens: 150,
        min_new_tokens: 10
      });
      if (res && res.length > 0) {
        compressedBlocks.push(res[0].summary_text);
      }
    } catch (e: any) {
      console.warn("Chunk skipped due to inference error:", e.message);
      compressedBlocks.push(chunk.substring(0, 500) + "..."); // Fallback truncation
    }
  }

  return compressedBlocks.join("\n\n");
}
