// GET/PUT /api/user/profile - プロフィール取得・更新
import { NextRequest } from 'next/server';
import { getUserProfile, updateUserProfile } from '@/lib/firebase/firestore';
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils';

// プロフィール取得
export async function GET(request: NextRequest) {
  try {
    const uid = request.headers.get('x-user-uid');
    if (!uid) return unauthorizedResponse();

    const profile = await getUserProfile(uid);
    if (!profile) {
      return errorResponse('ユーザーが見つかりません', 'USER_NOT_FOUND', 404);
    }

    return successResponse(profile);
  } catch (err) {
    console.error('プロフィール取得エラー:', err);
    return serverErrorResponse();
  }
}

// プロフィール更新
export async function PUT(request: NextRequest) {
  try {
    const uid = request.headers.get('x-user-uid');
    if (!uid) return unauthorizedResponse();

    const body = await request.json();
    const { displayName } = body;

    if (displayName !== undefined) {
      if (typeof displayName !== 'string' || displayName.length < 2 || displayName.length > 20) {
        return errorResponse('表示名は2〜20文字で入力してください', 'INVALID_NAME');
      }
    }

    await updateUserProfile(uid, { displayName });
    return successResponse({ message: '更新しました' });
  } catch (err) {
    console.error('プロフィール更新エラー:', err);
    return serverErrorResponse();
  }
}
