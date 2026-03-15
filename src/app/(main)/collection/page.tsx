'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, HelpCircle, X } from 'lucide-react';
import Image from 'next/image';
import ProgressBar from '@/components/ui/ProgressBar';
import Loading from '@/components/ui/Loading';
import { useAuthStore } from '@/stores/authStore';
import { getAllQuizzes, getUserCollectionIds } from '@/lib/firebase/firestore';
import type { CollectionDisplay } from '@/types';

export default function CollectionPage() {
  const [items, setItems] = useState<CollectionDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<CollectionDisplay | null>(null);
  const user = useAuthStore((s) => s.user);

  const fetchCollection = useCallback(async () => {
    if (!user) return;
    try {
      const [allQuizzes, unlockedIds] = await Promise.all([
        getAllQuizzes(),
        getUserCollectionIds(user.uid),
      ]);

      const displays: CollectionDisplay[] = allQuizzes.map((quiz) => ({
        quizId: quiz.id!,
        imageUrl: quiz.imageUrl,
        answer: quiz.answer,
        isUnlocked: unlockedIds.has(quiz.id!),
      }));

      // 公式クイズを先頭に、アンロック済みを優先表示
      displays.sort((a, b) => {
        if (a.isUnlocked && !b.isUnlocked) return -1;
        if (!a.isUnlocked && b.isUnlocked) return 1;
        return 0;
      });

      setItems(displays);
    } catch (err) {
      console.error('コレクション取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const unlockedCount = items.filter((i) => i.isUnlocked).length;
  const totalCount = items.length;
  const completionRate = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  if (loading) return <Loading text="ずかんを読み込み中..." />;

  return (
    <div className="flex flex-col gap-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          ずかん
        </h1>
        <span className="text-sm text-[var(--color-text-secondary)] font-bold">
          {unlockedCount} / {totalCount}
        </span>
      </div>

      {/* コンプリート率 */}
      <ProgressBar value={completionRate} label="コンプリート率" />

      {/* グリッド - 3列 */}
      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--color-text-muted)]">
            まだクイズがありません。あそんでずかんを埋めよう！
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item, index) => (
            <motion.button
              key={item.quizId}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              className="card overflow-hidden aspect-square relative"
              onClick={() => item.isUnlocked && setSelectedItem(item)}
              disabled={!item.isUnlocked}
            >
              {item.isUnlocked ? (
                <>
                  <Image
                    src={item.imageUrl}
                    alt={item.answer}
                    fill
                    className="object-contain p-2"
                    sizes="120px"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-white/90 py-0.5">
                    <p className="text-[9px] font-bold text-center truncate px-1">
                      {item.answer}
                    </p>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-[var(--color-surface)] flex items-center justify-center">
                  <HelpCircle className="w-8 h-8 text-[var(--color-text-muted)]" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      )}

      {/* 拡大モーダル */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setSelectedItem(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="card relative z-10 w-full max-w-xs overflow-hidden"
            >
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-2 right-2 z-20 p-1 bg-white rounded-full shadow"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="relative w-full aspect-square bg-white">
                <Image
                  src={selectedItem.imageUrl}
                  alt={selectedItem.answer}
                  fill
                  className="object-contain p-4"
                  sizes="320px"
                />
              </div>
              <div className="p-3 text-center border-t border-[var(--color-border)]">
                <p className="text-lg font-black">{selectedItem.answer}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
