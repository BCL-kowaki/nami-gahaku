// Admin SDK 経由の Firestore ヘルパー（サーバーサイド専用）
import { adminDb, adminAuthApp } from './admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserProfile, Quiz, Announcement } from '@/types';

// Timestamp を ISO 文字列に再帰変換
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeData(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (typeof value === 'object' && typeof value.toDate === 'function') {
      result[key] = value.toDate().toISOString();
    } else if (typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
      result[key] = new Date(value.seconds * 1000).toISOString();
    } else if (Array.isArray(value)) {
      result[key] = value;
    } else if (typeof value === 'object' && !(value instanceof Date)) {
      result[key] = sanitizeData(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// 全ユーザー取得
export async function getAllUsersAdmin(): Promise<UserProfile[]> {
  const snap = await adminDb.collection('users').get();
  return snap.docs
    .map(d => ({
      uid: d.id,
      ...sanitizeData(d.data()),
    } as unknown as UserProfile))
    .sort((a, b) => {
      const aTime = new Date((a.createdAt as unknown as string) || 0).getTime();
      const bTime = new Date((b.createdAt as unknown as string) || 0).getTime();
      return bTime - aTime;
    });
}

// 全クイズ取得（非表示含む）
export async function getAllQuizzesAdminServer(): Promise<Quiz[]> {
  const snap = await adminDb.collection('quizzes').get();
  return snap.docs
    .map(d => ({
      id: d.id,
      ...sanitizeData(d.data()),
    } as unknown as Quiz))
    .sort((a, b) => {
      const aTime = new Date((a.createdAt as unknown as string) || 0).getTime();
      const bTime = new Date((b.createdAt as unknown as string) || 0).getTime();
      return bTime - aTime;
    });
}

// 全お知らせ取得
export async function getAllAnnouncementsAdmin(): Promise<Announcement[]> {
  const snap = await adminDb.collection('announcements').get();
  return snap.docs
    .map(d => ({
      id: d.id,
      ...sanitizeData(d.data()),
    } as unknown as Announcement))
    .sort((a, b) => {
      const aTime = new Date((a.createdAt as unknown as string) || 0).getTime();
      const bTime = new Date((b.createdAt as unknown as string) || 0).getTime();
      return bTime - aTime;
    });
}

// ユーザー更新
export async function updateUserAdmin(uid: string, data: Partial<UserProfile>): Promise<void> {
  await adminDb.collection('users').doc(uid).update(data);
}

// ユーザーのパスワードを変更（Admin SDK 経由で Firebase Auth を直接操作）
export async function updateUserPasswordAdmin(uid: string, newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('パスワードは6文字以上にしてください');
  }
  await adminAuthApp.updateUser(uid, { password: newPassword });
}

// loginId が他ユーザーで既に使われているかチェック
export async function isLoginIdTakenByOther(loginId: string, excludeUid: string): Promise<boolean> {
  const snap = await adminDb
    .collection('users')
    .where('loginId', '==', loginId)
    .limit(2)
    .get();
  return snap.docs.some(d => d.id !== excludeUid);
}

// ログインID変更（loginId フィールドのみ更新。email は触らない）
export async function updateUserLoginIdAdmin(uid: string, newLoginId: string): Promise<void> {
  const trimmed = newLoginId.trim();
  if (!trimmed) {
    throw new Error('IDを入力してください');
  }
  if (trimmed.length < 3) {
    throw new Error('IDは3文字以上にしてください');
  }
  if (trimmed.includes('@')) {
    throw new Error('IDに@は使用できません');
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    throw new Error('IDは英数字と _ . - のみ使用できます');
  }
  if (await isLoginIdTakenByOther(trimmed, uid)) {
    throw new Error('このIDはすでに使用されています');
  }
  await adminDb.collection('users').doc(uid).update({ loginId: trimmed });
}

// ユーザー削除（サブコレクション含む）
export async function deleteUserAdmin(uid: string): Promise<void> {
  const userRef = adminDb.collection('users').doc(uid);

  // サブコレクション削除
  const subCollections = ['answered', 'collection', 'fortunes', 'chatRooms', 'settings'];
  for (const name of subCollections) {
    const sub = await userRef.collection(name).get();
    for (const doc of sub.docs) {
      // chatRooms はさらに messages サブコレクションを持つ
      if (name === 'chatRooms') {
        const messagesSnap = await doc.ref.collection('messages').get();
        for (const msg of messagesSnap.docs) {
          await msg.ref.delete();
        }
      }
      await doc.ref.delete();
    }
  }

  await userRef.delete();
}

// クイズ更新
export async function updateQuizAdmin(quizId: string, data: Partial<Quiz>): Promise<void> {
  await adminDb.collection('quizzes').doc(quizId).update(data);
}

// クイズ削除
export async function deleteQuizAdmin(quizId: string): Promise<void> {
  await adminDb.collection('quizzes').doc(quizId).delete();
}

// 既存クイズを公式化
export async function migrateToOfficialAdmin(): Promise<number> {
  const snap = await adminDb.collection('quizzes').get();
  let count = 0;
  for (const doc of snap.docs) {
    await doc.ref.update({
      creatorUid: 'official',
      creatorName: 'nami【公式】',
      isOfficial: true,
    });
    count++;
  }
  return count;
}

// 管理者設定更新
export async function updateAdminSettingsServer(data: { adminId: string; adminPassword: string }): Promise<void> {
  await adminDb.collection('settings').doc('admin').set(data);
}

// お知らせ作成
export async function createAnnouncementAdmin(title: string, message: string): Promise<string> {
  const ref = adminDb.collection('announcements').doc();
  await ref.set({
    title,
    message,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

// お知らせ更新
export async function updateAnnouncementAdmin(id: string, data: Partial<Announcement>): Promise<void> {
  await adminDb.collection('announcements').doc(id).update(data);
}

// お知らせ削除
export async function deleteAnnouncementAdmin(id: string): Promise<void> {
  await adminDb.collection('announcements').doc(id).delete();
}
