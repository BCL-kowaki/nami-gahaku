// AI画像生成のFew-shot用: クイズDBからサンプル画像をランダム取得
// official-images に溜まっている絵を Gemini に参照させる用途
import { adminDb } from '@/lib/firebase/admin';

export interface SampleImage {
  base64: string;      // base64エンコード済みの画像データ（data URI prefix なし）
  mimeType: string;    // 例: 'image/png'
}

/**
 * isHidden==false のクイズからランダムにサンプル画像を取得し、
 * 各画像を Gemini に渡せる base64 形式で返す。
 * @param count 取得するサンプル画像数（デフォルト3枚）
 */
export async function getSampleQuizImages(count = 3): Promise<SampleImage[]> {
  try {
    // 表示中のクイズ画像を最大30件取得
    const snap = await adminDb
      .collection('quizzes')
      .where('isHidden', '==', false)
      .limit(30)
      .get();
    if (snap.empty) return [];

    const urls = snap.docs
      .map(d => (d.data() as { imageUrl?: string }).imageUrl)
      .filter((u): u is string => typeof u === 'string' && u.length > 0);

    if (urls.length === 0) return [];

    // ランダムにシャッフル
    const shuffled = [...urls].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, Math.min(count, shuffled.length));

    // 各URLを並列で fetch して base64 化
    const results = await Promise.all(
      picks.map(async (url): Promise<SampleImage | null> => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const contentType = res.headers.get('content-type') || 'image/png';
          const buf = await res.arrayBuffer();
          const base64 = Buffer.from(buf).toString('base64');
          return { base64, mimeType: contentType };
        } catch (err) {
          console.error('サンプル画像取得エラー:', url, err);
          return null;
        }
      })
    );

    return results.filter((r): r is SampleImage => r !== null);
  } catch (err) {
    console.error('getSampleQuizImages エラー:', err);
    return [];
  }
}
