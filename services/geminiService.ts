import { GoogleGenAI } from "@google/genai";
import { Bot } from "../types";

const API_KEY = process.env.API_KEY || '';

// Initialize client securely. 
// Note: In a production frontend-only app, you'd proxy this. 
// For this demo, we assume the env var is injected safely.
let ai: GoogleGenAI | null = null;

if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
}

export const getGeminiResponse = async (message: string, bot: Bot, history: string[]): Promise<string> => {
  if (!ai) return "Error: API Key no configurada.";

  const systemPrompt = `
    You are ${bot.name}, working as a ${bot.role}.
    Your description: ${bot.description}.
    You are currently in a virtual office environment.
    Be helpful, professional, but brief (under 50 words).
    Current status: ${bot.status}.
    Respond in Spanish.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    return response.text || "Lo siento, estoy teniendo problemas para pensar ahora mismo.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Estoy un poco ocupado (Error de API).";
  }
};