// 管理者ログイン検証: IDとパスワードを受け取り、正しいかだけを返す
import { NextRequest } from 'next/server';
import { getAdminCredentialServer } from '@/lib/firebase/adminAuth';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { adminId?: string; adminPassword?: string };
    if (!body.adminId || !body.adminPassword) {
      return errorResponse('adminId と adminPassword は必須です', 'INVALID_REQUEST');
    }
    const cred = await getAdminCredentialServer();
    const ok = body.adminId === cred.adminId && body.adminPassword === cred.adminPassword;
    if (!ok) {
      return errorResponse('管理者認証に失敗しました', 'UNAUTHORIZED', 401);
    }
    return successResponse({ ok: true });
  } catch (err) {
    console.error('管理者検証エラー:', err);
    return serverErrorResponse();
  }
}
