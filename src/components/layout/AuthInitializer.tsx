'use client';

import { useAuthInit } from '@/hooks/useAuthInit';

// Auth状態監視を初期化するクライアントコンポーネント
export default function AuthInitializer() {
  useAuthInit();
  return null;
}
