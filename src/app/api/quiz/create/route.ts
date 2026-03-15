// POST /api/quiz/create - クイズ新規作成
import { NextRequest } from 'next/server';
import { createQuiz } from '@/lib/firebase/firestore';
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils';
import type { CreateQuizRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const uid = request.headers.get('x-user-uid');
    const displayName = request.headers.get('x-user-name') || 'ゲスト';
    if (!uid) return unauthorizedResponse();

    const body: CreateQuizRequest = await request.json();
    const { answer, category, dummyChoices, themeId } = body;

    // バリデーション
    if (!answer || !category || !dummyChoices || dummyChoices.length !== 3) {
      return errorResponse('必須フィールドが不足しています', 'INVALID_REQUEST');
    }

    if (dummyChoices.some((d) => !d.trim())) {
      return errorResponse('ダミー選択肢を全て入力してください', 'INVALID_REQUEST');
    }

    const quizId = await createQuiz({
      imageUrl: '', // アップロード後に更新
      answer: answer.trim(),
      category,
      dummyChoices: dummyChoices.map((d) => d.trim()) as [string, string, string],
      creatorUid: uid,
      creatorName: displayName,
      isOfficial: false,
      themeId: themeId || null,
    });

    return successResponse({ quizId }, 201);
  } catch (err) {
    console.error('クイズ作成エラー:', err);
    return serverErrorResponse();
  }
}
