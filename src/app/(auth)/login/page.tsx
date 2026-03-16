'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import Button from '@/components/ui/Button';
import { logIn } from '@/lib/firebase/auth';
import { useAuthStore } from '@/stores/authStore';
import { getAdminSettings } from '@/lib/firebase/firestore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 管理者ログインチェック
      const adminSettings = await getAdminSettings();
      const adminId = adminSettings?.adminId ?? 'admin';
      const adminPass = adminSettings?.adminPassword ?? 'admin';

      if (email === adminId && password === adminPass) {
        sessionStorage.setItem('nami-admin', 'true');
        router.push('/admin');
        return;
      }

      await logIn(email, password);
      await refreshProfile();
      router.push('/play');
    } catch {
      setError('メールアドレスまたはパスワードが正しくありません');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center"
    >
      {/* ロゴ */}
      <div className="mb-6">
        <Image
          src="/logo.png"
          alt="なみ画伯"
          width={280}
          height={280}
          priority
        />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        <div>
          <label className="block text-xs font-bold mb-1 text-[var(--color-text-secondary)]">
            メールアドレス
          </label>
          <input
            type="text"
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
            placeholder="パスワードを入力"
            required
          />
        </div>

        {error && (
          <p className="text-xs text-[var(--color-incorrect)] bg-[var(--color-incorrect-bg)] p-2 rounded-[5px]">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth loading={loading}>
          <LogIn className="w-4 h-4" />
          ログイン
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link
          href="/signup"
          className="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]"
        >
          アカウントを作成する
        </Link>
      </div>
    </motion.div>
  );
}
