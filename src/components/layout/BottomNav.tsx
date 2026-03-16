'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Play, BookOpen, Star, MessageCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';

const tabs = [
  { href: '/play', label: 'あそぶ', icon: Play },
  { href: '/collection', label: 'ずかん', icon: BookOpen },
  { href: '/fortune', label: 'うらなう', icon: Star },
  { href: '/chat', label: 'はなす', icon: MessageCircle },
  { href: '/profile', label: 'ぷろふ', icon: User },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-md flex">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 relative"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--color-text-primary)] rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon
                className={`w-5 h-5 ${
                  isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'
                }`}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span
                className={`text-[10px] ${
                  isActive
                    ? 'text-[var(--color-text-primary)] font-bold'
                    : 'text-[var(--color-text-muted)]'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
