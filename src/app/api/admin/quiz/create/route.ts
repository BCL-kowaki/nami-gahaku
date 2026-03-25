// POST /api/admin/quiz/create - 管理者用クイズ作成（画像アップロード含む）
import { NextRequest } from 'next/server';
import { adminStorage } from '@/lib/firebase/admin';
import { createQuiz, getAdminSettings } from '@/lib/firebase/firestore';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils';
import type { QuizCategory } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      adminPassword,
      imageBase64,
      originalImageBase64,
      answer,
      category,
      dummyChoices,
    } = body as {
      adminPassword: string;
      imageBase64: string;      // 白黒変換済み画像 (data:image/png;base64,...)
      originalImageBase64: string; // 元画像
      answer: string;
      category: QuizCategory;
      dummyChoices: [string, string, string];
    };

    // 管理者認証チェック
    const adminSettings = await getAdminSettings();
    const correctPass = adminSettings?.adminPassword ?? 'admin';
    if (adminPassword !== correctPass) {
      return errorResponse('管理者認証に失敗しました', 'UNAUTHORIZED', 401);
    }

    // バリデーション
    if (!imageBase64 || !answer || !category || !dummyChoices || dummyChoices.length !== 3) {
      return errorResponse('必須フィールドが不足しています', 'INVALID_REQUEST');
    }

    if (dummyChoices.some((d: string) => !d.trim())) {
      return errorResponse('ダミー選択肢を全て入力してください', 'INVALID_REQUEST');
    }

    const bucket = adminStorage.bucket();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2);

    // 白黒変換済み画像をアップロード
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const fileName = `${timestamp}_${randomStr}.png`;
    const filePath = `official-images/${fileName}`;
    const file = bucket.file(filePath);

    const downloadToken = crypto.randomUUID();
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/png',
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    });

    const encodedPath = encodeURIComponent(filePath);
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    // 元画像もStorageにアップロード（Firestoreの1MBドキュメント制限対策）
    let originalImageUrl: string | undefined;
    if (originalImageBase64) {
      const origBase64 = originalImageBase64.replace(/^data:image\/\w+;base64,/, '');
      const origBuffer = Buffer.from(origBase64, 'base64');
      const origFileName = `${timestamp}_${randomStr}_original.png`;
      const origFilePath = `official-images/${origFileName}`;
      const origFile = bucket.file(origFilePath);

      const origToken = crypto.randomUUID();
      await origFile.save(origBuffer, {
        metadata: {
          contentType: 'image/png',
          metadata: { firebaseStorageDownloadTokens: origToken },
        },
      });

      const origEncodedPath = encodeURIComponent(origFilePath);
      originalImageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${origEncodedPath}?alt=media&token=${origToken}`;
    }

    // Firestoreにクイズを作成
    const quizId = await createQuiz({
      imageUrl,
      originalImageUrl,
      answer: answer.trim(),
      category,
      dummyChoices: dummyChoices.map((d: string) => d.trim()) as [string, string, string],
      creatorUid: 'official',
      creatorName: 'nami【公式】',
      isOfficial: true,
      themeId: null,
    });

    return successResponse({ quizId, imageUrl }, 201);
  } catch (err) {
    console.error('管理者クイズ作成エラー:', err);
    return serverErrorResponse('クイズの作成に失敗しました');
  }
}

export const maxDuration = 30;

// リクエストボディサイズ上限を10MBに拡大（画像2枚分のBase64対応）
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
