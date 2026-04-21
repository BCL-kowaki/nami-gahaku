// 管理者用: お知らせ一覧取得・作成・更新・削除
import { NextRequest } from 'next/server';
import { verifyAdminPassword } from '@/lib/firebase/adminAuth';
import {
  getAllAnnouncementsAdmin,
  createAnnouncementAdmin,
  updateAnnouncementAdmin,
  deleteAnnouncementAdmin,
} from '@/lib/firebase/firestoreAdmin';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils';
import type { Announcement } from '@/types';

function getAdminPass(request: NextRequest): string | null {
  return request.headers.get('x-admin-password');
}

// GET: お知らせ一覧
export async function GET(request: NextRequest) {
  try {
    const pass = getAdminPass(request);
    if (!(await verifyAdminPassword(pass))) {
      return errorResponse('管理者認証に失敗しました', 'UNAUTHORIZED', 401);
    }
    const announcements = await getAllAnnouncementsAdmin();
    return successResponse({ announcements });
  } catch (err) {
    console.error('お知らせ一覧取得エラー:', err);
    return serverErrorResponse();
  }
}

// POST: お知らせ作成
export async function POST(request: NextRequest) {
  try {
    const pass = getAdminPass(request);
    if (!(await verifyAdminPassword(pass))) {
      return errorResponse('管理者認証に失敗しました', 'UNAUTHORIZED', 401);
    }
    const body = await request.json() as { title: string; message: string };
    if (!body.title?.trim() || !body.message?.trim()) {
      return errorResponse('title と message は必須です', 'INVALID_REQUEST');
    }
    const id = await createAnnouncementAdmin(body.title.trim(), body.message.trim());
    return successResponse({ id });
  } catch (err) {
    console.error('お知らせ作成エラー:', err);
    return serverErrorResponse();
  }
}

// PATCH: お知らせ更新
export async function PATCH(request: NextRequest) {
  try {
    const pass = getAdminPass(request);
    if (!(await verifyAdminPassword(pass))) {
      return errorResponse('管理者認証に失敗しました', 'UNAUTHORIZED', 401);
    }
    const body = await request.json() as { id: string; data: Partial<Announcement> };
    if (!body.id || !body.data) {
      return errorResponse('id と data は必須です', 'INVALID_REQUEST');
    }
    await updateAnnouncementAdmin(body.id, body.data);
    return successResponse({ ok: true });
  } catch (err) {
    console.error('お知らせ更新エラー:', err);
    return serverErrorResponse();
  }
}

// DELETE: お知らせ削除
export async function DELETE(request: NextRequest) {
  try {
    const pass = getAdminPass(request);
    if (!(await verifyAdminPassword(pass))) {
      return errorResponse('管理者認証に失敗しました', 'UNAUTHORIZED', 401);
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return errorResponse('id は必須です', 'INVALID_REQUEST');
    }
    await deleteAnnouncementAdmin(id);
    return successResponse({ ok: true });
  } catch (err) {
    console.error('お知らせ削除エラー:', err);
    return serverErrorResponse();
  }
}
