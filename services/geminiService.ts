
import { GoogleGenAI, Type } from "@google/genai";

export const generateDraft = async (title: string) => {
  // Use the process.env.API_KEY directly when initializing the GoogleGenAI client as per guidelines.
  // Assume process.env.API_KEY is pre-configured and accessible.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
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

  // Extract text from the response using the .text property (not a method).
  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  return JSON.parse(text);
};
