// Geminiクライアント初期化（仕様書 7.4準拠）
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const getModel = (modelName = 'gemini-2.0-flash') => {
  return genAI.getGenerativeModel({ model: modelName });
};

export const getChatModel = () => {
  return getModel().startChat({
    history: [],
    generationConfig: { maxOutputTokens: 1000, temperature: 0.8 },
  });
};
