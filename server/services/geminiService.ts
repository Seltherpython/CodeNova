import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function summarizeCodebase(unifiedContent: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = `
    You are an expert software architect. Below is a unified codebase from a repository.
    Your task is to provide a highly detailed, professional analysis:
    1. **Core Purpose**: Deeply explain the business and technical purpose of this project.
    2. **Architecture Overview**: Identify the architectural pattern (MVC, Hexagonal, Layered, etc.).
    3. **Tech Stack Audit**: Exhaustive list of languages, frameworks, and critical dependencies.
    4. **Perception Map**:
       - **Logic Hubs**: Where the primary business logic resides.
       - **Data Flow**: How information moves through the system.
       - **Boundary Points**: APIs, Webhooks, or UI entry points.
    5. **Agent Guide**: Specific instructions for an AI agent on how to navigate and modify this codebase without breaking patterns.
    6. **Security Posture**: Identify search strings or patterns related to authentication and data protection.
    
    Format the output in clean, high-fidelity Markdown with professional headers and bullet points.
    
    CODEBASE:
    ${unifiedContent.substring(0, 45000)}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Summarization Error:", error);
    return "Failed to summarize codebase.";
  }
}

export async function chatWithCodebase(query: string, context: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = `
    You are an AI assistant specialized in code analysis. 
    Use the following codebase context to answer the user's question.
    
    CONTEXT:
    ${context.substring(0, 50000)}
    
    USER QUESTION:
    ${query}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Error generating response.";
  }
}
