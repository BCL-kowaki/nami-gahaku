// POST /api/quiz/answer - 回答送信、正解判定 + collection登録
import { NextRequest } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { saveAnswer } from '@/lib/firebase/firestore';
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils';
import type { AnswerRequest, AnswerResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const uid = request.headers.get('x-user-uid');
    if (!uid) return unauthorizedResponse();

    const body: AnswerRequest = await request.json();
    const { quizId, selectedAnswer } = body;

    if (!quizId || !selectedAnswer) {
      return errorResponse('quizIdとselectedAnswerは必須です', 'INVALID_REQUEST');
    }

    // クイズを取得して正解判定
    const quizSnap = await getDoc(doc(db, 'quizzes', quizId));
    if (!quizSnap.exists()) {
      return errorResponse('クイズが見つかりません', 'QUIZ_NOT_FOUND', 404);
    }

    const quizData = quizSnap.data();
    const isCorrect = selectedAnswer === quizData.answer;

    // 回答を保存（正解時はコレクションにも登録）
    await saveAnswer(uid, quizId, isCorrect);

    const response: AnswerResponse = {
      isCorrect,
      correctAnswer: quizData.answer,
      quizId,
    };

    return successResponse(response);
  } catch (err) {
    console.error('回答処理エラー:', err);
    return serverErrorResponse();
  }
}
