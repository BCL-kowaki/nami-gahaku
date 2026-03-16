'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles, Calendar } from 'lucide-react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Loading from '@/components/ui/Loading';
import { useAuthStore } from '@/stores/authStore';
import { getTodayFortune, saveFortune, getRandomQuizImage } from '@/lib/firebase/firestore';
import type { Fortune } from '@/types';

export default function FortunePage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // 初回読み込み: 今日の占いキャッシュを確認
  useEffect(() => {
    const loadFortune = async () => {
      if (!user) return;
      try {
        const cached = await getTodayFortune(user.uid);
        if (cached) {
          setFortune(cached);
        }
      } catch (err) {
        console.error('占い取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };
    loadFortune();
  }, [user]);

  // 占い実行
  const handleFortune = async () => {
    if (!user || !profile) return;

    if (!profile.birthday) {
      setError('プロフィールで誕生日を設定してね！');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      // AI占い生成
      const res = await fetch('/api/ai/fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthday: profile.birthday }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || '占いに失敗しました');
        return;
      }

      // ランダムなキャラ画像を取得
      const randomImage = await getRandomQuizImage();
      const characterImageUrl = randomImage?.imageUrl || '';

      // 今日の日付
      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const fortuneData: Omit<Fortune, 'createdAt'> = {
        uid: user.uid,
        date,
        fortuneText: data.data.fortuneText,
        characterImageUrl,
      };

      // Firestoreに保存
      await saveFortune(user.uid, fortuneData);

      setFortune(fortuneData as Fortune);
    } catch (err) {
      console.error('占いエラー:', err);
      setError('占いに失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-4">
      {/* ヘッダー */}
      <h1 className="text-lg font-black flex items-center gap-2">
        <Star className="w-5 h-5" />
        うらなう
      </h1>

      <AnimatePresence mode="wait">
        {fortune ? (
          /* 占い結果表示 */
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            {/* 今日のキャラクター */}
            {fortune.characterImageUrl && (
              <Card className="text-center">
                <h2 className="text-sm font-bold mb-3 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  きょうのキャラクター
                </h2>
                <div className="relative mx-auto bg-white rounded-[5px] border border-[var(--color-border)] overflow-hidden" style={{ width: '90%', maxWidth: '420px', aspectRatio: '1 / 1' }}>
                  <Image
                    src={fortune.characterImageUrl}
                    alt="今日のキャラクター"
                    fill
                    className="object-contain p-2"
                    sizes="(max-width: 420px) 90vw, 420px"
                  />
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-2">
                  ？？？
                </p>
              </Card>
            )}

            {/* 占い結果 */}
            <Card>
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Star className="w-4 h-4" />
                きょうのうんせい
              </h2>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {fortune.fortuneText}
              </div>
            </Card>

            <p className="text-[10px] text-center text-[var(--color-text-muted)]">
              占いは1日1回だぜ！また明日来てくれよな！
            </p>
          </motion.div>
        ) : (
          /* 占い前 */
          <motion.div
            key="start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 pt-8"
          >
            {!profile?.birthday && (
              <Card className="w-full">
                <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
                  <Calendar className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">
                    占いには誕生日が必要だぜ！<br />
                    <span className="text-xs text-[var(--color-text-muted)]">
                      ぷろふ → プロフィール編集で設定してね
                    </span>
                  </p>
                </div>
              </Card>
            )}

            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Image
                src="/logo.png"
                alt="なみ画伯"
                width={96}
                height={96}
              />
            </motion.div>

            <div className="text-center">
              <h2 className="text-lg font-black mb-1">今日の運勢は...？</h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                なみ画伯が占ってやるぜ！
              </p>
            </div>

            {error && (
              <p className="text-xs text-[var(--color-incorrect)] bg-[var(--color-incorrect-bg)] p-2 rounded-[5px] w-full text-center">
                {error}
              </p>
            )}

            <Button
              onClick={handleFortune}
              loading={generating}
              disabled={!profile?.birthday}
              className="px-10 py-3 text-lg"
            >
              <Sparkles className="w-5 h-5" />
              うらなう！
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
