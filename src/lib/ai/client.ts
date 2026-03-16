// Geminiクライアント初期化
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// テキスト生成用モデル
export const getModel = (modelName = 'gemini-2.0-flash') => {
  return genAI.getGenerativeModel({ model: modelName });
};

// チャット用モデル（gemini-3-pro）
export const getChatModel = (history: { role: string; parts: { text: string }[] }[] = []) => {
  return genAI.getGenerativeModel({ model: 'gemini-3-pro' }).startChat({
    history,
    generationConfig: { maxOutputTokens: 1000, temperature: 0.8 },
  });
};

// 画像生成用モデル（gemini-3-pro-image-preview）
export const getImageModel = () => {
  return genAI.getGenerativeModel({
    model: 'gemini-3-pro-image-preview',
    generationConfig: {
      // @ts-expect-error - responseModalities is supported but not in types yet
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });
};
