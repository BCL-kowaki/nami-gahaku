// Firebase Admin SDK (サーバーサイド専用)
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  // サービスアカウントキーが環境変数にある場合
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccount) {
    try {
      const parsed = JSON.parse(serviceAccount);
      return initializeApp({
        credential: cert(parsed),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } catch (e) {
      console.error('Firebase Admin: サービスアカウントキーのパースに失敗:', e);
    }
  }

  // フォールバック: プロジェクトIDのみで初期化（ローカル開発用）
  return initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const adminApp = getAdminApp();
export const adminStorage = getStorage(adminApp);
