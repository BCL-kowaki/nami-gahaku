// クイズプレイ状態ストア（Zustand）
import { create } from 'zustand';
import type { QuizDisplay } from '@/types';

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
}

export const useQuizStore = create<QuizState>((set) => ({
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
}));
