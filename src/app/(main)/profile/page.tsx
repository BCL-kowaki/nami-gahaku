'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, LogOut, Pencil, ChevronRight, Shield, FileText,
  BarChart3, ImageIcon, Trash2, Eye, EyeOff, Save,
  Check, Users, Target,
} from 'lucide-react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Loading from '@/components/ui/Loading';
import { useAuthStore } from '@/stores/authStore';
import { logOut, changeEmail, changePassword } from '@/lib/firebase/auth';
import {
  getUserQuizzes, updateUserProfile, deleteQuiz, updateQuiz, getQuizStats,
} from '@/lib/firebase/firestore';
import type { Quiz, QuizCategory } from '@/types';

const CATEGORIES: QuizCategory[] = [
  'どうぶつ', 'たべもの', 'のりもの', 'しぜん',
  'にちようひん', 'たてもの', 'キャラクター', 'スポーツ', 'その他',
];

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const router = useRouter();

  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  // プロフィール編集モーダル
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // メールアドレス変更モーダル
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // パスワード変更モーダル
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

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

  // ログアウト
  const handleLogout = async () => {
    await logOut();
    router.replace('/login');
  };

  // プロフィール（ニックネーム・誕生日）更新
  const handleUpdateProfile = async () => {
    if (!user || !editName.trim()) return;
    if (editName.trim().length < 2 || editName.trim().length > 20) {
      setError('ニックネームは2〜20文字で入力してください');
      return;
    }
    setSavingProfile(true);
    setError('');
    try {
      await updateUserProfile(user.uid, {
        displayName: editName.trim(),
        birthday: editBirthday || undefined,
      });
      await refreshProfile();
      setShowProfileModal(false);
      showMessage('プロフィールを更新しました');
    } catch (err) {
      console.error('プロフィール更新エラー:', err);
      setError('更新に失敗しました');
    } finally {
      setSavingProfile(false);
    }
  };

  // メールアドレス変更
  const handleUpdateEmail = async () => {
    if (!editEmail.trim()) return;
    setSavingEmail(true);
    setError('');
    try {
      await changeEmail(editEmail.trim());
      if (user) {
        await updateUserProfile(user.uid, { email: editEmail.trim() });
      }
      await refreshProfile();
      setShowEmailModal(false);
      showMessage('メールアドレスを変更しました');
    } catch (err) {
      console.error('メール変更エラー:', err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('requires-recent-login')) {
        setError('セキュリティのため、再ログインしてから変更してください');
      } else {
        setError('メールアドレスの変更に失敗しました');
      }
    } finally {
      setSavingEmail(false);
    }
  };

  // パスワード変更
  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }
    setSavingPassword(true);
    setError('');
    try {
      await changePassword(newPassword);
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      showMessage('パスワードを変更しました');
    } catch (err) {
      console.error('パスワード変更エラー:', err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('requires-recent-login')) {
        setError('セキュリティのため、再ログインしてから変更してください');
      } else {
        setError('パスワードの変更に失敗しました');
      }
    } finally {
      setSavingPassword(false);
    }
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
    } catch (err) {
      console.error('クイズ削除エラー:', err);
    }
  };

  // 統計モーダルを開く
  const openStats = (quiz: Quiz) => {
    setStatsQuiz(quiz);
    setShowStatsModal(true);
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

      {/* プロフィールカード */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[var(--color-surface)] flex items-center justify-center border border-[var(--color-border)]">
            <User className="w-7 h-7 text-[var(--color-text-muted)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold truncate">{profile.displayName}</h2>
            <p className="text-xs text-[var(--color-text-muted)] truncate">{profile.email}</p>
            {profile.birthday && (
              <p className="text-xs text-[var(--color-text-muted)]">🎂 {profile.birthday}</p>
            )}
          </div>
          <button
            onClick={() => {
              setEditName(profile.displayName);
              setEditBirthday(profile.birthday || '');
              setError('');
              setShowProfileModal(true);
            }}
            className="p-2 rounded-[5px] hover:bg-[var(--color-surface)] transition-colors"
          >
            <Pencil className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
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
          <div className="flex flex-col gap-2">
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
      </Card>

      {/* アカウント設定 */}
      <Card padding={false}>
        <button
          onClick={() => { setEditEmail(profile.email); setError(''); setShowEmailModal(true); }}
          className="flex items-center justify-between w-full px-4 py-3 hover:bg-[var(--color-surface)] transition-colors border-b border-[var(--color-border)]"
        >
          <div className="flex items-center gap-3">
            <Pencil className="w-4 h-4 text-[var(--color-text-muted)]" />
            <span className="text-sm">メールアドレスの変更</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
        <button
          onClick={() => { setNewPassword(''); setConfirmPassword(''); setError(''); setShowPasswordModal(true); }}
          className="flex items-center justify-between w-full px-4 py-3 hover:bg-[var(--color-surface)] transition-colors border-b border-[var(--color-border)]"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-[var(--color-text-muted)]" />
            <span className="text-sm">パスワードの変更</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
        <a href="#" className="flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface)] transition-colors border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-[var(--color-text-muted)]" />
            <span className="text-sm">利用規約</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
        </a>
        <a href="#" className="flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface)] transition-colors">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-[var(--color-text-muted)]" />
            <span className="text-sm">プライバシーポリシー</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
        </a>
      </Card>

      {/* ログアウト */}
      <Button onClick={handleLogout} variant="ghost" fullWidth>
        <LogOut className="w-4 h-4" />
        ログアウト
      </Button>

      {/* === モーダル群 === */}

      {/* プロフィール編集 */}
      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="プロフィール編集">
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">ニックネーム</label>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
              className="input-field" placeholder="ニックネーム（2〜20文字）" maxLength={20} minLength={2} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">誕生日</label>
            <input type="date" value={editBirthday} onChange={(e) => setEditBirthday(e.target.value)} className="input-field" />
          </div>
          {error && <p className="text-xs text-[var(--color-incorrect)] bg-[var(--color-incorrect-bg)] p-2 rounded-[5px]">{error}</p>}
          <Button onClick={handleUpdateProfile} fullWidth loading={savingProfile}>
            <Save className="w-4 h-4" />保存する
          </Button>
        </div>
      </Modal>

      {/* メールアドレス変更 */}
      <Modal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} title="メールアドレスの変更">
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">新しいメールアドレス</label>
            <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
              className="input-field" placeholder="example@mail.com" />
          </div>
          {error && <p className="text-xs text-[var(--color-incorrect)] bg-[var(--color-incorrect-bg)] p-2 rounded-[5px]">{error}</p>}
          <Button onClick={handleUpdateEmail} fullWidth loading={savingEmail}>
            <Save className="w-4 h-4" />変更する
          </Button>
        </div>
      </Modal>

      {/* パスワード変更 */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="パスワードの変更">
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">新しいパスワード</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} className="input-field pr-10" placeholder="6文字以上" minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">パスワード確認</label>
            <input type={showPassword ? 'text' : 'password'} value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} className="input-field" placeholder="もう一度入力" />
          </div>
          {error && <p className="text-xs text-[var(--color-incorrect)] bg-[var(--color-incorrect-bg)] p-2 rounded-[5px]">{error}</p>}
          <Button onClick={handleUpdatePassword} fullWidth loading={savingPassword}>
            <Save className="w-4 h-4" />変更する
          </Button>
        </div>
      </Modal>

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
