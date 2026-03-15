import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Firebase Storageからの画像を許可
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  // Sharp画像処理のためサーバーサイド設定
  serverExternalPackages: ['sharp'],
};

export default nextConfig;
