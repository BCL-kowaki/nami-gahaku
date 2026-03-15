// 認証ページ用レイアウト（ログイン・サインアップ）
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] p-4">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </main>
  );
}
