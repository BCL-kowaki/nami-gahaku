// Firebase Auth ヘルパー
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateEmail,
  type User,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import type { UserProfile } from '@/types';

// IDをFirebase Auth用のメールアドレスに変換
// メールアドレス形式ならそのまま、英数字IDなら @nami-quiz.app を付加
export function toAuthEmail(loginId: string): string {
  if (loginId.includes('@')) return loginId;
  return `${loginId}@nami-quiz.app`;
}

// サインアップ: Authユーザー作成 + Firestoreにユーザードキュメント作成
export async function signUp(loginId: string, password: string, displayName: string, birthday?: string): Promise<User> {
  const authEmail = toAuthEmail(loginId);
  const credential = await createUserWithEmailAndPassword(auth, authEmail, password);
  const user = credential.user;

  // Firestoreにユーザードキュメントを作成
  const userDoc: Record<string, unknown> = {
    displayName,
    loginId,
    email: authEmail,
    totalScore: 0,
    totalAnswered: 0,
    createdAt: serverTimestamp(),
  };

  // 誕生日が入力されていれば追加
  if (birthday) {
    userDoc.birthday = birthday;
  }

  await setDoc(doc(db, 'users', user.uid), userDoc);
  return user;
}

// ログイン
export async function logIn(loginId: string, password: string): Promise<User> {
  const authEmail = toAuthEmail(loginId);
  const credential = await signInWithEmailAndPassword(auth, authEmail, password);
  return credential.user;
}

// ログアウト
export async function logOut(): Promise<void> {
  await signOut(auth);
}

// メールアドレス変更
export async function changeEmail(newEmail: string): Promise<void> {
  if (!auth.currentUser) throw new Error('ログインしてください');
  await updateEmail(auth.currentUser, newEmail);
}

// パスワード変更
export async function changePassword(newPassword: string): Promise<void> {
  if (!auth.currentUser) throw new Error('ログインしてください');
  await updatePassword(auth.currentUser, newPassword);
}
