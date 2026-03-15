// POST /api/ai/chat - なみ画伯チャット（将来用）
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    // Phase 2で実装予定
    return errorResponse(
      'この機能はまだ準備中だぜ！もうちょっと待っててくれ！',
      'NOT_IMPLEMENTED',
      501
    );
  } catch (err) {
    console.error('チャットエラー:', err);
    return serverErrorResponse();
  }
}
