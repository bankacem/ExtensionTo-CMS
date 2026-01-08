import { GoogleGenAI, Type } from "@google/genai";

// Use process.env.API_KEY directly as per guidelines
export const generateDraft = async (title: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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

export const analyzeSEO = async (title: string, content: string, excerpt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analyze the SEO quality of this blog post.
    Title: ${title}
    Excerpt: ${excerpt}
    Content: ${content.substring(0, 1000)}...
    
    Provide a score out of 100 and a list of 3-5 specific suggestions for improvement.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "SEO score from 0 to 100." },
          suggestions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Actionable improvement suggestions."
          }
        },
        required: ["score", "suggestions"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("SEO analysis failed");
  return JSON.parse(text);
};

export const optimizeRobotsTxt = async (description: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Generate an optimized robots.txt for a browser extension directory website with these features: ${description}. Ensure standard rules for crawling and a link to sitemap.xml.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });

  return response.text;
};