import { create } from 'zustand';
import { soundManager } from './lib/sound';
import { Archetype } from './types';
import { ARCHETYPES, calculateArchetype } from './lib/gamificationUtils';

interface ExperienceState {
  step: 'landing' | 'intro_video' | 'intro' | 'age_selection' | 'genre' | 'genre_confirmed' | 'instructions' | 'questions' | 'feedback_thanks' | 'voice_feedback' | 'thankyou' | 'social' | 'final';
  selectedGenres: string[];
  answers: Record<string, number>;
  recommendation: string | null;
  sessionId: string;
  isAdmin: boolean;
  soundEnabled: boolean;
  activeArchetype: Archetype;
  voiceFeedbackText?: string;
  voiceFeedbackOriginal?: string;
  ageGroup?: '15-17' | '18-22' | '23-27' | '';

  setStep: (step: ExperienceState['step']) => void;
  toggleGenre: (genre: string) => void;
  setAnswer: (id: string, value: number) => void;
  setRecommendation: (rec: string) => void;
  reset: () => void;
  setAdmin: (val: boolean) => void;
  toggleSound: () => void;
  setVoiceFeedback: (text: string, original?: string) => void;
  setAgeGroup: (ageGroup: '15-17' | '18-22' | '23-27') => void;
}

export const useStore = create<ExperienceState>((set) => ({
  step: 'landing',
  selectedGenres: [],
  answers: {},
  recommendation: null,
  sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
  isAdmin: false,
  soundEnabled: true,
  activeArchetype: ARCHETYPES[4], // Standard Hype Curator
  voiceFeedbackText: '',
  voiceFeedbackOriginal: '',
  ageGroup: '',

  setStep: (step) => {
    soundManager.play('TRANSITION', 0.4);
    set({ step });
  },

  toggleGenre: (genre) => {
    soundManager.play('HOVER', 0.3);
    set((state) => {
      if (state.selectedGenres.includes(genre)) {
        return state;
      }
      
      const nextGenres = [genre];
      const nextArchetype = calculateArchetype(nextGenres, state.answers);

      return {
        selectedGenres: nextGenres,
        activeArchetype: nextArchetype
      };
    });
  },

  setAnswer: (id, value) => {
    set((state) => {
      const nextAnswers = { ...state.answers, [id]: value };
      const nextArchetype = calculateArchetype(state.selectedGenres, nextAnswers);

      return {
        answers: nextAnswers,
        activeArchetype: nextArchetype
      };
    });
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
      sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
      activeArchetype: ARCHETYPES[4],
      voiceFeedbackText: '',
      voiceFeedbackOriginal: '',
      ageGroup: ''
    });
  },

  setAdmin: (isAdmin) => set({ isAdmin }),
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  setVoiceFeedback: (text, original = '') => set({ voiceFeedbackText: text, voiceFeedbackOriginal: original }),
  setAgeGroup: (ageGroup) => {
    soundManager.play('SUCCESS', 0.4);
    set({ ageGroup });
  },
}));
