'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

// Auth初期化フック（ルートlayoutで1回だけ呼ぶ）
export function useAuthInit() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);
}
