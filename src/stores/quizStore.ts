// クイズプレイ状態ストア（Zustand）
import { create } from 'zustand';
import type { QuizDisplay } from '@/types';

// 定数
export const QUIZ_PER_ROUND = 5;        // 1回あたりの問題数
export const POINTS_PER_QUESTION = 20;   // 1問あたりの得点
export const MAX_SCORE = QUIZ_PER_ROUND * POINTS_PER_QUESTION; // 100点満点

interface QuizState {
  currentQuiz: QuizDisplay | null;
  selectedAnswer: string | null;
  isAnswered: boolean;
  isCorrect: boolean | null;
  score: number;            // セッション内正解数
  totalAnswered: number;    // セッション内回答数
  isLoading: boolean;

  setCurrentQuiz: (quiz: QuizDisplay | null) => void;
  selectAnswer: (answer: string) => void;
  setResult: (isCorrect: boolean) => void;
  nextQuiz: () => void;
  resetSession: () => void;
  setLoading: (loading: boolean) => void;

  // 計算プロパティ用
  getPoints: () => number;
  isRoundComplete: () => boolean;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  currentQuiz: null,
  selectedAnswer: null,
  isAnswered: false,
  isCorrect: null,
  score: 0,
  totalAnswered: 0,
  isLoading: false,

  setCurrentQuiz: (quiz) => set({
    currentQuiz: quiz,
    selectedAnswer: null,
    isAnswered: false,
    isCorrect: null,
  }),

  selectAnswer: (answer) => set({ selectedAnswer: answer }),

  setResult: (isCorrect) => set((state) => ({
    isAnswered: true,
    isCorrect,
    score: isCorrect ? state.score + 1 : state.score,
    totalAnswered: state.totalAnswered + 1,
  })),

  nextQuiz: () => set({
    currentQuiz: null,
    selectedAnswer: null,
    isAnswered: false,
    isCorrect: null,
  }),

  resetSession: () => set({
    currentQuiz: null,
    selectedAnswer: null,
    isAnswered: false,
    isCorrect: null,
    score: 0,
    totalAnswered: 0,
    isLoading: false,
  }),

  setLoading: (loading) => set({ isLoading: loading }),

  // 得点（正解数 × 1問あたりのポイント）
  getPoints: () => get().score * POINTS_PER_QUESTION,

  // ラウンド完了判定（5問回答済み）
  isRoundComplete: () => get().totalAnswered >= QUIZ_PER_ROUND,
}));
