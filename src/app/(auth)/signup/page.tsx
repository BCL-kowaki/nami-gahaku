'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import Button from '@/components/ui/Button';
import { signUp } from '@/lib/firebase/auth';
import { useAuthStore } from '@/stores/authStore';

export default function SignupPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

    setLoading(true);

    try {
      await signUp(email, password, displayName);
      await refreshProfile();
      router.push('/play');
    } catch {
      setError('アカウントの作成に失敗しました。別のメールアドレスをお試しください。');
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
            メールアドレス
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="email@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">
            パスワード
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="6文字以上"
            required
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">
            パスワード（確認）
          </label>
          <input
            type="password"
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
