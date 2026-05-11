import { create } from 'zustand';
import { soundManager } from './lib/sound';

interface ExperienceState {
  step: 'landing' | 'intro' | 'genre' | 'genre_confirmed' | 'instructions' | 'questions' | 'thankyou' | 'social' | 'final';
  selectedGenres: string[];
  answers: Record<string, number>;
  recommendation: string | null;
  sessionId: string;
  isAdmin: boolean;
  soundEnabled: boolean;
  
  setStep: (step: ExperienceState['step']) => void;
  toggleGenre: (genre: string) => void;
  setAnswer: (id: string, value: number) => void;
  setRecommendation: (rec: string) => void;
  reset: () => void;
  setAdmin: (val: boolean) => void;
  toggleSound: () => void;
}

export const useStore = create<ExperienceState>((set) => ({
  step: 'landing',
  selectedGenres: [],
  answers: {},
  recommendation: null,
  sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
  isAdmin: false,
  soundEnabled: true,

  setStep: (step) => {
    soundManager.play('TRANSITION', 0.4);
    set({ step });
  },
  toggleGenre: (genre) => {
    soundManager.play('HOVER', 0.3);
    set((state) => {
      // If it's already selected, don't change anything (prevents accidental deselection)
      if (state.selectedGenres.includes(genre)) {
        return state;
      }
      // Otherwise set to the new genre
      return {
        selectedGenres: [genre]
      };
    });
  },
  setAnswer: (id, value) => {
    // Only play sound if value changed significantly to avoid spam
    set((state) => ({
      answers: { ...state.answers, [id]: value }
    }));
  },
  setRecommendation: (recommendation) => {
    soundManager.play('SUCCESS', 0.5);
    set({ recommendation });
  },
  reset: () => {
    soundManager.play('SUCCESS', 0.4);
    set({
      step: 'landing',
      selectedGenres: [],
      answers: {},
      recommendation: null,
      sessionId: `session_${Math.random().toString(36).substr(2, 9)}`
    });
  },
  setAdmin: (isAdmin) => set({ isAdmin }),
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled }))
}));
