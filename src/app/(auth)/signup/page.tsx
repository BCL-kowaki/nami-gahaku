'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import Button from '@/components/ui/Button';
import { signUp } from '@/lib/firebase/auth';
import { useAuthStore } from '@/stores/authStore';

export default function SignupPage() {
  const [displayName, setDisplayName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (displayName.length < 2 || displayName.length > 20) {
      setError('表示名は2〜20文字で入力してください');
      return;
    }

    // IDバリデーション: 英数字6文字以上（メールアドレスもOK）
    if (!loginId.includes('@') && !/^[a-zA-Z0-9]{6,}$/.test(loginId)) {
      setError('IDは英数字6文字以上で入力してください');
      return;
    }

    setLoading(true);

    try {
      await signUp(loginId, password, displayName, birthday || undefined);
      await refreshProfile();
      router.push('/play');
    } catch {
      setError('アカウントの作成に失敗しました。別のIDをお試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      {/* タイトル */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-black mb-1">アカウント作成</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          なみ画伯の世界へようこそ！
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">
            表示名
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input-field"
            placeholder="なみ太郎"
            required
            minLength={2}
            maxLength={20}
          />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">
            誕生日
          </label>
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="input-field"
          />
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
            占い機能で使うよ！（あとから設定もできます）
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">
            ID
          </label>
          <input
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="input-field"
            placeholder="英数字6文字以上"
            required
            autoCapitalize="none"
            autoCorrect="off"
          />
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
            ログインに使います（メールアドレスでもOK）
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">
            パスワード
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field pr-10"
              placeholder="6文字以上"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">
            パスワード（確認）
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field"
            placeholder="もう一度入力"
            required
            minLength={6}
          />
        </div>

        {error && (
          <p className="text-xs text-[var(--color-incorrect)] bg-[var(--color-incorrect-bg)] p-2 rounded-[5px]">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth loading={loading}>
          <UserPlus className="w-4 h-4" />
          アカウントを作成
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link
          href="/login"
          className="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]"
        >
          すでにアカウントをお持ちの方
        </Link>
      </div>
    </motion.div>
  );
}
