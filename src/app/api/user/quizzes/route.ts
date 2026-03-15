// GET /api/user/quizzes - 自分が投稿したクイズ一覧
import { NextRequest } from 'next/server';
import { getUserQuizzes } from '@/lib/firebase/firestore';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const uid = request.headers.get('x-user-uid');
    if (!uid) return unauthorizedResponse();

    const quizzes = await getUserQuizzes(uid);
    return successResponse({ quizzes });
  } catch (err) {
    console.error('投稿クイズ取得エラー:', err);
    return serverErrorResponse();
  }
}
