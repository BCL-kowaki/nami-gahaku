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

// ランダムにクイズ1問取得（改善案1: randomSeedを使用）
export async function getRandomQuiz(uid: string): Promise<Quiz | null> {
  const seed = Math.random();

  // randomSeed >= seed で1件取得（非表示は除外）
  let q = query(
    collection(db, 'quizzes'),
    where('isHidden', '!=', true),
    where('randomSeed', '>=', seed),
    orderBy('randomSeed'),
    limit(1)
  );

  let snap = await getDocs(q);

  // 見つからない場合は逆方向で検索
  if (snap.empty) {
    q = query(
      collection(db, 'quizzes'),
      where('isHidden', '!=', true),
      where('randomSeed', '<', seed),
      orderBy('randomSeed', 'desc'),
      limit(1)
    );
    snap = await getDocs(q);
  }

  if (snap.empty) return null;

  const quizDoc = snap.docs[0];
  const quiz = { id: quizDoc.id, ...quizDoc.data() } as Quiz;

  // 既回答チェック（改善案2: リトライ方式）
  const answeredSnap = await getDoc(doc(db, 'users', uid, 'answered', quizDoc.id));
  if (answeredSnap.exists()) {
    // 既回答なら別のクイズを試行（最大5回）
    return retryGetRandomQuiz(uid, 5);
  }

  return quiz;
}

// リトライ方式でランダムクイズ取得
async function retryGetRandomQuiz(uid: string, retries: number): Promise<Quiz | null> {
  for (let i = 0; i < retries; i++) {
    const seed = Math.random();
    const q = query(
      collection(db, 'quizzes'),
      where('isHidden', '!=', true),
      where('randomSeed', '>=', seed),
      orderBy('randomSeed'),
      limit(3)
    );
    const snap = await getDocs(q);

    for (const quizDoc of snap.docs) {
      const answeredSnap = await getDoc(doc(db, 'users', uid, 'answered', quizDoc.id));
      if (!answeredSnap.exists()) {
        return { id: quizDoc.id, ...quizDoc.data() } as Quiz;
      }
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
    where('creatorUid', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Quiz);
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
    where('isHidden', '!=', true),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Quiz);
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
