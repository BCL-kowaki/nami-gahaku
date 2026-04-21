// POST /api/image/process - 画像アップロード・白黒変換・背景除去
import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils';
import type { ProcessImageResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return errorResponse('画像ファイルが必要です', 'NO_IMAGE');
    }

    // 2MB制限チェック
    if (imageFile.size > 2 * 1024 * 1024) {
      return errorResponse('画像は2MB以下にしてください', 'FILE_TOO_LARGE');
    }

    // MIMEタイプチェック（sharpが対応する主要フォーマットを受け入れる）
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp',
      'image/heic', 'image/heif', 'image/gif',
    ];
    if (imageFile.type && !allowedTypes.includes(imageFile.type)) {
      return errorResponse(
        `対応していない画像形式です (${imageFile.type})`,
        'INVALID_FORMAT'
      );
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const originalSize = buffer.length;

    // Sharp処理パイプライン（仕様書 6.1準拠）
    const processedBuffer = await sharp(buffer)
      .resize(800, 800, { fit: 'inside' })     // a. リサイズ
      .grayscale()                               // b. グレースケール化
      .threshold(128)                            // c. 白黒二値化
      .flatten({ background: '#FFFFFF' })        // d. 背景除去（白）
      .png()
      .toBuffer();

    // 改善案6: Base64で返してクライアント側でプレビュー
    const processedImageBase64 = processedBuffer.toString('base64');

    const response: ProcessImageResponse = {
      processedImageBase64,
      originalSize,
      processedSize: processedBuffer.length,
    };

    return successResponse(response);
  } catch (err) {
    console.error('画像処理エラー:', err);
    const detail = err instanceof Error ? err.message : '不明なエラー';
    return serverErrorResponse(`画像処理に失敗しました: ${detail}`);
  }
}

// Vercel Serverless の制限対策（改善案4）
// App Routerではroute segment configを使用
export const maxDuration = 30; // 最大30秒
