// Firestore CRUD ヘルパー
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type {
  UserProfile,
  Quiz,
  QuizStats,
  CollectionItem,
  AnsweredItem,
  Theme,
} from '@/types';

// ==================
// ユーザー関連
// ==================

// ユーザープロフィール取得
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as UserProfile;
}

// ユーザープロフィール更新
export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), data);
}

// スコア更新（正解時）
export async function incrementScore(uid: string, isCorrect: boolean): Promise<void> {
  const updates: Record<string, unknown> = {
    totalAnswered: increment(1),
  };
  if (isCorrect) {
    updates.totalScore = increment(1);
  }
  await updateDoc(doc(db, 'users', uid), updates);
}

// ==================
// クイズ関連
// ==================

// ランダムにクイズ1問取得（インデックス不要な方式）
export async function getRandomQuiz(uid: string): Promise<Quiz | null> {
  // isHidden==false のクイズのみ取得（等値フィルタ＋orderByでインデックス不要）
  const q = query(
    collection(db, 'quizzes'),
    where('isHidden', '==', false),
    limit(50)
  );
  const snap = await getDocs(q);

  if (snap.empty) return null;

  // クライアント側でシャッフルして未回答のクイズを探す
  const shuffled = [...snap.docs].sort(() => Math.random() - 0.5);

  for (const quizDoc of shuffled) {
    const answeredSnap = await getDoc(doc(db, 'users', uid, 'answered', quizDoc.id));
    if (!answeredSnap.exists()) {
      return { id: quizDoc.id, ...quizDoc.data() } as Quiz;
    }
  }

  return null; // 全問回答済み
}

// クイズ作成
export async function createQuiz(data: Omit<Quiz, 'id' | 'createdAt' | 'reportCount' | 'isHidden' | 'randomSeed'>): Promise<string> {
  const quizRef = doc(collection(db, 'quizzes'));
  await setDoc(quizRef, {
    ...data,
    randomSeed: Math.random(),  // 改善案1
    reportCount: 0,
    isHidden: false,            // 改善案5
    createdAt: serverTimestamp(),
  });
  return quizRef.id;
}

// ユーザーの投稿クイズ一覧
export async function getUserQuizzes(uid: string): Promise<Quiz[]> {
  const q = query(
    collection(db, 'quizzes'),
    where('creatorUid', '==', uid)
  );
  const snap = await getDocs(q);
  // クライアント側で日付順にソート（複合インデックス不要）
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as Quiz)
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
}

// クイズ削除
export async function deleteQuiz(quizId: string): Promise<void> {
  await deleteDoc(doc(db, 'quizzes', quizId));
}

// クイズ更新（改善案3: update権限追加に対応）
export async function updateQuiz(quizId: string, data: Partial<Quiz>): Promise<void> {
  await updateDoc(doc(db, 'quizzes', quizId), data);
}

// ==================
// 回答・コレクション関連
// ==================

// 回答を保存
export async function saveAnswer(uid: string, quizId: string, isCorrect: boolean): Promise<void> {
  // answered サブコレクションに保存
  await setDoc(doc(db, 'users', uid, 'answered', quizId), {
    isCorrect,
    answeredAt: serverTimestamp(),
  } as Omit<AnsweredItem, 'answeredAt'> & { answeredAt: ReturnType<typeof serverTimestamp> });

  // 正解時はコレクションにも追加
  if (isCorrect) {
    const quizSnap = await getDoc(doc(db, 'quizzes', quizId));
    if (quizSnap.exists()) {
      const quiz = quizSnap.data() as Quiz;
      await setDoc(doc(db, 'users', uid, 'collection', quizId), {
        quizId,
        answeredAt: serverTimestamp(),
        imageUrl: quiz.imageUrl,
        answer: quiz.answer,
      });
    }
  }

  // スコア更新
  await incrementScore(uid, isCorrect);

  // クイズ側の統計カウンターも更新
  const quizStatsUpdate: Record<string, unknown> = {
    statsTotalAnswered: increment(1),
  };
  if (isCorrect) {
    quizStatsUpdate.statsTotalCorrect = increment(1);
  }
  await updateDoc(doc(db, 'quizzes', quizId), quizStatsUpdate);
}

// クイズの解答統計を取得
export function getQuizStats(quiz: Quiz): QuizStats {
  const raw = quiz as Quiz & { statsTotalAnswered?: number; statsTotalCorrect?: number };
  const totalAnswered = raw.statsTotalAnswered ?? 0;
  const totalCorrect = raw.statsTotalCorrect ?? 0;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  return { totalAnswered, totalCorrect, accuracy };
}

// ユーザーのコレクション取得
export async function getUserCollection(uid: string): Promise<CollectionItem[]> {
  const q = query(
    collection(db, 'users', uid, 'collection'),
    orderBy('answeredAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as CollectionItem);
}

// ユーザーのコレクションIDセット取得
export async function getUserCollectionIds(uid: string): Promise<Set<string>> {
  const snap = await getDocs(collection(db, 'users', uid, 'collection'));
  return new Set(snap.docs.map(d => d.id));
}

// ==================
// お題関連
// ==================

// ランダムにお題を1つ取得
export async function getRandomTheme(): Promise<Theme | null> {
  const q = query(
    collection(db, 'themes'),
    where('isActive', '==', true),
    limit(20)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const randomIndex = Math.floor(Math.random() * snap.docs.length);
  const themeDoc = snap.docs[randomIndex];
  return { id: themeDoc.id, ...themeDoc.data() } as Theme;
}

// 全クイズ取得（ずかん用）
export async function getAllQuizzes(): Promise<Quiz[]> {
  const q = query(
    collection(db, 'quizzes'),
    where('isHidden', '==', false)
  );
  const snap = await getDocs(q);
  // クライアント側で日付順にソート（複合インデックス不要）
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as Quiz)
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
}

// クイズ通報
export async function reportQuiz(quizId: string): Promise<void> {
  await updateDoc(doc(db, 'quizzes', quizId), {
    reportCount: increment(1),
  });

  // 改善案5: 通報3件以上で自動非表示
  const quizSnap = await getDoc(doc(db, 'quizzes', quizId));
  if (quizSnap.exists()) {
    const data = quizSnap.data();
    if (data.reportCount >= 3) {
      await updateDoc(doc(db, 'quizzes', quizId), { isHidden: true });
    }
  }
}
