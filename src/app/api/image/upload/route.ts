// POST /api/image/upload - 変換済み画像をFirebase Storageに保存
import { NextRequest } from 'next/server';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const uid = request.headers.get('x-user-uid');
    if (!uid) return unauthorizedResponse();

    const body = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return errorResponse('画像データが必要です', 'NO_IMAGE');
    }

    // Base64をBufferに変換
    const buffer = Buffer.from(imageBase64, 'base64');

    // Firebase Storageにアップロード
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
    const storageRef = ref(storage, `quiz-images/${uid}/${fileName}`);

    await uploadBytes(storageRef, buffer, {
      contentType: 'image/png',
    });

    const downloadUrl = await getDownloadURL(storageRef);

    return successResponse({ url: downloadUrl });
  } catch (err) {
    console.error('画像アップロードエラー:', err);
    return serverErrorResponse('画像のアップロードに失敗しました');
  }
}
