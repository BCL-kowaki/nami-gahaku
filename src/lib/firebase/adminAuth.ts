// 管理者APIルート用の認証ユーティリティ（サーバーサイド専用）
import { adminDb } from './admin';

export interface AdminCredential {
  adminId: string;
  adminPassword: string;
}

// Firestoreから管理者設定を取得（Admin SDK経由、ルール無視）
export async function getAdminCredentialServer(): Promise<AdminCredential> {
  try {
    const snap = await adminDb.collection('settings').doc('admin').get();
    if (!snap.exists) {
      return { adminId: 'admin', adminPassword: 'admin' };
    }
    const data = snap.data() as Partial<AdminCredential> | undefined;
    return {
      adminId: data?.adminId ?? 'admin',
      adminPassword: data?.adminPassword ?? 'admin',
    };
  } catch {
    return { adminId: 'admin', adminPassword: 'admin' };
  }
}

// 管理者パスワード認証（APIルート先頭で使う）
export async function verifyAdminPassword(adminPassword: string | undefined | null): Promise<boolean> {
  if (!adminPassword) return false;
  const { adminPassword: correct } = await getAdminCredentialServer();
  return adminPassword === correct;
}
