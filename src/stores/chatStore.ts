// チャット状態ストア（Zustand）- 複数ルーム対応
import { create } from 'zustand';
import type { ChatMessage, ChatRoom } from '@/types';

interface ChatState {
  // ルーム管理
  rooms: ChatRoom[];
  currentRoomId: string | null;
  // メッセージ
  messages: ChatMessage[];
  isLoading: boolean;
  // ビュー管理
  view: 'list' | 'chat';

  // ルーム操作
  setRooms: (rooms: ChatRoom[]) => void;
  setCurrentRoomId: (roomId: string | null) => void;
  // メッセージ操作
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (msg: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
  // ビュー操作
  setView: (view: 'list' | 'chat') => void;
  // リセット
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  currentRoomId: null,
  messages: [],
  isLoading: false,
  view: 'list',

  setRooms: (rooms) => set({ rooms }),
  setCurrentRoomId: (roomId) => set({ currentRoomId: roomId }),

  setMessages: (messages) => set({ messages }),
  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  clearMessages: () => set({ messages: [] }),

  setView: (view) => set({ view }),

  reset: () => set({
    rooms: [],
    currentRoomId: null,
    messages: [],
    isLoading: false,
    view: 'list',
  }),
}));
