import { triggerAutomaticGoogleSheetsSync } from '../services/googleSheetsService';

export interface SessionData {
  sessionId: string;
  genres?: string[];
  answers?: Record<string, number>;
  ageGroup?: string;
  archetypeId?: string;
  archetypeTitle?: string;
  voice_feedback?: string;
  voice_feedback_original?: string;
  voice_feedback_language?: string;
  voice_feedback_moderation_toxic?: boolean;
  voice_feedback_timestamp?: number;
  timestamp: number;
  completed?: boolean;
  thanked?: boolean;
  feedback_received?: boolean;
}

const STORAGE_KEY = 'vb_sessions';

export const getSavedSessions = (): SessionData[] => {
  if (typeof window === 'undefined') return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as SessionData[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
};

export const saveSessionData = (session: Partial<SessionData> & { sessionId: string }): SessionData => {
  const sessions = getSavedSessions();
  const now = Date.now();
  const existingIndex = sessions.findIndex((item) => item.sessionId === session.sessionId);

  const merged: SessionData = {
    sessionId: session.sessionId,
    genres: session.genres ?? sessions[existingIndex]?.genres ?? [],
    answers: session.answers ?? sessions[existingIndex]?.answers ?? {},
    ageGroup: session.ageGroup ?? sessions[existingIndex]?.ageGroup ?? '',
    archetypeId: session.archetypeId ?? sessions[existingIndex]?.archetypeId,
    archetypeTitle: session.archetypeTitle ?? sessions[existingIndex]?.archetypeTitle,
    voice_feedback: session.voice_feedback ?? sessions[existingIndex]?.voice_feedback,
    voice_feedback_original: session.voice_feedback_original ?? sessions[existingIndex]?.voice_feedback_original,
    voice_feedback_language: session.voice_feedback_language ?? sessions[existingIndex]?.voice_feedback_language,
    voice_feedback_moderation_toxic: session.voice_feedback_moderation_toxic ?? sessions[existingIndex]?.voice_feedback_moderation_toxic,
    voice_feedback_timestamp: session.voice_feedback_timestamp ?? sessions[existingIndex]?.voice_feedback_timestamp,
    timestamp: session.timestamp ?? sessions[existingIndex]?.timestamp ?? now,
    completed: session.completed ?? sessions[existingIndex]?.completed ?? false,
    thanked: session.thanked ?? sessions[existingIndex]?.thanked ?? false,
    feedback_received: session.feedback_received ?? sessions[existingIndex]?.feedback_received ?? false,
  };

  if (existingIndex >= 0) {
    sessions[existingIndex] = merged;
  } else {
    sessions.push(merged);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));

  // Probeer direct te synchroniseren met Google Sheets na elke update.
  triggerAutomaticGoogleSheetsSync().catch((error) => {
    console.warn('Automatische Google Sheets synchronisatie mislukt:', error);
  });

  return merged;
};

export const clearSavedSessions = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
};
