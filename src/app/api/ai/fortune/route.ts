// POST /api/ai/fortune - 今日の占い（干支対応）
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils';
import { getModel } from '@/lib/ai/client';
import { FORTUNE_TEMPLATE } from '@/lib/ai/prompts/fortune-template';
import { getEtoFromBirthday } from '@/lib/zodiac';

export async function POST(request: NextRequest) {
  try {
    const { birthday } = await request.json();

    if (!birthday) {
      return errorResponse('誕生日が設定されていないぜ！', 'MISSING_BIRTHDAY', 400);
    }

    // 今日の日付
    const today = new Date();
    const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

    // 干支を判定
    const eto = getEtoFromBirthday(birthday);
    const etoStr = eto ? `${eto.emoji} ${eto.name}どし（${eto.kanji}年・${eto.animal}）` : '不明';

    // 誕生日＋干支情報をプロンプトに追加
    const prompt = `${FORTUNE_TEMPLATE}

ユーザー情報:
- 誕生日: ${birthday}
- 干支（えと）: ${etoStr}
- 占い日: ${todayStr}

干支の特徴も踏まえた占い結果を出してください。
干支の動物に絡めたアドバイスや例えを入れると面白いです。

上記の出力形式に従って、今日の占い結果をJSON形式で返してください:
{
  "overall": "★の数（例: ★★★★）",
  "luckyColor": "色",
  "luckyItem": "アイテム",
  "message": "なみ画伯のひとこと（干支に触れつつ200文字以内）"
}

JSONだけを返してください。`;

    const model = getModel('gemini-2.5-pro');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // JSONパース（コードブロック除去）
    const jsonStr = responseText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    let fortuneData;
    try {
      fortuneData = JSON.parse(jsonStr);
    } catch {
      // JSONパース失敗時はテキストそのまま返す
      fortuneData = {
        overall: '★★★',
        luckyColor: 'きいろ',
        luckyItem: 'えんぴつ',
        message: responseText.slice(0, 200),
      };
    }

    // テキストを組み立て（干支情報も表示）
    const fortuneText = [
      eto ? `${eto.emoji} あなたの干支: ${eto.name}どし` : '',
      '',
      `🌟 総合運: ${fortuneData.overall}`,
      `🎨 ラッキーカラー: ${fortuneData.luckyColor}`,
      `✨ ラッキーアイテム: ${fortuneData.luckyItem}`,
      `💬 ${fortuneData.message}`,
    ].filter(Boolean).join('\n');

    return successResponse({ fortuneText });
  } catch (err) {
    console.error('占いエラー:', err);
    return serverErrorResponse();
  }
}
