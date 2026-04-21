// ログインID → Firebase Auth 用 email を解決するエンドポイント
// 認証不要（ログイン前に使う）
import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { loginId?: string };
    const loginId = body.loginId?.trim();
    if (!loginId) {
      return errorResponse('loginId は必須です', 'INVALID_REQUEST');
    }

    // ① メアド形式ならそのまま返す（フロントで直接Authログイン）
    if (loginId.includes('@')) {
      return successResponse({ email: loginId });
    }

    // ② users コレクションから loginId 一致を検索
    const snap = await adminDb
      .collection('users')
      .where('loginId', '==', loginId)
      .limit(1)
      .get();

    if (!snap.empty) {
      const data = snap.docs[0].data() as { email?: string };
      if (data.email) {
        return successResponse({ email: data.email });
      }
    }

    // ③ 見つからなければ従来通り {loginId}@nami-quiz.app にフォールバック
    //    （loginIdフィールドがまだ付与されていない新方式の旧ユーザー対応）
    return successResponse({ email: `${loginId}@nami-quiz.app` });
  } catch (err) {
    console.error('ID解決エラー:', err);
    return serverErrorResponse();
  }
}
