// POST /api/ai/chat - なみ画伯チャット（テキスト＆画像生成）
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils';
import { getChatModel, getImageModel } from '@/lib/ai/client';
import { NAMI_CHARACTER_PROMPT } from '@/lib/ai/prompts/nami-character';
import { IMAGE_STYLE_PROMPT } from '@/lib/ai/prompts/image-style';

// 画像リクエスト検知用キーワード
const IMAGE_KEYWORDS = ['描いて', '書いて', '絵を', 'かいて', '画像', 'イラスト', '絵が見たい', '描け'];

function isImageRequest(message: string): boolean {
  return IMAGE_KEYWORDS.some((keyword) => message.includes(keyword));
}

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return errorResponse('メッセージがないぜ！', 'MISSING_MESSAGE', 400);
    }

    // 画像生成リクエスト判定
    if (isImageRequest(message)) {
      return handleImageRequest(message);
    }

    // 通常テキストチャット
    return handleTextChat(message, history);
  } catch (err) {
    console.error('チャットエラー:', err);
    return serverErrorResponse();
  }
}

// テキストチャット処理
async function handleTextChat(
  message: string,
  history: { role: string; content: string }[]
) {
  // チャット履歴をGemini形式に変換
  const geminiHistory = [
    {
      role: 'user' as const,
      parts: [{ text: NAMI_CHARACTER_PROMPT }],
    },
    {
      role: 'model' as const,
      parts: [{ text: 'おっ、来てくれたんだな！なみ画伯だぜ！何でも聞いてくれよな！' }],
    },
    ...history.map((msg) => ({
      role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
      parts: [{ text: msg.content }],
    })),
  ];

  const chat = getChatModel(geminiHistory);
  const result = await chat.sendMessage(message);
  const responseText = result.response.text();

  return successResponse({ message: responseText });
}

// 画像生成処理
async function handleImageRequest(message: string) {
  try {
    const model = getImageModel();

    // スタイルプロンプト + ユーザーのリクエストを組み合わせ
    const prompt = `${IMAGE_STYLE_PROMPT}

ユーザーのリクエスト: ${message}

上記のスタイルに従って画像を生成してください。また、なみ画伯として短いコメント（50文字以内）もつけてください。`;

    const result = await model.generateContent(prompt);
    const response = result.response;

    let responseText = '';
    let imageBase64 = '';

    // レスポンスからテキストと画像を抽出
    if (response.candidates && response.candidates[0]) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if (part.text) {
          responseText += part.text;
        }
        if (part.inlineData) {
          imageBase64 = part.inlineData.data;
        }
      }
    }

    if (!responseText) {
      responseText = 'どうだ！オレの最高傑作だぜ！';
    }

    return successResponse({
      message: responseText,
      imageBase64: imageBase64 || undefined,
    });
  } catch (err) {
    console.error('画像生成エラー:', err);
    // 画像生成失敗時はテキストのみで返す
    return successResponse({
      message: 'うーん、今は絵が描けないみたいだぜ...また後で試してくれよな！',
    });
  }
}
