'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Upload, Eye, Send, Dice5, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { createQuiz } from '@/lib/firebase/firestore';
import type { QuizCategory } from '@/types';

const CATEGORIES: QuizCategory[] = [
  'どうぶつ', 'たべもの', 'のりもの', 'しぜん',
  'にちようひん', 'たてもの', 'キャラクター', 'スポーツ', 'その他',
];

type Step = 1 | 2 | 3;

export default function CreatePage() {
  const [step, setStep] = useState<Step>(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [processedImage, setProcessedImage] = useState<string>('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState<QuizCategory>('その他');
  const [dummies, setDummies] = useState(['', '', '']);
  const [theme, setTheme] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  // お題ボタン
  const handleRandomTheme = async () => {
    try {
      const res = await fetch('/api/theme/random');
      const data = await res.json();
      if (data.success) {
        setTheme(data.data.name);
        setAnswer(data.data.name);
        setCategory(data.data.category);
      }
    } catch {
      // お題取得失敗時は何もしない
    }
  };

  // 画像選択
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 2MB制限チェック
    if (file.size > 2 * 1024 * 1024) {
      setError('画像は2MB以下にしてください');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setError('');
  };

  // Step1→Step2: 画像処理
  const handleProcessImage = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const res = await fetch('/api/image/process', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        // 改善案6: Base64で返してプレビュー表示
        setProcessedImage(`data:image/png;base64,${data.data.processedImageBase64}`);
        setStep(2);
      } else {
        setError(data.error || '画像処理に失敗しました');
      }
    } catch {
      setError('画像処理に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // Step3: クイズ投稿
  const handleSubmit = async () => {
    if (!user || !profile) return;
    if (!answer || dummies.some((d) => !d)) {
      setError('すべての項目を入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 画像をStorageにアップロード
      const uploadRes = await fetch('/api/image/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: processedImage.replace(/^data:image\/\w+;base64,/, ''),
          uid: user.uid,
        }),
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        setError('画像のアップロードに失敗しました');
        return;
      }

      // クイズ作成
      await createQuiz({
        imageUrl: uploadData.data.url,
        originalImageUrl: imagePreview,
        answer,
        category,
        dummyChoices: dummies as [string, string, string],
        creatorUid: user.uid,
        creatorName: profile.displayName,
        isOfficial: false,
        themeId: theme || null,
      });

      setSuccess(true);
    } catch {
      setError('クイズの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 投稿成功
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-12 animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-[var(--color-correct-bg)] flex items-center justify-center">
          <Check className="w-8 h-8 text-[var(--color-correct)]" />
        </div>
        <h2 className="text-lg font-black">クイズを投稿しました！</h2>
        <p className="text-sm text-[var(--color-text-secondary)] text-center">
          みんながあなたのクイズに挑戦できるようになりました
        </p>
        <Button
          onClick={() => {
            setStep(1);
            setImageFile(null);
            setImagePreview('');
            setProcessedImage('');
            setAnswer('');
            setCategory('その他');
            setDummies(['', '', '']);
            setTheme('');
            setSuccess(false);
          }}
          variant="outline"
        >
          もう1問つくる
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black flex items-center gap-2">
          <Pencil className="w-5 h-5" />
          つくる
        </h1>
        <div className="flex gap-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-8 h-1 rounded-full ${
                s <= step ? 'bg-[var(--color-text-primary)]' : 'bg-[var(--color-border)]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ステップ1: 画像アップロード */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4"
          >
            <Card className="text-center">
              <h2 className="font-bold mb-3">えをアップロード</h2>

              {/* お題ボタン */}
              <Button onClick={handleRandomTheme} variant="outline" className="mb-4">
                <Dice5 className="w-4 h-4" />
                お題をもらう
              </Button>

              {theme && (
                <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                  お題: <span className="font-bold text-[var(--color-text-primary)]">{theme}</span>
                </p>
              )}

              {/* アップロードエリア */}
              <label className="block border-2 border-dashed border-[var(--color-border)] rounded-[5px] p-8 cursor-pointer hover:border-[var(--color-text-muted)] transition-colors">
                {imagePreview ? (
                  <div className="relative w-full aspect-square max-w-[200px] mx-auto">
                    <Image
                      src={imagePreview}
                      alt="アップロード画像"
                      fill
                      className="object-contain"
                      sizes="200px"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                    <Upload className="w-10 h-10" />
                    <p className="text-sm">タップして画像を選択</p>
                    <p className="text-xs">JPEG / PNG（2MB以下）</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            </Card>

            {error && (
              <p className="text-xs text-[var(--color-incorrect)] bg-[var(--color-incorrect-bg)] p-2 rounded-[5px]">
                {error}
              </p>
            )}

            <Button
              onClick={handleProcessImage}
              fullWidth
              loading={loading}
              disabled={!imageFile}
            >
              <ArrowRight className="w-4 h-4" />
              つぎへ（白黒変換）
            </Button>
          </motion.div>
        )}

        {/* ステップ2: プレビュー確認 */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4"
          >
            <Card className="text-center">
              <h2 className="font-bold mb-3 flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" />
                プレビュー
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-[var(--color-text-muted)] mb-1">もとの絵</p>
                  <div className="relative aspect-square bg-[var(--color-surface)] rounded-[5px] overflow-hidden">
                    <Image
                      src={imagePreview}
                      alt="元の画像"
                      fill
                      className="object-contain p-2"
                      sizes="160px"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--color-text-muted)] mb-1">変換後</p>
                  <div className="relative aspect-square bg-white rounded-[5px] overflow-hidden border border-[var(--color-border)]">
                    <Image
                      src={processedImage}
                      alt="変換後の画像"
                      fill
                      className="object-contain p-2"
                      sizes="160px"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex gap-2">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                <ArrowLeft className="w-4 h-4" />
                もどる
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                <ArrowRight className="w-4 h-4" />
                つぎへ
              </Button>
            </div>
          </motion.div>
        )}

        {/* ステップ3: クイズ情報入力 */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4"
          >
            <Card>
              <h2 className="font-bold mb-3">クイズ情報</h2>

              <div className="flex flex-col gap-3">
                {/* 正解名 */}
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">
                    正解（なにを描いた？）
                  </label>
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="input-field"
                    placeholder="例: ねこ"
                    maxLength={20}
                  />
                </div>

                {/* カテゴリ */}
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">
                    カテゴリ
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`text-xs px-2.5 py-1 rounded-[5px] border transition-colors ${
                          category === cat
                            ? 'bg-[var(--color-text-primary)] text-white border-[var(--color-text-primary)]'
                            : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ダミー選択肢 */}
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">
                    ダミー選択肢（3つ）
                  </label>
                  {dummies.map((d, i) => (
                    <input
                      key={i}
                      type="text"
                      value={d}
                      onChange={(e) => {
                        const newDummies = [...dummies];
                        newDummies[i] = e.target.value;
                        setDummies(newDummies);
                      }}
                      className="input-field mb-2"
                      placeholder={`ダミー${i + 1}: 例: いぬ`}
                      maxLength={20}
                    />
                  ))}
                </div>
              </div>
            </Card>

            {error && (
              <p className="text-xs text-[var(--color-incorrect)] bg-[var(--color-incorrect-bg)] p-2 rounded-[5px]">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button onClick={() => setStep(2)} variant="outline" className="flex-1">
                <ArrowLeft className="w-4 h-4" />
                もどる
              </Button>
              <Button onClick={handleSubmit} loading={loading} className="flex-1">
                <Send className="w-4 h-4" />
                投稿する
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
