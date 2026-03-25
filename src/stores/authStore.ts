// 認証ストア（Zustand）
import { create } from 'zustand';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserProfile } from '@/lib/firebase/firestore';
import type { UserProfile } from '@/types';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  refreshProfile: () => Promise<void>;
  initialize: () => () => void;  // unsubscribe関数を返す
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  refreshProfile: async () => {
    const { user } = get();
    if (!user) {
      set({ profile: null });
      return;
    }
    const profile = await getUserProfile(user.uid);
    set({ profile });
  },

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      set({ user, loading: true });
      if (user) {
        // トークンを強制リフレッシュしてセッション切れを防止
        try {
          await user.getIdToken(true);
        } catch (err) {
          console.warn('トークンリフレッシュ失敗:', err);
        }
        const profile = await getUserProfile(user.uid);
        set({ profile, loading: false, initialized: true });
      } else {
        set({ profile: null, loading: false, initialized: true });
      }
    });
    return unsubscribe;
  },
}));
