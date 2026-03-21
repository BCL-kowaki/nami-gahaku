'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { getActiveAnnouncements } from '@/lib/firebase/firestore';
import type { Announcement } from '@/types';

const STORAGE_KEY = 'nami-read-announcements';

function getReadIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markAsRead(id: string) {
  const ids = getReadIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }
}

export default function AnnouncementPopup() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    try {
      const all = await getActiveAnnouncements();
      const readIds = getReadIds();
      const unread = all.filter(a => a.id && !readIds.includes(a.id));
      if (unread.length > 0) {
        setAnnouncements(unread);
        setCurrentIndex(0);
        setIsOpen(true);
      }
    } catch (err) {
      console.error('お知らせ取得エラー:', err);
    }
  }, []);

  useEffect(() => {
    // 少し遅らせて表示（ページ描画後）
    const timer = setTimeout(loadAnnouncements, 800);
    return () => clearTimeout(timer);
  }, [loadAnnouncements]);

  const handleClose = () => {
    const current = announcements[currentIndex];
    if (current?.id) {
      markAsRead(current.id);
    }

    if (currentIndex < announcements.length - 1) {
      // 次のお知らせへ
      setCurrentIndex(prev => prev + 1);
    } else {
      // 全部読んだ
      setIsOpen(false);
    }
  };

  const current = announcements[currentIndex];

  return (
    <AnimatePresence>
      {isOpen && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={handleClose}
          />
          {/* ポップアップ本体 */}
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="card relative z-10 w-full max-w-sm p-5"
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
                  <Bell className="w-4 h-4 text-[var(--color-text-primary)]" />
                </div>
                <h3 className="text-sm font-black">おしらせ</h3>
              </div>
              <button
                onClick={handleClose}
                className="p-1 rounded-[5px] hover:bg-[var(--color-surface)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-text-muted)]" />
              </button>
            </div>

            {/* タイトル */}
            <h4 className="text-sm font-bold mb-2">{current.title}</h4>

            {/* 本文 */}
            <p className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed mb-4">
              {current.message}
            </p>

            {/* カウンター + ボタン */}
            <div className="flex items-center justify-between">
              {announcements.length > 1 && (
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {currentIndex + 1} / {announcements.length}
                </span>
              )}
              <Button
                onClick={handleClose}
                className="ml-auto px-6 py-2 text-xs"
              >
                {currentIndex < announcements.length - 1 ? 'つぎへ' : 'OK'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
