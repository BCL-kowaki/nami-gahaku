// 管理者用: ユーザー一覧取得・更新・削除
import { NextRequest } from 'next/server';
import { verifyAdminPassword } from '@/lib/firebase/adminAuth';
import {
  getAllUsersAdmin,
  updateUserAdmin,
  deleteUserAdmin,
  updateUserPasswordAdmin,
  updateUserLoginIdAdmin,
} from '@/lib/firebase/firestoreAdmin';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils';
import type { UserProfile } from '@/types';

// ヘッダから管理者パスワードを抽出
function getAdminPass(request: NextRequest): string | null {
  return request.headers.get('x-admin-password');
}

// GET: ユーザー一覧
export async function GET(request: NextRequest) {
  try {
    const pass = getAdminPass(request);
    if (!(await verifyAdminPassword(pass))) {
      return errorResponse('管理者認証に失敗しました', 'UNAUTHORIZED', 401);
    }
    const users = await getAllUsersAdmin();
    return successResponse({ users });
  } catch (err) {
    console.error('ユーザー一覧取得エラー:', err);
    return serverErrorResponse();
  }
}

// PATCH: ユーザー情報更新 または パスワード変更
export async function PATCH(request: NextRequest) {
  try {
    const pass = getAdminPass(request);
    if (!(await verifyAdminPassword(pass))) {
      return errorResponse('管理者認証に失敗しました', 'UNAUTHORIZED', 401);
    }
    const body = await request.json() as
      | { action?: 'update'; uid: string; data: Partial<UserProfile> }
      | { action: 'changePassword'; uid: string; newPassword: string }
      | { action: 'changeLoginId'; uid: string; newLoginId: string };

    if ('action' in body && body.action === 'changePassword') {
      if (!body.uid || !body.newPassword) {
        return errorResponse('uid と newPassword は必須です', 'INVALID_REQUEST');
      }
      if (body.newPassword.length < 6) {
        return errorResponse('パスワードは6文字以上にしてください', 'INVALID_REQUEST');
      }
      await updateUserPasswordAdmin(body.uid, body.newPassword);
      return successResponse({ ok: true });
    }

    if ('action' in body && body.action === 'changeLoginId') {
      if (!body.uid || !body.newLoginId) {
        return errorResponse('uid と newLoginId は必須です', 'INVALID_REQUEST');
      }
      await updateUserLoginIdAdmin(body.uid, body.newLoginId);
      return successResponse({ ok: true });
    }

    // デフォルト: プロフィール更新
    const updateBody = body as { uid: string; data: Partial<UserProfile> };
    if (!updateBody.uid || !updateBody.data) {
      return errorResponse('uid と data は必須です', 'INVALID_REQUEST');
    }
    await updateUserAdmin(updateBody.uid, updateBody.data);
    return successResponse({ ok: true });
  } catch (err) {
    console.error('ユーザー更新エラー:', err);
    const msg = err instanceof Error ? err.message : 'サーバーエラー';
    return errorResponse(msg, 'INTERNAL_ERROR', 500);
  }
}

// DELETE: ユーザー削除
export async function DELETE(request: NextRequest) {
  try {
    const pass = getAdminPass(request);
    if (!(await verifyAdminPassword(pass))) {
      return errorResponse('管理者認証に失敗しました', 'UNAUTHORIZED', 401);
    }
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    if (!uid) {
      return errorResponse('uid は必須です', 'INVALID_REQUEST');
    }
    await deleteUserAdmin(uid);
    return successResponse({ ok: true });
  } catch (err) {
    console.error('ユーザー削除エラー:', err);
    return serverErrorResponse();
  }
}
