// POST /api/ai/chat - なみ画伯チャット（テキスト＆画像生成＆学習機能＆天気対応）
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils';
import { getChatModel, getImageModel } from '@/lib/ai/client';
import { NAMI_CHARACTER_PROMPT } from '@/lib/ai/prompts/nami-character';
import { IMAGE_STYLE_PROMPT } from '@/lib/ai/prompts/image-style';

// 画像リクエスト検知用キーワード
const IMAGE_KEYWORDS = ['描いて', '書いて', '絵を', 'かいて', '画像', 'イラスト', '絵が見たい', '描け'];

// 天気・位置情報関連キーワード
const WEATHER_KEYWORDS = [
  '天気', 'てんき', '気温', 'きおん', '温度', '湿度',
  '暑い', 'あつい', '寒い', 'さむい', '雨', '晴れ', '曇り', '雪',
  'ランチ', 'らんち', 'ごはん', 'お昼', 'おひる', 'レストラン',
  '食べ', 'たべ', '近く', 'ちかく', 'おすすめ', '散歩', 'さんぽ',
  '出かけ', 'でかけ', 'お出かけ', '外', 'そと',
];

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

function isWeatherRelated(message: string): boolean {
  return WEATHER_KEYWORDS.some((keyword) => message.includes(keyword));
}

// 天気情報を内部で取得（5秒タイムアウト付き）
async function fetchWeather(lat: number, lon: number): Promise<{
  city: string; weather: string; description: string;
  temp: number; feelsLike: number; humidity: number;
} | null> {
  try {
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    if (!apiKey) return null;

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&lang=ja&units=metric`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error('天気API HTTPエラー:', res.status);
      return null;
    }

    const data = await res.json();
    return {
      city: data.name || '不明',
      weather: data.weather?.[0]?.main || '',
      description: data.weather?.[0]?.description || '',
      temp: Math.round(data.main?.temp ?? 0),
      feelsLike: Math.round(data.main?.feels_like ?? 0),
      humidity: data.main?.humidity ?? 0,
    };
  } catch (err) {
    console.error('天気取得エラー:', err);
    return null;
  }
}

// AI応答から[MEMORY: xxx]形式の学習情報を抽出
function extractAiMemories(responseText: string): { cleanText: string; memories: string[] } {
  const memories: string[] = [];
  const cleanText = responseText.replace(/\[MEMORY:\s*(.+?)\]/g, (_, content) => {
    memories.push(content.trim());
    return '';
  }).trim();
  return { cleanText, memories };
}

export async function POST(request: NextRequest) {
  try {
    const {
      message, history = [], userMemory = '', userProfile = {},
      location,
    } = await request.json();

    if (!message || typeof message !== 'string') {
      return errorResponse('メッセージがないぜ！', 'MISSING_MESSAGE', 400);
    }

    // 学習すべき情報を抽出（regex）
    const newMemory = extractMemory(message);

    // 画像生成リクエスト判定
    if (isImageRequest(message)) {
      const result = await handleImageRequest(message);
      const body = await result.json();
      if (newMemory) {
        body.data = { ...body.data, newMemory };
      }
      return new Response(JSON.stringify(body), {
        status: result.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 天気情報を取得（天気関連のキーワードがあり、位置情報がある場合）
    let weatherInfo: string | null = null;
    if (isWeatherRelated(message) && location?.lat && location?.lon) {
      const weather = await fetchWeather(location.lat, location.lon);
      if (weather) {
        weatherInfo = `【現在の天気情報】場所: ${weather.city} / 天気: ${weather.description} / 気温: ${weather.temp}°C（体感${weather.feelsLike}°C） / 湿度: ${weather.humidity}%`;
      }
    }

    // 通常テキストチャット（メモリ・天気付き）
    return handleTextChat(message, history, userMemory, newMemory, userProfile, weatherInfo, location);
  } catch (err) {
    console.error('チャットエラー:', err);
    return serverErrorResponse();
  }
}

// 今日が誕生日かどうか判定
function isBirthdayToday(birthday: string): boolean {
  if (!birthday) return false;
  const today = new Date();
  const [, month, day] = birthday.split('-').map(Number);
  return today.getMonth() + 1 === month && today.getDate() === day;
}

// テキストチャット処理
async function handleTextChat(
  message: string,
  history: { role: string; content: string }[],
  userMemory: string,
  newMemory: string | null,
  userProfile: { nickname?: string; birthday?: string },
  weatherInfo: string | null,
  location: { lat: number; lon: number } | null,
) {
  let systemPrompt = NAMI_CHARACTER_PROMPT;

  // プロフィール情報
  const profileParts: string[] = [];
  if (userProfile.nickname) {
    profileParts.push(`ニックネーム: ${userProfile.nickname}`);
  }
  if (userProfile.birthday) {
    profileParts.push(`誕生日: ${userProfile.birthday}`);
    if (isBirthdayToday(userProfile.birthday)) {
      profileParts.push('※今日はこのユーザーの誕生日です！会話の中で自然にお祝いしてあげてください。');
    }
  }
  if (profileParts.length > 0) {
    systemPrompt += `\n\n【このユーザーのプロフィール】\n${profileParts.join('\n')}\nニックネームがあれば名前で呼びかけてください。`;
  }

  // 学習メモリ
  if (userMemory) {
    systemPrompt += `\n\n【このユーザーについて覚えていること】\n${userMemory}\nこれらの情報を自然に会話に活かしてください。`;
  }

  // 天気情報
  if (weatherInfo) {
    systemPrompt += `\n\n${weatherInfo}\nこの天気情報を参考に、なみ画伯らしく答えてあげてください。`;
  }

  // 位置情報あり（天気キーワードなしでも場所がわかっていることを伝える）
  if (location && !weatherInfo) {
    systemPrompt += `\n\n【ユーザーの位置情報あり】ユーザーはGPS位置情報を共有しています。場所に関する質問があれば天気や地域の情報を考慮して回答できます。`;
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

  let rawResponse = '';
  try {
    const result = await chat.sendMessage(message);
    rawResponse = result.response.text();
  } catch (aiErr) {
    console.error('Gemini API エラー:', aiErr);
    rawResponse = '';
  }

  // AI応答から[MEMORY: xxx]を抽出
  const { cleanText: responseText, memories: aiMemories } = extractAiMemories(rawResponse);

  // 空応答へのフォールバック
  const finalMessage = responseText || 'おっと、ちょっと考えすぎちまったぜ...もう一回聞いてくれよな！';

  // regex記憶 + AI抽出記憶を統合
  const allNewMemories: string[] = [];
  if (newMemory) allNewMemories.push(newMemory);
  allNewMemories.push(...aiMemories);

  return successResponse({
    message: finalMessage,
    newMemory: allNewMemories.length > 0 ? allNewMemories.join(' / ') : undefined,
  });
}

// 画像生成処理
async function handleImageRequest(message: string) {
  try {
    const model = getImageModel();

    const prompt = `${IMAGE_STYLE_PROMPT}

ユーザーのリクエスト: ${message}

上記のスタイルに従って画像を生成してください。また、なみ画伯として短いコメント（50文字以内）もつけてください。`;

    const result = await model.generateContent(prompt);
    const response = result.response;

    let responseText = '';
    let imageBase64 = '';

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
