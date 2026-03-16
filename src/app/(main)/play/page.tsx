'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Trophy, XCircle, CheckCircle, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import Card from '@/components/ui/Card';
import { useQuizStore } from '@/stores/quizStore';
import { useAuthStore } from '@/stores/authStore';
import { getRandomQuiz, saveAnswer, getQuizImagesForFlash } from '@/lib/firebase/firestore';
import { shuffle } from '@/lib/utils';
import type { QuizDisplay } from '@/types';

type GamePhase = 'start' | 'flash' | 'playing';

export default function PlayPage() {
  const {
    currentQuiz,
    selectedAnswer,
    isAnswered,
    isCorrect,
    score,
    totalAnswered,
    isLoading,
    setCurrentQuiz,
    selectAnswer,
    setResult,
    nextQuiz,
    resetSession,
    setLoading,
  } = useQuizStore();

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  // ゲームフェーズ管理
  const [phase, setPhase] = useState<GamePhase>('start');
  const [flashImages, setFlashImages] = useState<string[]>([]);
  const [flashIndex, setFlashIndex] = useState(0);
  const flashTimerRef = useRef<NodeJS.Timeout | null>(null);

  // フラッシュアニメーション用画像をプリロード
  const preloadFlashImages = useCallback(async () => {
    try {
      const images = await getQuizImagesForFlash(15);
      setFlashImages(images);
    } catch (err) {
      console.error('フラッシュ画像取得エラー:', err);
    }
  }, []);

  // スタート画面表示時にフラッシュ画像をプリロード
  useEffect(() => {
    if (phase === 'start') {
      preloadFlashImages();
    }
  }, [phase, preloadFlashImages]);

  // クイズを1問取得
  const fetchQuiz = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // プロフィールのskipAnswered設定を反映
      const skipAnswered = profile?.skipAnswered ?? false;
      const quiz = await getRandomQuiz(user.uid, skipAnswered);
      if (quiz && quiz.id) {
        const choices = shuffle([quiz.answer, ...quiz.dummyChoices]);
        const display: QuizDisplay = {
          id: quiz.id,
          imageUrl: quiz.imageUrl,
          choices,
          answer: quiz.answer,
          category: quiz.category,
          creatorName: quiz.creatorName,
          isOfficial: quiz.isOfficial,
        };
        setCurrentQuiz(display);
      } else {
        setCurrentQuiz(null);
      }
    } catch (err) {
      console.error('クイズ取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }, [user, profile, setCurrentQuiz, setLoading]);

  // フラッシュアニメーション開始
  const startFlashAnimation = useCallback(() => {
    setPhase('flash');
    setFlashIndex(0);

    // 最初のクイズを裏で取得開始
    fetchQuiz();

    let idx = 0;
    const totalDuration = 2000; // 2秒間
    const interval = 120; // 120msごとに切り替え
    const totalFlashes = Math.floor(totalDuration / interval);

    flashTimerRef.current = setInterval(() => {
      idx++;
      setFlashIndex(idx);

      if (idx >= totalFlashes) {
        if (flashTimerRef.current) {
          clearInterval(flashTimerRef.current);
          flashTimerRef.current = null;
        }
        setPhase('playing');
      }
    }, interval);
  }, [fetchQuiz]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (flashTimerRef.current) {
        clearInterval(flashTimerRef.current);
      }
    };
  }, []);

  // スタートボタン押下
  const handleStart = () => {
    resetSession();
    if (flashImages.length > 0) {
      startFlashAnimation();
    } else {
      // フラッシュ画像がなければ直接プレイ開始
      setPhase('playing');
      fetchQuiz();
    }
  };

  // 回答処理
  const handleAnswer = async (answer: string) => {
    if (isAnswered || !currentQuiz || !user) return;

    selectAnswer(answer);
    const correct = answer === currentQuiz.answer;
    setResult(correct);

    // Firestoreに保存
    try {
      await saveAnswer(user.uid, currentQuiz.id, correct);
    } catch (err) {
      console.error('回答保存エラー:', err);
    }
  };

  // 次の問題へ
  const handleNext = () => {
    nextQuiz();
    fetchQuiz();
  };

  // セッションリセット（スタート画面に戻る）
  const handleReset = () => {
    resetSession();
    setPhase('start');
  };

  // =====================
  // フェーズ別レンダリング
  // =====================

  // 1. スタート画面
  if (phase === 'start') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 pt-8 animate-fade-in-up">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center gap-4"
        >
          {/* タイトルロゴ的表示 */}
          <div className="w-32 h-32 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-border)] flex items-center justify-center">
            <Sparkles className="w-16 h-16 text-[var(--color-text-muted)]" />
          </div>
          <h1 className="text-2xl font-black">おえかきクイズ</h1>
          <p className="text-sm text-[var(--color-text-secondary)] text-center">
            なみがかいた絵をあてよう！
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Button onClick={handleStart} className="px-10 py-3 text-lg">
            <Play className="w-5 h-5" />
            スタート
          </Button>
        </motion.div>

        {/* スコア表示（前回の結果があれば） */}
        {totalAnswered > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-[var(--color-text-muted)]"
          >
            前回: {score} / {totalAnswered} 問正解
          </motion.p>
        )}
      </div>
    );
  }

  // 2. フラッシュアニメーション
  if (phase === 'flash') {
    const currentImage = flashImages[flashIndex % flashImages.length];
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-4">
        <h1 className="text-lg font-black flex items-center gap-2">
          <Play className="w-5 h-5" />
          あそぶ
        </h1>

        <motion.div
          className="w-full aspect-square max-w-xs mx-auto rounded-[10px] overflow-hidden border-2 border-[var(--color-border)] bg-white relative"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 0.12, repeat: Infinity }}
        >
          {currentImage && (
            <Image
              src={currentImage}
              alt="フラッシュ"
              fill
              className="object-contain p-4"
              sizes="(max-width: 448px) 100vw, 320px"
              priority
            />
          )}
        </motion.div>

        {/* プログレスバー */}
        <div className="w-full max-w-xs h-1.5 rounded-full bg-[var(--color-surface)] overflow-hidden">
          <motion.div
            className="h-full bg-[var(--color-text-primary)] rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: 'linear' }}
          />
        </div>

        <p className="text-xs text-[var(--color-text-muted)] animate-pulse">
          クイズをじゅんびちゅう...
        </p>
      </div>
    );
  }

  // 3. プレイ中

  // ローディング中（フラッシュ後、まだクイズ読み込み中）
  if (isLoading && !currentQuiz) {
    return <Loading text="クイズを読み込み中..." />;
  }

  // 全問回答済み
  if (!currentQuiz && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-12 animate-fade-in-up">
        <Trophy className="w-16 h-16 text-[var(--color-text-muted)]" />
        <h2 className="text-lg font-bold">すべてのクイズに回答しました！</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          スコア: {score} / {totalAnswered}
        </p>
        <Button onClick={handleReset} variant="outline">
          <RotateCcw className="w-4 h-4" />
          もう一度あそぶ
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black flex items-center gap-2">
          <Play className="w-5 h-5" />
          あそぶ
        </h1>
        <div className="text-sm font-bold text-[var(--color-text-secondary)]">
          {score} / {totalAnswered}
        </div>
      </div>

      {/* クイズカード */}
      {currentQuiz && (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuiz.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            {/* 絵カード */}
            <Card className="mb-4 overflow-hidden" padding={false}>
              <div className="relative w-full aspect-square bg-white flex items-center justify-center">
                <Image
                  src={currentQuiz.imageUrl}
                  alt="クイズの絵"
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 448px) 100vw, 448px"
                />
              </div>
              {/* 投稿者表示 */}
              <div className="px-3 py-2 border-t border-[var(--color-border)] text-right">
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  ©︎ {currentQuiz.creatorName}
                </p>
              </div>
            </Card>

            {/* 4択選択肢 - 2x2グリッド */}
            <div className="grid grid-cols-2 gap-2">
              {currentQuiz.choices.map((choice, i) => {
                let choiceClass = 'card p-3 text-center cursor-pointer transition-all text-sm font-bold';
                if (isAnswered) {
                  if (choice === currentQuiz.answer) {
                    choiceClass += ' !border-[var(--color-correct)] !bg-[var(--color-correct-bg)]';
                  } else if (choice === selectedAnswer && !isCorrect) {
                    choiceClass += ' !border-[var(--color-incorrect)] !bg-[var(--color-incorrect-bg)]';
                  } else {
                    choiceClass += ' opacity-50';
                  }
                }

                return (
                  <motion.button
                    key={`${choice}-${i}`}
                    whileTap={!isAnswered ? { scale: 0.95 } : undefined}
                    className={choiceClass}
                    onClick={() => handleAnswer(choice)}
                    disabled={isAnswered}
                  >
                    {choice}
                  </motion.button>
                );
              })}
            </div>

            {/* 結果表示 */}
            <AnimatePresence>
              {isAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex flex-col items-center gap-3"
                >
                  {isCorrect ? (
                    <div className="flex items-center gap-2 text-[var(--color-correct)]">
                      <CheckCircle className="w-6 h-6" />
                      <span className="text-lg font-black">せいかい！</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2 text-[var(--color-incorrect)]">
                        <XCircle className="w-6 h-6" />
                        <span className="text-lg font-black">ざんねん...</span>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        こたえ: <span className="font-bold">{currentQuiz.answer}</span>
                      </p>
                    </div>
                  )}
                  <Button onClick={handleNext} variant="outline" fullWidth>
                    つぎのもんだい
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
