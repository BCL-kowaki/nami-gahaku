// POST /api/ai/chat - なみ画伯チャット（テキスト＆画像生成＆学習機能）
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils';
import { getChatModel, getImageModel } from '@/lib/ai/client';
import { NAMI_CHARACTER_PROMPT } from '@/lib/ai/prompts/nami-character';
import { IMAGE_STYLE_PROMPT } from '@/lib/ai/prompts/image-style';

// 画像リクエスト検知用キーワード
const IMAGE_KEYWORDS = ['描いて', '書いて', '絵を', 'かいて', '画像', 'イラスト', '絵が見たい', '描け'];

// 学習すべき情報を検知するキーワード
const MEMORY_PATTERNS = [
  /(?:わたし|ぼく|おれ|あたし|私|僕|俺)(?:は|の)(?:名前|なまえ)(?:は|が)(.+?)(?:です|だよ|だぜ|。|！|$)/,
  /(?:わたし|ぼく|おれ|あたし|私|僕|俺)(?:は|の)(.+?)(?:が好き|がすき|が大好き|がだいすき)/,
  /(?:わたし|ぼく|おれ|あたし|私|僕|俺)(?:は)(.+?)(?:歳|さい)/,
  /(?:好きな|すきな)(.+?)(?:は)(.+?)(?:です|だよ|だぜ|。|！|$)/,
  /(.+?)(?:って呼んで|ってよんで|と呼んで|とよんで)/,
];

function extractMemory(message: string): string | null {
  for (const pattern of MEMORY_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      return message.trim();
    }
  }
  return null;
}

function isImageRequest(message: string): boolean {
  return IMAGE_KEYWORDS.some((keyword) => message.includes(keyword));
}

export async function POST(request: NextRequest) {
  try {
    const { message, history = [], userMemory = '' } = await request.json();

    if (!message || typeof message !== 'string') {
      return errorResponse('メッセージがないぜ！', 'MISSING_MESSAGE', 400);
    }

    // 学習すべき情報を抽出
    const newMemory = extractMemory(message);

    // 画像生成リクエスト判定
    if (isImageRequest(message)) {
      const result = await handleImageRequest(message);
      // 学習情報があれば追加して返す
      const body = await result.json();
      if (newMemory) {
        body.data = { ...body.data, newMemory };
      }
      return new Response(JSON.stringify(body), {
        status: result.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 通常テキストチャット（メモリ付き）
    return handleTextChat(message, history, userMemory, newMemory);
  } catch (err) {
    console.error('チャットエラー:', err);
    return serverErrorResponse();
  }
}

// テキストチャット処理
async function handleTextChat(
  message: string,
  history: { role: string; content: string }[],
  userMemory: string,
  newMemory: string | null
) {
  // ユーザー学習情報をプロンプトに追加
  let systemPrompt = NAMI_CHARACTER_PROMPT;
  if (userMemory) {
    systemPrompt += `\n\n【このユーザーについて覚えていること】\n${userMemory}\nこれらの情報を自然に会話に活かしてください。`;
  }

  // チャット履歴をGemini形式に変換
  const geminiHistory = [
    {
      role: 'user' as const,
      parts: [{ text: systemPrompt }],
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

  return successResponse({
    message: responseText,
    newMemory: newMemory || undefined,
  });
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
    return successResponse({
      message: 'うーん、今は絵が描けないみたいだぜ...また後で試してくれよな！',
    });
  }
}
