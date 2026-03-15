'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Trophy, XCircle, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import Card from '@/components/ui/Card';
import { useQuizStore } from '@/stores/quizStore';
import { useAuthStore } from '@/stores/authStore';
import { getRandomQuiz, saveAnswer } from '@/lib/firebase/firestore';
import { shuffle } from '@/lib/utils';
import type { QuizDisplay } from '@/types';

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

  // クイズを1問取得
  const fetchQuiz = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const quiz = await getRandomQuiz(user.uid);
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
  }, [user, setCurrentQuiz, setLoading]);

  // 初期ロード
  useEffect(() => {
    if (!currentQuiz && !isLoading) {
      fetchQuiz();
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

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

  // セッションリセット
  const handleReset = () => {
    resetSession();
    fetchQuiz();
  };

  // ローディング中
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
              {!currentQuiz.isOfficial && (
                <div className="px-3 py-2 border-t border-[var(--color-border)]">
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    作: {currentQuiz.creatorName}
                  </p>
                </div>
              )}
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
