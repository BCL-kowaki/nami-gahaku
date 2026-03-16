// ===========================
// なみ画伯のおえかきクイズ 型定義
// ===========================

import { Timestamp } from 'firebase/firestore';

// --- ユーザー ---
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  birthday?: string;          // 誕生日 (YYYY-MM-DD)
  skipAnswered?: boolean;     // 正解済みクイズをスキップするか
  totalScore: number;         // 累積正解数
  totalAnswered: number;      // 累積回答数
  createdAt: Timestamp;
}

// --- クイズ解答統計 ---
export interface QuizStats {
  totalAnswered: number;      // 総回答数
  totalCorrect: number;       // 正解数
  accuracy: number;           // 正解率 (%)
}

// --- コレクション（ずかん）アイテム ---
export interface CollectionItem {
  quizId: string;
  answeredAt: Timestamp;
  imageUrl: string;
  answer: string;
}

// --- 回答履歴 ---
export interface AnsweredItem {
  isCorrect: boolean;
  answeredAt: Timestamp;
}

// --- クイズ ---
export interface Quiz {
  id?: string;
  imageUrl: string;
  originalImageUrl?: string;
  answer: string;
  category: QuizCategory;
  dummyChoices: [string, string, string]; // ダミー選択肢×3
  creatorUid: string;
  creatorName: string;
  isOfficial: boolean;
  themeId: string | null;
  createdAt: Timestamp;
  reportCount: number;
  isHidden?: boolean;       // 通報による非表示フラグ（改善案5）
  randomSeed?: number;      // ランダム取得用シード（改善案1）
}

// --- お題 ---
export interface Theme {
  id?: string;
  name: string;
  category: QuizCategory;
  isActive: boolean;
}

// --- カテゴリ列挙 ---
export type QuizCategory =
  | 'どうぶつ'
  | 'たべもの'
  | 'のりもの'
  | 'しぜん'
  | 'にちようひん'
  | 'たてもの'
  | 'キャラクター'
  | 'スポーツ'
  | 'その他';

// --- クイズ回答リクエスト ---
export interface AnswerRequest {
  quizId: string;
  selectedAnswer: string;
}

// --- クイズ回答レスポンス ---
export interface AnswerResponse {
  isCorrect: boolean;
  correctAnswer: string;
  quizId: string;
}

// --- クイズ作成リクエスト ---
export interface CreateQuizRequest {
  imageBase64: string;
  answer: string;
  category: QuizCategory;
  dummyChoices: [string, string, string];
  themeId?: string | null;
}

// --- 画像処理レスポンス ---
export interface ProcessImageResponse {
  processedImageBase64: string;
  originalSize: number;
  processedSize: number;
}

// --- API共通エラーレスポンス（改善案8） ---
export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: string;
}

// --- API共通成功レスポンス ---
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// --- ユーザープロフィール更新 ---
export interface UpdateProfileRequest {
  displayName?: string;
}

// --- クイズ表示用（フロントエンド） ---
export interface QuizDisplay {
  id: string;
  imageUrl: string;
  choices: string[];        // 正解 + ダミーをシャッフル済み
  answer: string;
  category: QuizCategory;
  creatorName: string;
  isOfficial: boolean;
}

// --- コレクション表示用 ---
export interface CollectionDisplay {
  quizId: string;
  imageUrl: string;
  answer: string;
  isUnlocked: boolean;
  answeredAt?: Timestamp;
}

// --- 占い結果 ---
export interface Fortune {
  uid: string;
  date: string;              // YYYY-MM-DD
  fortuneText: string;       // AI生成テキスト
  characterImageUrl: string; // 今日のキャラ画像URL
  createdAt: Timestamp;
}

// --- チャットメッセージ ---
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;         // 生成画像URL
  createdAt: Date;
}
