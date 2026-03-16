'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, ImageIcon, Settings, LogOut, Pencil,
  Check, Eye, EyeOff, Save, BarChart3, AlertTriangle,
  Upload, ArrowLeft, ArrowRight, Send,
} from 'lucide-react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Loading from '@/components/ui/Loading';
import {
  getAllUsers,
  getAllQuizzesAdmin,
  getQuizStats,
  getAdminSettings,
  updateAdminSettings,
  updateQuiz,
  createQuiz,
  migrateExistingQuizzesToOfficial,
  type AdminSettings,
} from '@/lib/firebase/firestore';
import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { UserProfile, Quiz, QuizCategory } from '@/types';

type Tab = 'users' | 'quizzes' | 'create' | 'settings';

const CATEGORIES: QuizCategory[] = [
  'どうぶつ', 'たべもの', 'のりもの', 'しぜん',
  'にちようひん', 'たてもの', 'キャラクター', 'スポーツ', 'その他',
];

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('users');

  // ユーザー一覧
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // クイズ一覧
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  // 設定
  const [adminId, setAdminId] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // クイズ作成
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [processedImage, setProcessedImage] = useState('');
  const [createAnswer, setCreateAnswer] = useState('');
  const [createCategory, setCreateCategory] = useState<QuizCategory>('その他');
  const [createDummies, setCreateDummies] = useState(['', '', '']);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

  // メッセージ
  const [successMsg, setSuccessMsg] = useState('');

  // マイグレーション
  const [migrating, setMigrating] = useState(false);

  const showMessage = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // データ取得
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('ユーザー取得エラー:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchQuizzes = useCallback(async () => {
    setLoadingQuizzes(true);
    try {
      const data = await getAllQuizzesAdmin();
      setQuizzes(data);
    } catch (err) {
      console.error('クイズ取得エラー:', err);
    } finally {
      setLoadingQuizzes(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const settings = await getAdminSettings();
      if (settings) {
        setAdminId(settings.adminId);
        setAdminPassword(settings.adminPassword);
      }
    } catch (err) {
      console.error('設定取得エラー:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchQuizzes();
    fetchSettings();
  }, [fetchUsers, fetchQuizzes, fetchSettings]);

  // 設定保存
  const handleSaveSettings = async () => {
    if (!adminId.trim() || !adminPassword.trim()) return;
    setSavingSettings(true);
    try {
      await updateAdminSettings({
        adminId: adminId.trim(),
        adminPassword: adminPassword.trim(),
      });
      showMessage('管理者設定を更新しました');
    } catch (err) {
      console.error('設定更新エラー:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  // クイズ表示/非表示切り替え
  const handleToggleQuizHidden = async (quizId: string, currentHidden: boolean) => {
    try {
      await updateQuiz(quizId, { isHidden: !currentHidden });
      setQuizzes(prev => prev.map(q =>
        q.id === quizId ? { ...q, isHidden: !currentHidden } : q
      ));
      showMessage(currentHidden ? 'クイズを表示しました' : 'クイズを非表示にしました');
    } catch (err) {
      console.error('クイズ更新エラー:', err);
    }
  };

  // 既存クイズを公式に一括変換
  const handleMigrateToOfficial = async () => {
    setMigrating(true);
    try {
      const count = await migrateExistingQuizzesToOfficial();
      showMessage(`${count}件のクイズを公式に変換しました`);
      fetchQuizzes();
    } catch (err) {
      console.error('マイグレーションエラー:', err);
    } finally {
      setMigrating(false);
    }
  };

  // ログアウト
  const handleLogout = () => {
    sessionStorage.removeItem('nami-admin');
    router.replace('/login');
  };

  // === クイズ作成関連 ===

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setCreateError('画像は2MB以下にしてください');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setCreateError('');
  };

  const handleProcessImage = async () => {
    if (!imageFile) return;
    setCreateLoading(true);
    setCreateError('');
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      const res = await fetch('/api/image/process', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setProcessedImage(`data:image/png;base64,${data.data.processedImageBase64}`);
        setCreateStep(2);
      } else {
        setCreateError(data.error || '画像処理に失敗しました');
      }
    } catch {
      setCreateError('画像処理に失敗しました');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreateSubmit = async () => {
    if (!createAnswer || createDummies.some(d => !d)) {
      setCreateError('すべての項目を入力してください');
      return;
    }
    setCreateLoading(true);
    setCreateError('');
    try {
      // 公式用ディレクトリにアップロード
      const base64Data = processedImage.replace(/^data:image\/\w+;base64,/, '');
      const byteString = atob(base64Data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: 'image/png' });

      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
      const storageRef = ref(storage, `official-images/${fileName}`);
      await uploadBytes(storageRef, blob, { contentType: 'image/png' });
      const imageUrl = await getDownloadURL(storageRef);

      // 公式クイズとして作成
      await createQuiz({
        imageUrl,
        originalImageUrl: imagePreview,
        answer: createAnswer,
        category: createCategory,
        dummyChoices: createDummies as [string, string, string],
        creatorUid: 'official',
        creatorName: 'nami【公式】',
        isOfficial: true,
        themeId: null,
      });

      setCreateSuccess(true);
      fetchQuizzes();
    } catch {
      setCreateError('クイズの作成に失敗しました');
    } finally {
      setCreateLoading(false);
    }
  };

  const resetCreateForm = () => {
    setCreateStep(1);
    setImageFile(null);
    setImagePreview('');
    setProcessedImage('');
    setCreateAnswer('');
    setCreateCategory('その他');
    setCreateDummies(['', '', '']);
    setCreateError('');
    setCreateSuccess(false);
  };

  // タブ定義
  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: 'users', label: 'ユーザー', icon: Users },
    { key: 'quizzes', label: 'クイズ', icon: ImageIcon },
    { key: 'create', label: 'つくる', icon: Pencil },
    { key: 'settings', label: '設定', icon: Settings },
  ];

  // 統計サマリー
  const totalQuizAnswers = quizzes.reduce((sum, q) => {
    const stats = getQuizStats(q);
    return sum + stats.totalAnswered;
  }, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black flex items-center gap-2">
          <Shield className="w-5 h-5" />
          管理者パネル
        </h1>
        <button
          onClick={handleLogout}
          className="p-2 rounded-[5px] hover:bg-[var(--color-surface)] transition-colors"
        >
          <LogOut className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
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

      {/* サマリー */}
      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-2xl font-black">{users.length}</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">ユーザー数</p>
          </div>
          <div>
            <p className="text-2xl font-black">{quizzes.length}</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">クイズ数</p>
          </div>
          <div>
            <p className="text-2xl font-black">{totalQuizAnswers}</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">総回答数</p>
          </div>
        </div>
      </Card>

      {/* タブ */}
      <div className="flex border-b border-[var(--color-border)]">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold transition-colors relative ${
              activeTab === key
                ? 'text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {activeTab === key && (
              <motion.div
                layoutId="adminTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-text-primary)]"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* タブ内容 */}
      <AnimatePresence mode="wait">
        {/* ================= ユーザー一覧 ================= */}
        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
            {loadingUsers ? (
              <Loading text="ユーザーを読み込み中..." />
            ) : users.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-8">登録ユーザーがいません</p>
            ) : (
              <>
                <p className="text-xs text-[var(--color-text-muted)]">{users.length}人のユーザー</p>
                {users.map((u) => {
                  const userAccuracy = u.totalAnswered > 0 ? Math.round((u.totalScore / u.totalAnswered) * 100) : 0;
                  return (
                    <Card key={u.uid}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center border border-[var(--color-border)] flex-shrink-0">
                          <Users className="w-5 h-5 text-[var(--color-text-muted)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{u.displayName}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)] truncate">{u.email}</p>
                          {u.birthday && <p className="text-[10px] text-[var(--color-text-muted)]">🎂 {u.birthday}</p>}
                          <div className="flex gap-3 mt-1.5">
                            <span className="text-[10px] text-[var(--color-text-muted)]">正解 <span className="font-bold text-[var(--color-text-primary)]">{u.totalScore}</span></span>
                            <span className="text-[10px] text-[var(--color-text-muted)]">回答 <span className="font-bold text-[var(--color-text-primary)]">{u.totalAnswered}</span></span>
                            <span className="text-[10px] text-[var(--color-text-muted)]">正解率 <span className="font-bold text-[var(--color-text-primary)]">{userAccuracy}%</span></span>
                          </div>
                          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                            登録: {u.createdAt?.toDate?.()?.toLocaleDateString('ja-JP') ?? '不明'}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </>
            )}
          </motion.div>
        )}

        {/* ================= クイズ一覧 ================= */}
        {activeTab === 'quizzes' && (
          <motion.div key="quizzes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
            {loadingQuizzes ? (
              <Loading text="クイズを読み込み中..." />
            ) : quizzes.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-8">投稿クイズがありません</p>
            ) : (
              <>
                <p className="text-xs text-[var(--color-text-muted)]">{quizzes.length}件のクイズ（非表示含む）</p>
                {quizzes.map((quiz) => {
                  const stats = getQuizStats(quiz);
                  const isHidden = quiz.isHidden ?? false;
                  return (
                    <div
                      key={quiz.id}
                      className={`flex items-center gap-3 p-2 rounded-[5px] border bg-white ${
                        isHidden ? 'border-[var(--color-incorrect)] opacity-60' : 'border-[var(--color-border)]'
                      }`}
                    >
                      <div className="relative w-14 h-14 flex-shrink-0 rounded-[5px] overflow-hidden border border-[var(--color-border)] bg-white">
                        <Image src={quiz.imageUrl} alt={quiz.answer} fill className="object-contain p-0.5" sizes="56px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold truncate">{quiz.answer}</p>
                          {quiz.isOfficial && (
                            <span className="text-[8px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-bold flex-shrink-0">公式</span>
                          )}
                          {isHidden && (
                            <span className="text-[8px] bg-[var(--color-incorrect-bg)] text-[var(--color-incorrect)] px-1 py-0.5 rounded font-bold flex-shrink-0">非表示</span>
                          )}
                          {(quiz.reportCount ?? 0) > 0 && (
                            <span className="text-[8px] bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded font-bold flex-shrink-0 flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />{quiz.reportCount}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                          {quiz.category} ・ {quiz.creatorName} ・ 回答{stats.totalAnswered}件 ・ 正解率{stats.accuracy}%
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                          投稿: {quiz.createdAt?.toDate?.()?.toLocaleDateString('ja-JP') ?? '不明'}
                        </p>
                      </div>
                      <button
                        onClick={() => quiz.id && handleToggleQuizHidden(quiz.id, isHidden)}
                        className="p-1.5 rounded-[5px] hover:bg-[var(--color-surface)] transition-colors flex-shrink-0"
                        title={isHidden ? '表示する' : '非表示にする'}
                      >
                        {isHidden ? <Eye className="w-4 h-4 text-[var(--color-text-muted)]" /> : <EyeOff className="w-4 h-4 text-[var(--color-text-muted)]" />}
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </motion.div>
        )}

        {/* ================= クイズ作成（公式） ================= */}
        {activeTab === 'create' && (
          <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            {createSuccess ? (
              <div className="flex flex-col items-center justify-center gap-4 pt-8 animate-fade-in-up">
                <div className="w-16 h-16 rounded-full bg-[var(--color-correct-bg)] flex items-center justify-center">
                  <Check className="w-8 h-8 text-[var(--color-correct)]" />
                </div>
                <h2 className="text-lg font-black">公式クイズを投稿しました！</h2>
                <p className="text-sm text-[var(--color-text-secondary)] text-center">
                  ©︎ nami【公式】 として表示されます
                </p>
                <Button onClick={resetCreateForm} variant="outline">もう1問つくる</Button>
              </div>
            ) : (
              <>
                {/* ステップインジケーター */}
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold">公式クイズ作成</h2>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((s) => (
                      <div key={s} className={`w-8 h-1 rounded-full ${s <= createStep ? 'bg-[var(--color-text-primary)]' : 'bg-[var(--color-border)]'}`} />
                    ))}
                  </div>
                </div>

                {/* Step1: 画像アップロード */}
                {createStep === 1 && (
                  <div className="flex flex-col gap-4">
                    <Card className="text-center">
                      <h3 className="font-bold mb-3">えをアップロード</h3>
                      <label className="block border-2 border-dashed border-[var(--color-border)] rounded-[5px] p-8 cursor-pointer hover:border-[var(--color-text-muted)] transition-colors">
                        {imagePreview ? (
                          <div className="relative w-full aspect-square max-w-[200px] mx-auto">
                            <Image src={imagePreview} alt="アップロード画像" fill className="object-contain" sizes="200px" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                            <Upload className="w-10 h-10" />
                            <p className="text-sm">タップして画像を選択</p>
                            <p className="text-xs">JPEG / PNG（2MB以下）</p>
                          </div>
                        )}
                        <input type="file" accept="image/jpeg,image/png" onChange={handleImageSelect} className="hidden" />
                      </label>
                    </Card>
                    {createError && (
                      <p className="text-xs text-[var(--color-incorrect)] bg-[var(--color-incorrect-bg)] p-2 rounded-[5px]">{createError}</p>
                    )}
                    <Button onClick={handleProcessImage} fullWidth loading={createLoading} disabled={!imageFile}>
                      <ArrowRight className="w-4 h-4" />つぎへ（白黒変換）
                    </Button>
                  </div>
                )}

                {/* Step2: プレビュー */}
                {createStep === 2 && (
                  <div className="flex flex-col gap-4">
                    <Card className="text-center">
                      <h3 className="font-bold mb-3 flex items-center justify-center gap-2">
                        <Eye className="w-4 h-4" />プレビュー
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-[var(--color-text-muted)] mb-1">もとの絵</p>
                          <div className="relative aspect-square bg-[var(--color-surface)] rounded-[5px] overflow-hidden">
                            <Image src={imagePreview} alt="元の画像" fill className="object-contain p-2" sizes="160px" />
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--color-text-muted)] mb-1">変換後</p>
                          <div className="relative aspect-square bg-white rounded-[5px] overflow-hidden border border-[var(--color-border)]">
                            <Image src={processedImage} alt="変換後" fill className="object-contain p-2" sizes="160px" />
                          </div>
                        </div>
                      </div>
                    </Card>
                    <div className="flex gap-2">
                      <Button onClick={() => setCreateStep(1)} variant="outline" className="flex-1">
                        <ArrowLeft className="w-4 h-4" />もどる
                      </Button>
                      <Button onClick={() => setCreateStep(3)} className="flex-1">
                        <ArrowRight className="w-4 h-4" />つぎへ
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step3: クイズ情報入力 */}
                {createStep === 3 && (
                  <div className="flex flex-col gap-4">
                    <Card>
                      <h3 className="font-bold mb-3">クイズ情報</h3>
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">正解（なにを描いた？）</label>
                          <input type="text" value={createAnswer} onChange={(e) => setCreateAnswer(e.target.value)}
                            className="input-field" placeholder="例: ねこ" maxLength={20} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">カテゴリ</label>
                          <div className="flex flex-wrap gap-1.5">
                            {CATEGORIES.map((cat) => (
                              <button key={cat} onClick={() => setCreateCategory(cat)}
                                className={`text-xs px-2.5 py-1 rounded-[5px] border transition-colors ${
                                  createCategory === cat
                                    ? 'bg-[var(--color-text-primary)] text-white border-[var(--color-text-primary)]'
                                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
                                }`}>{cat}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">ダミー選択肢（3つ）</label>
                          {createDummies.map((d, i) => (
                            <input key={i} type="text" value={d}
                              onChange={(e) => { const n = [...createDummies]; n[i] = e.target.value; setCreateDummies(n); }}
                              className="input-field mb-2" placeholder={`ダミー${i + 1}`} maxLength={20} />
                          ))}
                        </div>
                      </div>
                    </Card>
                    {createError && (
                      <p className="text-xs text-[var(--color-incorrect)] bg-[var(--color-incorrect-bg)] p-2 rounded-[5px]">{createError}</p>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={() => setCreateStep(2)} variant="outline" className="flex-1">
                        <ArrowLeft className="w-4 h-4" />もどる
                      </Button>
                      <Button onClick={handleCreateSubmit} loading={createLoading} className="flex-1">
                        <Send className="w-4 h-4" />公式として投稿
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ================= 設定 ================= */}
        {activeTab === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            <Card>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />管理者ログイン設定
              </h3>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">管理者ID</label>
                  <input type="text" value={adminId} onChange={(e) => setAdminId(e.target.value)} className="input-field" placeholder="管理者ID" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">管理者パスワード</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="input-field pr-10" placeholder="パスワード" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button onClick={handleSaveSettings} fullWidth loading={savingSettings}>
                  <Save className="w-4 h-4" />設定を保存
                </Button>
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />システム情報
              </h3>
              <div className="flex flex-col gap-1.5 text-xs text-[var(--color-text-secondary)]">
                <div className="flex justify-between">
                  <span>登録ユーザー数</span>
                  <span className="font-bold text-[var(--color-text-primary)]">{users.length}人</span>
                </div>
                <div className="flex justify-between">
                  <span>投稿クイズ数</span>
                  <span className="font-bold text-[var(--color-text-primary)]">{quizzes.length}件</span>
                </div>
                <div className="flex justify-between">
                  <span>うち公式クイズ</span>
                  <span className="font-bold text-[var(--color-text-primary)]">{quizzes.filter(q => q.isOfficial).length}件</span>
                </div>
                <div className="flex justify-between">
                  <span>非表示クイズ数</span>
                  <span className="font-bold text-[var(--color-text-primary)]">{quizzes.filter(q => q.isHidden).length}件</span>
                </div>
                <div className="flex justify-between">
                  <span>通報ありクイズ</span>
                  <span className="font-bold text-[var(--color-text-primary)]">{quizzes.filter(q => (q.reportCount ?? 0) > 0).length}件</span>
                </div>
                <div className="flex justify-between">
                  <span>総回答数</span>
                  <span className="font-bold text-[var(--color-text-primary)]">{totalQuizAnswers}回</span>
                </div>
              </div>
            </Card>

            {/* 既存クイズ一括公式化 */}
            <Card>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />データ変換
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                既存の全クイズを公式クイズ（©︎ nami【公式】）に一括変換します。
                この操作は一度だけ実行してください。
              </p>
              <Button onClick={handleMigrateToOfficial} variant="outline" fullWidth loading={migrating}>
                <Shield className="w-4 h-4" />
                既存クイズを公式に変換
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
