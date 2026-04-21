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
        // トークンをキャッシュから取得（強制リフレッシュしない）
        // 強制リフレッシュだとネットワーク障害時にセッション切れと判定される可能性があるため
        try {
          await user.getIdToken(false);
        } catch (err) {
          console.warn('トークン取得失敗（セッションは維持）:', err);
        }
        try {
          const profile = await getUserProfile(user.uid);
          set({ profile, loading: false, initialized: true });
        } catch (profileErr) {
          // プロフィール取得失敗してもユーザーはログイン状態を維持
          console.warn('プロフィール取得失敗（セッションは維持）:', profileErr);
          set({ loading: false, initialized: true });
        }
      } else {
        set({ profile: null, loading: false, initialized: true });
      }
    });
    return unsubscribe;
  },
}));
