// GET /api/ai/fortune - 今日の占い（将来用）
import { successResponse, errorResponse } from '@/lib/utils';

export async function GET() {
  try {
    // Phase 2で実装予定
    return errorResponse(
      'この機能はまだ準備中だぜ！もうちょっと待っててくれ！',
      'NOT_IMPLEMENTED',
      501
    );
  } catch {
    return errorResponse('占いエラー', 'INTERNAL_ERROR', 500);
  }
}
