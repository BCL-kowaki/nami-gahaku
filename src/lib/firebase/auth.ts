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

// サインアップ: Authユーザー作成 + Firestoreにユーザードキュメント作成
export async function signUp(email: string, password: string, displayName: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // Firestoreにユーザードキュメントを作成
  const userDoc: Omit<UserProfile, 'uid' | 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
    displayName,
    email,
    totalScore: 0,
    totalAnswered: 0,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'users', user.uid), userDoc);
  return user;
}

// ログイン
export async function logIn(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
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
