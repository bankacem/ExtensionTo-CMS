
import { GoogleGenAI, Type } from "@google/genai";

export const generateDraft = async (title: string) => {
  // Use Vite's import.meta.env for client-side environment variables
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY is not set. Please add it to your .env file.");
    throw new Error("Missing API Key");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Write a professional blog post about "${title}" for a browser extensions hub.
    Requirements:
    - HTML format (h2, p, ul, li)
    - SEO excerpt (150 chars max)
    - 3 key sections
    - Return a valid JSON object.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING, description: "The HTML content of the post." },
          excerpt: { type: Type.STRING, description: "A short SEO summary." },
          category: { type: Type.STRING, description: "Suggested category." },
          tags: { type: Type.STRING, description: "Comma separated tags." }
        },
        required: ["content", "excerpt", "category", "tags"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  return JSON.parse(text);
};
