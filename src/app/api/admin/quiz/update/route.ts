// POST /api/admin/quiz/update - 管理者用クイズ編集（画像差し替え対応）
import { NextRequest } from 'next/server';
import { adminStorage } from '@/lib/firebase/admin';
import { updateQuizAdmin } from '@/lib/firebase/firestoreAdmin';
import { verifyAdminPassword } from '@/lib/firebase/adminAuth';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils';
import type { Quiz, QuizCategory } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // 管理者認証（x-admin-password ヘッダ）
    const pass = request.headers.get('x-admin-password');
    if (!(await verifyAdminPassword(pass))) {
      return errorResponse('管理者認証に失敗しました', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const {
      quizId,
      answer,
      category,
      dummyChoices,
      creatorUid,
      creatorName,
      isOfficial,
      imageBase64,         // （任意）差し替え画像（処理済み白黒）
      originalImageBase64, // （任意）差し替え画像（元）
    } = body as {
      quizId: string;
      answer?: string;
      category?: QuizCategory;
      dummyChoices?: [string, string, string];
      creatorUid?: string;
      creatorName?: string;
      isOfficial?: boolean;
      imageBase64?: string;
      originalImageBase64?: string;
    };

    if (!quizId) {
      return errorResponse('quizId は必須です', 'INVALID_REQUEST');
    }

    const updates: Partial<Quiz> = {};

    if (typeof answer === 'string' && answer.trim()) {
      updates.answer = answer.trim();
    }
    if (category) {
      updates.category = category;
    }
    if (dummyChoices) {
      if (dummyChoices.length !== 3 || dummyChoices.some(d => !d.trim())) {
        return errorResponse('ダミー選択肢は3つ全て入力してください', 'INVALID_REQUEST');
      }
      updates.dummyChoices = dummyChoices.map(d => d.trim()) as [string, string, string];
    }
    if (typeof creatorUid === 'string' && creatorUid.trim()) {
      updates.creatorUid = creatorUid.trim();
    }
    if (typeof creatorName === 'string' && creatorName.trim()) {
      updates.creatorName = creatorName.trim();
    }
    if (typeof isOfficial === 'boolean') {
      updates.isOfficial = isOfficial;
    }

    // 画像の差し替え
    if (imageBase64) {
      const bucket = adminStorage.bucket();
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).slice(2);

      // 白黒変換済み画像
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const filePath = `official-images/${timestamp}_${randomStr}.png`;
      const file = bucket.file(filePath);
      const downloadToken = crypto.randomUUID();
      await file.save(imageBuffer, {
        metadata: {
          contentType: 'image/png',
          metadata: { firebaseStorageDownloadTokens: downloadToken },
        },
      });
      const encodedPath = encodeURIComponent(filePath);
      updates.imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

      // 元画像（任意）
      if (originalImageBase64) {
        const origBase64 = originalImageBase64.replace(/^data:image\/\w+;base64,/, '');
        const origBuffer = Buffer.from(origBase64, 'base64');
        const origFilePath = `official-images/${timestamp}_${randomStr}_original.png`;
        const origFile = bucket.file(origFilePath);
        const origToken = crypto.randomUUID();
        await origFile.save(origBuffer, {
          metadata: {
            contentType: 'image/png',
            metadata: { firebaseStorageDownloadTokens: origToken },
          },
        });
        const origEncodedPath = encodeURIComponent(origFilePath);
        updates.originalImageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${origEncodedPath}?alt=media&token=${origToken}`;
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse('更新する項目がありません', 'INVALID_REQUEST');
    }

    await updateQuizAdmin(quizId, updates);

    return successResponse({ ok: true, updates });
  } catch (err) {
    console.error('管理者クイズ編集エラー:', err);
    return serverErrorResponse();
  }
}

export const maxDuration = 30;
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
