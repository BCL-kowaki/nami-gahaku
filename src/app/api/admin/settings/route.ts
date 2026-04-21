// 管理者用: 管理者設定（ID/パスワード）取得・更新
import { NextRequest } from 'next/server';
import { verifyAdminPassword, getAdminCredentialServer } from '@/lib/firebase/adminAuth';
import { updateAdminSettingsServer } from '@/lib/firebase/firestoreAdmin';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils';

function getAdminPass(request: NextRequest): string | null {
  return request.headers.get('x-admin-password');
}

// GET: 管理者設定取得
export async function GET(request: NextRequest) {
  try {
    const pass = getAdminPass(request);
    if (!(await verifyAdminPassword(pass))) {
      return errorResponse('管理者認証に失敗しました', 'UNAUTHORIZED', 401);
    }
    const settings = await getAdminCredentialServer();
    return successResponse({ settings });
  } catch (err) {
    console.error('設定取得エラー:', err);
    return serverErrorResponse();
  }
}

// PUT: 管理者設定更新
export async function PUT(request: NextRequest) {
  try {
    const pass = getAdminPass(request);
    if (!(await verifyAdminPassword(pass))) {
      return errorResponse('管理者認証に失敗しました', 'UNAUTHORIZED', 401);
    }
    const body = await request.json() as { adminId: string; adminPassword: string };
    if (!body.adminId?.trim() || !body.adminPassword?.trim()) {
      return errorResponse('adminId と adminPassword は必須です', 'INVALID_REQUEST');
    }
    await updateAdminSettingsServer({
      adminId: body.adminId.trim(),
      adminPassword: body.adminPassword.trim(),
    });
    return successResponse({ ok: true });
  } catch (err) {
    console.error('設定更新エラー:', err);
    return serverErrorResponse();
  }
}
