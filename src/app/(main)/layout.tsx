import AuthGuard from '@/components/layout/AuthGuard';
import BottomNav from '@/components/layout/BottomNav';
import AnnouncementPopup from '@/components/AnnouncementPopup';

// 認証後メインレイアウト（ボトムナビ付き）
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-[var(--color-bg)] pb-16">
        <div className="mx-auto max-w-md px-4 py-4">
          {children}
        </div>
      </main>
      <BottomNav />
      <AnnouncementPopup />
    </AuthGuard>
  );
}
