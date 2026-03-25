'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Trophy, XCircle, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import Card from '@/components/ui/Card';
import { useQuizStore, QUIZ_PER_ROUND, POINTS_PER_QUESTION, MAX_SCORE } from '@/stores/quizStore';
import { useAuthStore } from '@/stores/authStore';
import { getRandomQuiz, saveAnswer } from '@/lib/firebase/firestore';
import { shuffle } from '@/lib/utils';
import type { QuizDisplay } from '@/types';

type GamePhase = 'start' | 'playing' | 'result';

// スコアに応じたメッセージ
function getResultMessage(points: number): { emoji: string; text: string } {
  if (points === MAX_SCORE) return { emoji: '🎉', text: 'パーフェクト！天才だぜ！' };
  if (points >= 80) return { emoji: '✨', text: 'すごいぜ！よくできた！' };
  if (points >= 60) return { emoji: '😊', text: 'なかなかやるじゃん！' };
  if (points >= 40) return { emoji: '🤔', text: 'もうちょっとだったな！' };
  if (points >= 20) return { emoji: '💪', text: 'つぎはがんばれよ！' };
  return { emoji: '😅', text: 'むずかしかったか...？' };
}

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
    getPoints,
    isRoundComplete,
  } = useQuizStore();

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const [phase, setPhase] = useState<GamePhase>('start');
  const [lastScore, setLastScore] = useState<number | null>(null);

  // クイズを1問取得
  const fetchQuiz = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
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

  // スタートボタン押下
  const handleStart = () => {
    resetSession();
    setPhase('playing');
    fetchQuiz();
  };

  // 回答処理
  const handleAnswer = async (answer: string) => {
    if (isAnswered || !currentQuiz || !user) return;

    selectAnswer(answer);
    const correct = answer === currentQuiz.answer;
    setResult(correct);

    try {
      await saveAnswer(user.uid, currentQuiz.id, correct);
    } catch (err) {
      console.error('回答保存エラー:', err);
    }
  };

  // 次の問題へ or 結果画面へ
  const handleNext = () => {
    // 5問回答完了 → 結果画面へ
    if (isRoundComplete()) {
      setLastScore(getPoints());
      setPhase('result');
      return;
    }
    nextQuiz();
    fetchQuiz();
  };

  // セッションリセット（スタート画面に戻る）
  const handleReset = () => {
    setLastScore(getPoints());
    resetSession();
    setPhase('start');
  };

  // もう一度あそぶ（結果画面から）
  const handlePlayAgain = () => {
    resetSession();
    setPhase('playing');
    fetchQuiz();
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
          <Image
            src="/logo.png"
            alt="なみ画伯"
            width={200}
            height={200}
            priority
          />
          <h1 className="text-2xl font-black">おえかきクイズ</h1>
          <p className="text-sm text-[var(--color-text-secondary)] text-center">
            なみがかいた絵をあてよう！
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {QUIZ_PER_ROUND}もん × {POINTS_PER_QUESTION}てん = {MAX_SCORE}てんまんてん
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

        {lastScore !== null && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-[var(--color-text-muted)]"
          >
            前回: {lastScore} / {MAX_SCORE} てん
          </motion.p>
        )}
      </div>
    );
  }

  // 3. 結果画面
  if (phase === 'result') {
    const points = lastScore ?? getPoints();
    const resultMsg = getResultMessage(points);

    return (
      <div className="flex flex-col items-center justify-center gap-6 pt-8 animate-fade-in-up">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
          className="flex flex-col items-center gap-4"
        >
          <Trophy className="w-16 h-16 text-[var(--color-text-primary)]" />

          <div className="text-center">
            <p className="text-sm text-[var(--color-text-secondary)] mb-1">けっか</p>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', bounce: 0.5 }}
              className="text-5xl font-black"
            >
              {points}<span className="text-xl">てん</span>
            </motion.p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              / {MAX_SCORE}てん（{score}もん せいかい）
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center"
          >
            <p className="text-3xl mb-1">{resultMsg.emoji}</p>
            <p className="text-sm font-bold">{resultMsg.text}</p>
          </motion.div>
        </motion.div>

        {/* スコアバー */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="w-full max-w-xs"
        >
          <div className="progress-bar">
            <motion.div
              className="progress-bar-fill"
              initial={{ width: '0%' }}
              animate={{ width: `${(points / MAX_SCORE) * 100}%` }}
              transition={{ delay: 1, duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="flex flex-col gap-2 w-full max-w-xs"
        >
          <Button onClick={handlePlayAgain} fullWidth className="py-3">
            <RotateCcw className="w-4 h-4" />
            もう一度あそぶ
          </Button>
          <Button onClick={handleReset} variant="ghost" fullWidth>
            トップにもどる
          </Button>
        </motion.div>
      </div>
    );
  }

  // 2. プレイ中

  // ローディング中
  if (isLoading && !currentQuiz) {
    return <Loading text="クイズを読み込み中..." />;
  }

  // クイズが尽きた場合（5問到達前にクイズがなくなった）
  if (!currentQuiz && !isLoading) {
    const points = getPoints();
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-12 animate-fade-in-up">
        <Trophy className="w-16 h-16 text-[var(--color-text-muted)]" />
        <h2 className="text-lg font-bold">クイズがもうないぜ！</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {points} / {MAX_SCORE} てん（{score}もん せいかい）
        </p>
        <Button onClick={handleReset} variant="outline">
          <RotateCcw className="w-4 h-4" />
          トップにもどる
        </Button>
      </div>
    );
  }

  // 現在のポイント
  const currentPoints = score * POINTS_PER_QUESTION;

  return (
    <div className="flex flex-col gap-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black flex items-center gap-2">
          <Play className="w-5 h-5" />
          あそぶ
        </h1>
        <div className="text-sm font-bold text-[var(--color-text-secondary)]">
          {currentPoints} てん
        </div>
      </div>

      {/* プログレスバー（問題進行度） */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
          {totalAnswered + (isAnswered ? 0 : 1)} / {QUIZ_PER_ROUND}
        </span>
        <div className="progress-bar flex-1">
          <div
            className="progress-bar-fill"
            style={{ width: `${(totalAnswered / QUIZ_PER_ROUND) * 100}%` }}
          />
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
                  if (choice === selectedAnswer && isCorrect) {
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
                      <span className="text-lg font-black">
                        せいかい！ +{POINTS_PER_QUESTION}てん
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[var(--color-incorrect)]">
                      <XCircle className="w-6 h-6" />
                      <span className="text-lg font-black">ざんねん...</span>
                    </div>
                  )}
                  <Button onClick={handleNext} variant="outline" fullWidth>
                    {isRoundComplete() ? 'けっかをみる' : 'つぎのもんだい'}
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
