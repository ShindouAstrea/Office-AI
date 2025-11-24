import { GoogleGenAI } from "@google/genai";
import { Bot } from "../types";

// Helper to safely access env vars
const getEnv = (key: string) => {
    if (import.meta && (import.meta as any).env) {
        return (import.meta as any).env[key];
    }
    return '';
};

const API_KEY = getEnv("VITE_GEMINI_API_KEY");
const ENABLE_AI = API_KEY && (getEnv("DEV") || getEnv("VITE_ENABLE_AI") === 'true');

let ai: GoogleGenAI | null = null;

if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
}

export const getGeminiResponse = async (message: string, bot: Bot, history: string[]): Promise<string> => {
  if (!ai || !ENABLE_AI) {
      return "Lo siento, mi cerebro de IA está desactivado en este momento.";
  }

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