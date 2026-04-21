// 管理者用: クイズ一覧取得・更新・削除・マイグレーション
import { NextRequest } from 'next/server';
import { verifyAdminPassword } from '@/lib/firebase/adminAuth';
import {
  getAllQuizzesAdminServer,
  updateQuizAdmin,
  deleteQuizAdmin,
  migrateToOfficialAdmin,
} from '@/lib/firebase/firestoreAdmin';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils';
import type { Quiz } from '@/types';

function getAdminPass(request: NextRequest): string | null {
  return request.headers.get('x-admin-password');
}

// GET: クイズ一覧
export async function GET(request: NextRequest) {
  try {
    const pass = getAdminPass(request);
    if (!(await verifyAdminPassword(pass))) {
      return errorResponse('管理者認証に失敗しました', 'UNAUTHORIZED', 401);
    }
    const quizzes = await getAllQuizzesAdminServer();
    return successResponse({ quizzes });
  } catch (err) {
    console.error('クイズ一覧取得エラー:', err);
    return serverErrorResponse();
  }
}

// PATCH: クイズ更新 or マイグレーション実行
export async function PATCH(request: NextRequest) {
  try {
    const pass = getAdminPass(request);
    if (!(await verifyAdminPassword(pass))) {
      return errorResponse('管理者認証に失敗しました', 'UNAUTHORIZED', 401);
    }
    const body = await request.json() as
      | { action: 'migrate' }
      | { action: 'update'; quizId: string; data: Partial<Quiz> };

    if (body.action === 'migrate') {
      const count = await migrateToOfficialAdmin();
      return successResponse({ count });
    }
    if (body.action === 'update') {
      if (!body.quizId || !body.data) {
        return errorResponse('quizId と data は必須です', 'INVALID_REQUEST');
      }
      await updateQuizAdmin(body.quizId, body.data);
      return successResponse({ ok: true });
    }
    return errorResponse('不正なアクション', 'INVALID_REQUEST');
  } catch (err) {
    console.error('クイズ更新エラー:', err);
    return serverErrorResponse();
  }
}

// DELETE: クイズ削除
export async function DELETE(request: NextRequest) {
  try {
    const pass = getAdminPass(request);
    if (!(await verifyAdminPassword(pass))) {
      return errorResponse('管理者認証に失敗しました', 'UNAUTHORIZED', 401);
    }
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get('quizId');
    if (!quizId) {
      return errorResponse('quizId は必須です', 'INVALID_REQUEST');
    }
    await deleteQuizAdmin(quizId);
    return successResponse({ ok: true });
  } catch (err) {
    console.error('クイズ削除エラー:', err);
    return serverErrorResponse();
  }
}
