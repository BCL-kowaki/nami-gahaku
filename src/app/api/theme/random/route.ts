// GET /api/theme/random - お題をランダムに1つ取得
import { getRandomTheme } from '@/lib/firebase/firestore';
import { successResponse, serverErrorResponse } from '@/lib/utils';

export async function GET() {
  try {
    const theme = await getRandomTheme();
    if (!theme) {
      return successResponse({ name: 'ねこ', category: 'どうぶつ' });
    }
    return successResponse(theme);
  } catch (err) {
    console.error('お題取得エラー:', err);
    return serverErrorResponse();
  }
}
