import type { Metadata, Viewport } from 'next';
import './globals.css';
import AuthInitializer from '@/components/layout/AuthInitializer';

export const metadata: Metadata = {
  title: 'なみ画伯のおえかきクイズ',
  description: '絵が下手すぎる「なみ画伯」の絵を見て4択クイズで当てよう！',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <AuthInitializer />
        {children}
      </body>
    </html>
  );
}
