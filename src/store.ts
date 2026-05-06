import { create } from 'zustand';

interface ExperienceState {
  step: 'landing' | 'intro' | 'genre' | 'questions' | 'recommendation' | 'social' | 'final';
  selectedGenres: string[];
  answers: Record<string, number>;
  recommendation: string | null;
  sessionId: string;
  isAdmin: boolean;
  
  setStep: (step: ExperienceState['step']) => void;
  toggleGenre: (genre: string) => void;
  setAnswer: (id: string, value: number) => void;
  setRecommendation: (rec: string) => void;
  reset: () => void;
  setAdmin: (val: boolean) => void;
}

export const useStore = create<ExperienceState>((set) => ({
  step: 'landing',
  selectedGenres: [],
  answers: {},
  recommendation: null,
  sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
  isAdmin: false,

  setStep: (step) => set({ step }),
  toggleGenre: (genre) => set((state) => ({
    selectedGenres: state.selectedGenres.includes(genre)
      ? state.selectedGenres.filter(g => g !== genre)
      : [...state.selectedGenres, genre]
  })),
  setAnswer: (id, value) => set((state) => ({
    answers: { ...state.answers, [id]: value }
  })),
  setRecommendation: (recommendation) => set({ recommendation }),
  reset: () => set({
    step: 'landing',
    selectedGenres: [],
    answers: {},
    recommendation: null,
    sessionId: `session_${Math.random().toString(36).substr(2, 9)}`
  }),
  setAdmin: (isAdmin) => set({ isAdmin })
}));
