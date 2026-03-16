'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Pencil, Trash2, Save, ImageIcon,
  Check, Users, Target,
} from 'lucide-react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Loading from '@/components/ui/Loading';
import { useAuthStore } from '@/stores/authStore';
import {
  getUserQuizzes, deleteQuiz, updateQuiz, getQuizStats,
} from '@/lib/firebase/firestore';
import type { Quiz, QuizCategory } from '@/types';

const CATEGORIES: QuizCategory[] = [
  'どうぶつ', 'たべもの', 'のりもの', 'しぜん',
  'にちようひん', 'たてもの', 'キャラクター', 'スポーツ', 'その他',
];

export default function MyQuizzesPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  // クイズ編集モーダル
  const [showQuizEditModal, setShowQuizEditModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [editAnswer, setEditAnswer] = useState('');
  const [editCategory, setEditCategory] = useState<QuizCategory>('その他');
  const [editDummies, setEditDummies] = useState(['', '', '']);
  const [savingQuiz, setSavingQuiz] = useState(false);

  // クイズ統計モーダル
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsQuiz, setStatsQuiz] = useState<Quiz | null>(null);

  // エラー・成功メッセージ
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchMyQuizzes = useCallback(async () => {
    if (!user) return;
    try {
      const quizzes = await getUserQuizzes(user.uid);
      setMyQuizzes(quizzes);
    } catch (err) {
      console.error('投稿クイズ取得エラー:', err);
    } finally {
      setLoadingQuizzes(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyQuizzes();
  }, [fetchMyQuizzes]);

  const showMessage = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // クイズ編集を開始
  const openQuizEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setEditAnswer(quiz.answer);
    setEditCategory(quiz.category);
    setEditDummies([...quiz.dummyChoices]);
    setError('');
    setShowQuizEditModal(true);
  };

  // クイズ更新
  const handleUpdateQuiz = async () => {
    if (!editingQuiz?.id) return;
    if (!editAnswer.trim() || editDummies.some(d => !d.trim())) {
      setError('すべての項目を入力してください');
      return;
    }
    setSavingQuiz(true);
    setError('');
    try {
      await updateQuiz(editingQuiz.id, {
        answer: editAnswer.trim(),
        category: editCategory,
        dummyChoices: editDummies.map(d => d.trim()) as [string, string, string],
      });
      setMyQuizzes(prev => prev.map(q =>
        q.id === editingQuiz.id
          ? { ...q, answer: editAnswer.trim(), category: editCategory, dummyChoices: editDummies.map(d => d.trim()) as [string, string, string] }
          : q
      ));
      setShowQuizEditModal(false);
      showMessage('クイズを更新しました');
    } catch (err) {
      console.error('クイズ更新エラー:', err);
      setError('更新に失敗しました');
    } finally {
      setSavingQuiz(false);
    }
  };

  // クイズ削除
  const handleDeleteQuiz = async (quizId: string) => {
    try {
      await deleteQuiz(quizId);
      setMyQuizzes(prev => prev.filter(q => q.id !== quizId));
      showMessage('クイズを削除しました');
    } catch (err) {
      console.error('クイズ削除エラー:', err);
    }
  };

  // 統計モーダルを開く
  const openStats = (quiz: Quiz) => {
    setStatsQuiz(quiz);
    setShowStatsModal(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-[5px] hover:bg-[var(--color-surface)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          投稿したクイズ
        </h1>
      </div>

      {/* 成功メッセージ */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-xs text-[var(--color-correct)] bg-[var(--color-correct-bg)] p-2 rounded-[5px] text-center"
          >
            <Check className="w-3.5 h-3.5 inline mr-1" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* クイズ一覧 */}
      {loadingQuizzes ? (
        <Loading text="読み込み中..." />
      ) : myQuizzes.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
            まだクイズを投稿していません
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-[var(--color-text-muted)]">
            {myQuizzes.length}件の投稿
          </p>
          {myQuizzes.map((quiz) => {
            const stats = getQuizStats(quiz);
            return (
              <motion.div
                key={quiz.id}
                className="flex items-center gap-3 p-2 rounded-[5px] border border-[var(--color-border)] bg-white"
                whileHover={{ scale: 1.01 }}
              >
                <div className="relative w-14 h-14 flex-shrink-0 rounded-[5px] overflow-hidden border border-[var(--color-border)] bg-white">
                  <Image
                    src={quiz.imageUrl}
                    alt={quiz.answer}
                    fill
                    className="object-contain p-0.5"
                    sizes="56px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{quiz.answer}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    {quiz.category} ・ 回答{stats.totalAnswered}件 ・ 正解率{stats.accuracy}%
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openStats(quiz)}
                    className="p-1.5 rounded-[5px] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <Target className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  </button>
                  <button
                    onClick={() => openQuizEdit(quiz)}
                    className="p-1.5 rounded-[5px] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  </button>
                  <button
                    onClick={() => quiz.id && handleDeleteQuiz(quiz.id)}
                    className="p-1.5 rounded-[5px] hover:bg-[var(--color-incorrect-bg)] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[var(--color-incorrect)]" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* === モーダル群 === */}

      {/* クイズ編集 */}
      <Modal isOpen={showQuizEditModal} onClose={() => setShowQuizEditModal(false)} title="クイズを編集">
        <div className="flex flex-col gap-3">
          {editingQuiz && (
            <div className="relative w-24 h-24 mx-auto rounded-[5px] overflow-hidden border border-[var(--color-border)] bg-white">
              <Image src={editingQuiz.imageUrl} alt={editingQuiz.answer} fill className="object-contain p-1" sizes="96px" />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">正解（なにを描いた？）</label>
            <input type="text" value={editAnswer} onChange={(e) => setEditAnswer(e.target.value)}
              className="input-field" placeholder="例: ねこ" maxLength={20} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">カテゴリ</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setEditCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-[5px] border transition-colors ${
                    editCategory === cat
                      ? 'bg-[var(--color-text-primary)] text-white border-[var(--color-text-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
                  }`}>{cat}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">ダミー選択肢（3つ）</label>
            {editDummies.map((d, i) => (
              <input key={i} type="text" value={d}
                onChange={(e) => { const n = [...editDummies]; n[i] = e.target.value; setEditDummies(n); }}
                className="input-field mb-2" placeholder={`ダミー${i + 1}`} maxLength={20} />
            ))}
          </div>
          {error && <p className="text-xs text-[var(--color-incorrect)] bg-[var(--color-incorrect-bg)] p-2 rounded-[5px]">{error}</p>}
          <Button onClick={handleUpdateQuiz} fullWidth loading={savingQuiz}>
            <Save className="w-4 h-4" />保存する
          </Button>
        </div>
      </Modal>

      {/* クイズ統計 */}
      <Modal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} title="解答統計">
        {statsQuiz && (() => {
          const stats = getQuizStats(statsQuiz);
          return (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 rounded-[5px] overflow-hidden border border-[var(--color-border)] bg-white">
                  <Image src={statsQuiz.imageUrl} alt={statsQuiz.answer} fill className="object-contain p-1" sizes="64px" />
                </div>
                <div>
                  <p className="font-bold">{statsQuiz.answer}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{statsQuiz.category}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-[5px] bg-[var(--color-surface)]">
                  <Users className="w-3 h-3 mx-auto mb-1 text-[var(--color-text-muted)]" />
                  <p className="text-xl font-black">{stats.totalAnswered}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">回答数</p>
                </div>
                <div className="p-3 rounded-[5px] bg-[var(--color-correct-bg)]">
                  <Check className="w-3 h-3 mx-auto mb-1 text-[var(--color-correct)]" />
                  <p className="text-xl font-black text-[var(--color-correct)]">{stats.totalCorrect}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">正解数</p>
                </div>
                <div className="p-3 rounded-[5px] bg-[var(--color-surface)]">
                  <Target className="w-3 h-3 mx-auto mb-1 text-[var(--color-text-muted)]" />
                  <p className="text-xl font-black">{stats.accuracy}%</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">正解率</p>
                </div>
              </div>
              {stats.totalAnswered === 0 && (
                <p className="text-sm text-[var(--color-text-muted)] text-center">まだ誰も回答していません</p>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
