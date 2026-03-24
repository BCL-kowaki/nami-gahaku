import type { Metadata, Viewport } from 'next';
import './globals.css';
import AuthInitializer from '@/components/layout/AuthInitializer';
import ServiceWorkerRegister from '@/components/layout/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'なみ画伯のおえかきクイズ',
  description: '絵が下手すぎる「なみ画伯」の絵を見て4択クイズで当てよう！',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'なみ画伯',
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#F5F0E8',
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
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
