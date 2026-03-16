'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Send, Trash2, Paintbrush, Loader2,
  Plus, ArrowLeft, ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Loading from '@/components/ui/Loading';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  getChatRooms,
  createChatRoom,
  deleteChatRoom,
  updateChatRoom,
  getChatMessages,
  saveChatMessage,
  getUserMemoryText,
  addUserMemory,
} from '@/lib/firebase/firestore';
import type { ChatMessage, ChatRoom } from '@/types';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    rooms, currentRoomId, messages, isLoading, view,
    setRooms, setCurrentRoomId, setMessages, addMessage,
    setLoading, clearMessages, setView,
  } = useChatStore();
  const user = useAuthStore((s) => s.user);

  // ルーム一覧読み込み
  const loadRooms = useCallback(async () => {
    if (!user) return;
    setLoadingRooms(true);
    try {
      const roomList = await getChatRooms(user.uid);
      setRooms(roomList);
    } catch (err) {
      console.error('ルーム取得エラー:', err);
    } finally {
      setLoadingRooms(false);
    }
  }, [user, setRooms]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // 自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 新規チャットルーム作成
  const handleNewChat = async () => {
    if (!user) return;
    try {
      const roomId = await createChatRoom(user.uid, '新しいチャット');
      setCurrentRoomId(roomId);
      clearMessages();
      setView('chat');
      await loadRooms();
    } catch (err) {
      console.error('ルーム作成エラー:', err);
    }
  };

  // ルーム選択 → チャット画面へ
  const handleSelectRoom = async (room: ChatRoom) => {
    if (!user) return;
    setCurrentRoomId(room.id);
    setView('chat');
    // メッセージ読み込み
    try {
      const msgs = await getChatMessages(user.uid, room.id);
      setMessages(msgs.map(m => ({
        id: m.id || `msg_${Date.now()}_${Math.random()}`,
        role: m.role,
        content: m.content,
        imageUrl: m.imageUrl,
        createdAt: m.createdAt?.toDate?.() || new Date(),
      })));
    } catch (err) {
      console.error('メッセージ取得エラー:', err);
      clearMessages();
    }
  };

  // ルーム削除
  const handleDeleteRoom = async (roomId: string) => {
    if (!user) return;
    setDeletingRoomId(roomId);
    try {
      await deleteChatRoom(user.uid, roomId);
      await loadRooms();
      if (currentRoomId === roomId) {
        setCurrentRoomId(null);
        clearMessages();
        setView('list');
      }
    } catch (err) {
      console.error('ルーム削除エラー:', err);
    } finally {
      setDeletingRoomId(null);
    }
  };

  // 一覧に戻る
  const handleBackToList = async () => {
    setView('list');
    setCurrentRoomId(null);
    clearMessages();
    await loadRooms();
  };

  // 画像をFirebase Storageにアップロード
  const uploadGeneratedImage = async (base64: string): Promise<string> => {
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: 'image/png' });

    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
    const storageRef = ref(storage, `official-images/ai-generated/${fileName}`);
    await uploadBytes(storageRef, blob, { contentType: 'image/png' });
    return getDownloadURL(storageRef);
  };

  // メッセージ送信
  const handleSend = async () => {
    if (!input.trim() || isLoading || !user || !currentRoomId) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      createdAt: new Date(),
    };

    addMessage(userMessage);
    const sentText = input.trim();
    setInput('');
    setLoading(true);

    try {
      // Firestoreにユーザーメッセージ保存
      await saveChatMessage(user.uid, currentRoomId, {
        roomId: currentRoomId,
        role: 'user',
        content: sentText,
      });

      // 最初のメッセージならルームタイトルを更新
      if (messages.length === 0) {
        const title = sentText.length > 20 ? sentText.slice(0, 20) + '...' : sentText;
        await updateChatRoom(user.uid, currentRoomId, { title, lastMessage: sentText });
      } else {
        await updateChatRoom(user.uid, currentRoomId, { lastMessage: sentText });
      }

      // ユーザーの学習メモリを取得
      const userMemory = await getUserMemoryText(user.uid);

      // 直近の履歴を送る（最大10件）
      const allMessages = [...messages, userMessage];
      const recentHistory = allMessages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: sentText,
          history: recentHistory,
          userMemory,
        }),
      });

      const data = await res.json();

      if (data.success) {
        let imageUrl: string | undefined;

        // 画像があればStorageにアップロード
        if (data.data.imageBase64) {
          try {
            imageUrl = await uploadGeneratedImage(data.data.imageBase64);
          } catch (err) {
            console.error('画像アップロードエラー:', err);
          }
        }

        // 新しい学習情報があれば保存
        if (data.data.newMemory) {
          try {
            await addUserMemory(user.uid, data.data.newMemory);
          } catch (err) {
            console.error('メモリ保存エラー:', err);
          }
        }

        const assistantMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: data.data.message,
          imageUrl,
          createdAt: new Date(),
        };

        addMessage(assistantMessage);

        // Firestoreにアシスタントメッセージ保存
        await saveChatMessage(user.uid, currentRoomId, {
          roomId: currentRoomId,
          role: 'assistant',
          content: data.data.message,
          imageUrl,
        });

        // ルームの最終メッセージ更新
        const lastMsg = data.data.message.length > 30
          ? data.data.message.slice(0, 30) + '...'
          : data.data.message;
        await updateChatRoom(user.uid, currentRoomId, { lastMessage: lastMsg });
      } else {
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: 'ごめんな、ちょっと調子悪いみたいだぜ...もう一回言ってくれよ！',
          createdAt: new Date(),
        };
        addMessage(errorMessage);
      }
    } catch (err) {
      console.error('チャットエラー:', err);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'おっと、通信エラーだぜ...もう一回やってみてくれ！',
        createdAt: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Enterキーで送信
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  // ============================================
  // ルーム一覧ビュー
  // ============================================
  if (view === 'list') {
    return (
      <div className="flex flex-col gap-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            はなす
          </h1>
          <Button onClick={handleNewChat} className="px-3 py-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            新しいチャット
          </Button>
        </div>

        {loadingRooms ? (
          <Loading />
        ) : rooms.length === 0 ? (
          /* 空状態 */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-4 pt-12 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <Paintbrush className="w-8 h-8 text-[var(--color-text-muted)]" />
            </div>
            <div>
              <p className="font-bold text-sm">なみ画伯とおしゃべり！</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                「新しいチャット」でスタートだぜ！
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                会話するほどキミのことを覚えるぜ！
              </p>
            </div>
          </motion.div>
        ) : (
          /* ルーム一覧 */
          <Card padding={false}>
            {rooms.map((room, i) => (
              <div
                key={room.id}
                className={`flex items-center ${i < rooms.length - 1 ? 'border-b border-[var(--color-border)]' : ''}`}
              >
                <button
                  onClick={() => handleSelectRoom(room)}
                  className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface)] transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0 border border-[var(--color-border)]">
                    <Paintbrush className="w-4 h-4 text-[var(--color-text-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{room.title}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                      {room.lastMessage || 'メッセージなし'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
                </button>
                <button
                  onClick={() => handleDeleteRoom(room.id)}
                  disabled={deletingRoomId === room.id}
                  className="p-3 hover:bg-[var(--color-surface)] transition-colors"
                >
                  {deletingRoomId === room.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--color-text-muted)]" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-[var(--color-text-muted)]" />
                  )}
                </button>
              </div>
            ))}
          </Card>
        )}
      </div>
    );
  }

  // ============================================
  // チャットビュー
  // ============================================
  return (
    <div className="flex flex-col h-[calc(100dvh-120px)]">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <button
          onClick={handleBackToList}
          className="p-1.5 rounded-[5px] hover:bg-[var(--color-surface)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-black flex-1 truncate">
          {rooms.find(r => r.id === currentRoomId)?.title || 'チャット'}
        </h1>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full gap-4 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <Paintbrush className="w-8 h-8 text-[var(--color-text-muted)]" />
            </div>
            <div>
              <p className="font-bold text-sm">なみ画伯とおしゃべり！</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                「ねこ描いて」と言えば絵も描けるぜ！
              </p>
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center mr-2 flex-shrink-0 border border-[var(--color-border)]">
                  <Paintbrush className="w-4 h-4 text-[var(--color-text-muted)]" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-[10px] px-3 py-2 ${
                  msg.role === 'user'
                    ? 'bg-[var(--color-text-primary)] text-white'
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)]'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                {msg.imageUrl && (
                  <div className="mt-2 relative w-full aspect-square max-w-[200px] bg-white rounded-[5px] overflow-hidden border border-[var(--color-border)]">
                    <Image
                      src={msg.imageUrl}
                      alt="生成画像"
                      fill
                      className="object-contain p-1"
                      sizes="200px"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ローディング */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0 border border-[var(--color-border)]">
              <Paintbrush className="w-4 h-4 text-[var(--color-text-muted)]" />
            </div>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] px-3 py-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--color-text-muted)]" />
                <span className="text-xs text-[var(--color-text-muted)]">
                  考え中だぜ...
                </span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="flex-shrink-0 pt-2 border-t border-[var(--color-border)]">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="input-field flex-1"
            placeholder="メッセージを入力..."
            disabled={isLoading}
            maxLength={500}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`flex-shrink-0 w-10 h-10 rounded-[5px] flex items-center justify-center transition-colors ${
              input.trim() && !isLoading
                ? 'bg-[var(--color-text-primary)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
