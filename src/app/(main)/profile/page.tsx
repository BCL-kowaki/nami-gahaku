'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User, LogOut, Pencil, ChevronRight, Shield, FileText,
  BarChart3, ImageIcon, Trash2,
} from 'lucide-react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Loading from '@/components/ui/Loading';
import { useAuthStore } from '@/stores/authStore';
import { logOut } from '@/lib/firebase/auth';
import { getUserQuizzes, updateUserProfile, deleteQuiz } from '@/lib/firebase/firestore';
import type { Quiz } from '@/types';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const router = useRouter();

  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

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

  const handleLogout = async () => {
    await logOut();
    router.replace('/login');
  };

  const handleUpdateName = async () => {
    if (!user || !newName.trim()) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { displayName: newName.trim() });
      await refreshProfile();
      setShowNameModal(false);
    } catch (err) {
      console.error('表示名更新エラー:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      await deleteQuiz(quizId);
      setMyQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (err) {
      console.error('クイズ削除エラー:', err);
    }
  };

  if (!profile) return <Loading />;

  const accuracy =
    profile.totalAnswered > 0
      ? Math.round((profile.totalScore / profile.totalAnswered) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* ヘッダー */}
      <h1 className="text-lg font-black flex items-center gap-2">
        <User className="w-5 h-5" />
        ぷろふ
      </h1>

      {/* プロフィールカード */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[var(--color-surface)] flex items-center justify-center border border-[var(--color-border)]">
            <User className="w-7 h-7 text-[var(--color-text-muted)]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold">{profile.displayName}</h2>
              <button
                onClick={() => {
                  setNewName(profile.displayName);
                  setShowNameModal(true);
                }}
                className="p-1 rounded-[5px] hover:bg-[var(--color-surface)]"
              >
                <Pencil className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">{profile.email}</p>
          </div>
        </div>
      </Card>

      {/* スコア */}
      <Card>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          スコア
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-2xl font-black">{profile.totalScore}</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">せいかい</p>
          </div>
          <div>
            <p className="text-2xl font-black">{profile.totalAnswered}</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">かいとう</p>
          </div>
          <div>
            <p className="text-2xl font-black">{accuracy}%</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">せいかいりつ</p>
          </div>
        </div>
      </Card>

      {/* 投稿クイズ */}
      <Card>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          投稿したクイズ
        </h3>
        {loadingQuizzes ? (
          <Loading text="読み込み中..." />
        ) : myQuizzes.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
            まだクイズを投稿していません
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {myQuizzes.map((quiz) => (
              <motion.div
                key={quiz.id}
                className="flex-shrink-0 w-24"
                whileHover={{ scale: 1.05 }}
              >
                <div className="relative w-24 h-24 rounded-[5px] overflow-hidden border border-[var(--color-border)] bg-white">
                  <Image
                    src={quiz.imageUrl}
                    alt={quiz.answer}
                    fill
                    className="object-contain p-1"
                    sizes="96px"
                  />
                  <button
                    onClick={() => quiz.id && handleDeleteQuiz(quiz.id)}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-white/80 rounded-full"
                  >
                    <Trash2 className="w-3 h-3 text-[var(--color-incorrect)]" />
                  </button>
                </div>
                <p className="text-[9px] text-center mt-0.5 truncate">{quiz.answer}</p>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* メニュー */}
      <Card padding={false}>
        <MenuLink icon={FileText} label="利用規約" href="#" />
        <MenuLink icon={Shield} label="プライバシーポリシー" href="#" border={false} />
      </Card>

      {/* ログアウト */}
      <Button onClick={handleLogout} variant="ghost" fullWidth>
        <LogOut className="w-4 h-4" />
        ログアウト
      </Button>

      {/* 表示名変更モーダル */}
      <Modal
        isOpen={showNameModal}
        onClose={() => setShowNameModal(false)}
        title="表示名を変更"
      >
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="input-field mb-3"
          placeholder="新しい表示名"
          maxLength={20}
          minLength={2}
        />
        <Button onClick={handleUpdateName} fullWidth loading={saving}>
          変更する
        </Button>
      </Modal>
    </div>
  );
}

// メニューリンクコンポーネント
function MenuLink({
  icon: Icon,
  label,
  href,
  border = true,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  border?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface)] transition-colors ${
        border ? 'border-b border-[var(--color-border)]' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-[var(--color-text-muted)]" />
        <span className="text-sm">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
    </a>
  );
}
