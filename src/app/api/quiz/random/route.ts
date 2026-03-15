// GET /api/quiz/random - ランダムに1問取得
import { NextRequest } from 'next/server';
import { getRandomQuiz } from '@/lib/firebase/firestore';
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils';
import { shuffle } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const uid = request.headers.get('x-user-uid');
    if (!uid) return unauthorizedResponse();

    const quiz = await getRandomQuiz(uid);
    if (!quiz) {
      return successResponse({ quiz: null, message: '全問回答済みです' });
    }

    // 選択肢をシャッフルして返す
    const choices = shuffle([quiz.answer, ...quiz.dummyChoices]);

    return successResponse({
      quiz: {
        id: quiz.id,
        imageUrl: quiz.imageUrl,
        choices,
        category: quiz.category,
        creatorName: quiz.creatorName,
        isOfficial: quiz.isOfficial,
      },
    });
  } catch (err) {
    console.error('ランダムクイズ取得エラー:', err);
    return serverErrorResponse();
  }
}
