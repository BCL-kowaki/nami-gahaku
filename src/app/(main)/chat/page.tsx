'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Trash2, Paintbrush, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { ChatMessage } from '@/types';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, isLoading, addMessage, setLoading, clearMessages } = useChatStore();
  const user = useAuthStore((s) => s.user);

  // 自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    if (!input.trim() || isLoading || !user) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      createdAt: new Date(),
    };

    addMessage(userMessage);
    setInput('');
    setLoading(true);

    try {
      // 直近の履歴を送る（最大10件）
      const recentHistory = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: recentHistory,
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

        const assistantMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: data.data.message,
          imageUrl,
          createdAt: new Date(),
        };

        addMessage(assistantMessage);
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

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)]">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h1 className="text-lg font-black flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          はなす
        </h1>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="p-2 rounded-[5px] hover:bg-[var(--color-surface)] transition-colors"
            title="チャットをクリア"
          >
            <Trash2 className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
        )}
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
