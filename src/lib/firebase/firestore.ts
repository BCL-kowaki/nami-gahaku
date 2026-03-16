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
  Fortune,
  ChatRoom,
  ChatMessageDoc,
  UserMemory,
} from '@/types';

// Firestore Timestamp を安全にミリ秒に変換するヘルパー
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeTimestampMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  return 0;
}

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
// skipAnswered: true → 正解済みクイズをスキップ / false → 全未回答を対象
export async function getRandomQuiz(uid: string, skipAnswered?: boolean): Promise<Quiz | null> {
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
    if (skipAnswered) {
      // 正解済みスキップモード: 正解したクイズは飛ばす
      if (answeredSnap.exists()) {
        const data = answeredSnap.data() as AnsweredItem;
        if (data.isCorrect) continue; // 正解済み → スキップ
      }
    } else {
      // 通常モード: 回答済み（正解・不正解問わず）をスキップ
      if (answeredSnap.exists()) continue;
    }
    return { id: quizDoc.id, ...quizDoc.data() } as Quiz;
  }

  return null; // 全問回答済み
}

// フラッシュアニメーション用: ランダムなクイズ画像URLを複数取得
export async function getQuizImagesForFlash(count: number = 10): Promise<string[]> {
  const q = query(
    collection(db, 'quizzes'),
    where('isHidden', '==', false),
    limit(50)
  );
  const snap = await getDocs(q);
  if (snap.empty) return [];

  const allImages = snap.docs.map(d => (d.data() as Quiz).imageUrl);
  // シャッフルして指定数を返す
  const shuffled = [...allImages].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
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
      const aTime = safeTimestampMillis(a.createdAt);
      const bTime = safeTimestampMillis(b.createdAt);
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
      const aTime = safeTimestampMillis(a.createdAt);
      const bTime = safeTimestampMillis(b.createdAt);
      return bTime - aTime;
    });
}

// ==================
// 管理者関連
// ==================

// 管理者設定の型
export interface AdminSettings {
  adminId: string;
  adminPassword: string;
}

// 管理者設定を取得
export async function getAdminSettings(): Promise<AdminSettings | null> {
  const snap = await getDoc(doc(db, 'settings', 'admin'));
  if (!snap.exists()) return null;
  return snap.data() as AdminSettings;
}

// 管理者設定を更新
export async function updateAdminSettings(data: AdminSettings): Promise<void> {
  await setDoc(doc(db, 'settings', 'admin'), data);
}

// Firestore Timestamp を安全に文字列に変換するヘルパー
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeTimestampToString(ts: any): string {
  if (!ts) return '';
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
  if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000).toISOString();
  if (ts instanceof Date) return ts.toISOString();
  return '';
}

// 全ユーザー取得（管理者用）- Timestampをシリアライズ済みで返す
export async function getAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs
    .map(d => {
      const data = d.data();
      return {
        uid: d.id,
        ...data,
        // createdAtを安全な文字列に変換（ReactがTimestampオブジェクトをレンダリングしないように）
        createdAt: safeTimestampToString(data.createdAt),
      } as unknown as UserProfile;
    })
    .sort((a, b) => {
      const aTime = safeTimestampMillis(a.createdAt);
      const bTime = safeTimestampMillis(b.createdAt);
      return bTime - aTime;
    });
}

// 全クイズ取得（管理者用: 非表示含む）- Timestampをシリアライズ済みで返す
export async function getAllQuizzesAdmin(): Promise<Quiz[]> {
  const snap = await getDocs(collection(db, 'quizzes'));
  return snap.docs
    .map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        // createdAtを安全な文字列に変換（ReactがTimestampオブジェクトをレンダリングしないように）
        createdAt: safeTimestampToString(data.createdAt),
      } as unknown as Quiz;
    })
    .sort((a, b) => {
      const aTime = safeTimestampMillis(a.createdAt);
      const bTime = safeTimestampMillis(b.createdAt);
      return bTime - aTime;
    });
}

// 既存クイズを公式に一括変換
export async function migrateExistingQuizzesToOfficial(): Promise<number> {
  const snap = await getDocs(collection(db, 'quizzes'));
  let count = 0;
  for (const quizDoc of snap.docs) {
    await updateDoc(doc(db, 'quizzes', quizDoc.id), {
      creatorUid: 'official',
      creatorName: 'nami【公式】',
      isOfficial: true,
    });
    count++;
  }
  return count;
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

// ==================
// 占い関連
// ==================

// 今日の日付文字列取得
function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 今日の占いを取得（キャッシュ）
export async function getTodayFortune(uid: string): Promise<Fortune | null> {
  const date = getTodayDateString();
  const snap = await getDoc(doc(db, 'users', uid, 'fortunes', date));
  if (!snap.exists()) return null;
  return snap.data() as Fortune;
}

// 占いを保存
export async function saveFortune(uid: string, fortune: Omit<Fortune, 'createdAt'>): Promise<void> {
  const date = fortune.date;
  await setDoc(doc(db, 'users', uid, 'fortunes', date), {
    ...fortune,
    createdAt: serverTimestamp(),
  });
}

// ランダムなクイズ画像を1つ取得（占い用キャラクター表示）
export async function getRandomQuizImage(): Promise<{ imageUrl: string } | null> {
  const q = query(
    collection(db, 'quizzes'),
    where('isHidden', '==', false),
    limit(50)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const randomIndex = Math.floor(Math.random() * snap.docs.length);
  const quizDoc = snap.docs[randomIndex];
  return { imageUrl: (quizDoc.data() as Quiz).imageUrl };
}

// ==================
// チャットルーム関連
// ==================

// チャットルーム一覧取得
export async function getChatRooms(uid: string): Promise<ChatRoom[]> {
  const q = query(
    collection(db, 'users', uid, 'chatRooms'),
    orderBy('updatedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ChatRoom);
}

// チャットルーム作成
export async function createChatRoom(uid: string, title: string): Promise<string> {
  const roomRef = doc(collection(db, 'users', uid, 'chatRooms'));
  await setDoc(roomRef, {
    uid,
    title,
    lastMessage: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return roomRef.id;
}

// チャットルーム削除
export async function deleteChatRoom(uid: string, roomId: string): Promise<void> {
  // メッセージも全削除
  const messagesSnap = await getDocs(
    collection(db, 'users', uid, 'chatRooms', roomId, 'messages')
  );
  for (const msgDoc of messagesSnap.docs) {
    await deleteDoc(doc(db, 'users', uid, 'chatRooms', roomId, 'messages', msgDoc.id));
  }
  // ルーム削除
  await deleteDoc(doc(db, 'users', uid, 'chatRooms', roomId));
}

// チャットルームのタイトルと最終メッセージを更新
export async function updateChatRoom(uid: string, roomId: string, data: { title?: string; lastMessage?: string }): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'chatRooms', roomId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// チャットメッセージ一覧取得
export async function getChatMessages(uid: string, roomId: string): Promise<ChatMessageDoc[]> {
  const q = query(
    collection(db, 'users', uid, 'chatRooms', roomId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ChatMessageDoc);
}

// チャットメッセージ保存
export async function saveChatMessage(uid: string, roomId: string, message: Omit<ChatMessageDoc, 'id' | 'createdAt'>): Promise<string> {
  const msgRef = doc(collection(db, 'users', uid, 'chatRooms', roomId, 'messages'));
  // undefinedフィールドを除外（Firestoreはundefined値を受け付けない）
  const cleanData: Record<string, unknown> = { createdAt: serverTimestamp() };
  for (const [key, value] of Object.entries(message)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }
  await setDoc(msgRef, cleanData);
  return msgRef.id;
}

// ==================
// ユーザー学習メモリ
// ==================

// メモリ取得
export async function getUserMemory(uid: string): Promise<UserMemory | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'memory'));
  if (!snap.exists()) return null;
  return snap.data() as UserMemory;
}

// メモリ保存（追加）
export async function addUserMemory(uid: string, memory: string): Promise<void> {
  const existing = await getUserMemory(uid);
  const memories = existing?.memories ?? [];

  // 重複チェック & 最大200件制限
  if (!memories.includes(memory)) {
    memories.push(memory);
    if (memories.length > 200) {
      memories.shift(); // 古い記憶を削除
    }
  }

  await setDoc(doc(db, 'users', uid, 'settings', 'memory'), {
    uid,
    memories,
    updatedAt: serverTimestamp(),
  });
}

// メモリ全取得（テキスト化）
export async function getUserMemoryText(uid: string): Promise<string> {
  const memory = await getUserMemory(uid);
  if (!memory || memory.memories.length === 0) return '';
  return memory.memories.join('\n');
}

// ==================
// 画像生成回数制限
// ==================

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 今日の画像生成回数を取得
export async function getImageGenCount(uid: string): Promise<number> {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'imageGenCount'));
  if (!snap.exists()) return 0;
  const data = snap.data();
  // 日付が違えばリセット
  if (data.date !== getTodayDateStr()) return 0;
  return data.count ?? 0;
}

// 画像生成回数をインクリメント
export async function incrementImageGenCount(uid: string): Promise<void> {
  const today = getTodayDateStr();
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'imageGenCount'));
  let count = 1;
  if (snap.exists() && snap.data().date === today) {
    count = (snap.data().count ?? 0) + 1;
  }
  await setDoc(doc(db, 'users', uid, 'settings', 'imageGenCount'), {
    date: today,
    count,
  });
}
