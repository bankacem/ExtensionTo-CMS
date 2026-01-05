
import { GoogleGenAI, Type } from "@google/genai";

export const generateDraft = async (title: string) => {
  // Vite سيقوم باستبدال process.env.API_KEY بالقيمة الحقيقية أثناء البناء
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please check your environment variables.");
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
