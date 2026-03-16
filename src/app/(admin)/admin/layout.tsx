'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Loading from '@/components/ui/Loading';

// 管理者認証ガード: sessionStorageにフラグがなければログインに戻す
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem('nami-admin');
    if (isAdmin === 'true') {
      setAuthorized(true);
    } else {
      router.replace('/login');
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-2xl px-4 py-4">
        {children}
      </div>
    </main>
  );
}
