import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { InteractiveButton } from '../components/InteractiveButton';
import { getCulturalRecommendation } from '../services/geminiService';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import { Loader2, Sparkles, Instagram, Twitter, MessageCircle } from 'lucide-react';

export const RecommendationScreen: React.FC = () => {
  const { selectedGenres, answers, recommendation, setRecommendation, setStep, sessionId } = useStore();
  const [loading, setLoading] = useState(!recommendation);

  useEffect(() => {
    if (!recommendation) {
      const fetchRecommendation = async () => {
        const text = await getCulturalRecommendation(selectedGenres, answers);
        setRecommendation(text);
        setLoading(false);

        // Store session data
        try {
          await setDoc(doc(db, 'sessions', sessionId), {
            sessionId,
            genres: selectedGenres,
            answers,
            recommendation: text,
            timestamp: Date.now(),
            completed: true
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `sessions/${sessionId}`);
        }
      };
      fetchRecommendation();
    }
  }, [recommendation, selectedGenres, answers, sessionId, setRecommendation]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="mb-8"
        >
          <Loader2 className="w-16 h-16 text-brand" />
        </motion.div>
        <h2 className="text-3xl font-display font-medium uppercase tracking-[0.3em] animate-pulse">
          Synthesizing <span className="text-brand">Future</span>
        </h2>
        <p className="mt-4 text-white/40 font-mono text-sm tracking-widest">GEMINI_CORE_LINKING...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-8 pt-24 max-w-6xl mx-auto">
      <header className="mb-16 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Sparkles className="text-brand w-6 h-6" />
          <span className="text-brand font-mono text-sm tracking-[0.3em] uppercase">Phase 03 / Revelation</span>
        </div>
        <h2 className="text-6xl font-display font-bold uppercase tracking-tight">Your Cultural <span className="text-brand">Signature</span></h2>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[3rem] p-12 border-brand/20 shadow-[0_0_50px_rgba(225,29,72,0.1)] mb-16"
      >
        <div className="prose prose-invert max-w-none prose-headings:font-display prose-headings:uppercase prose-headings:text-brand prose-p:text-white/80 prose-p:text-lg prose-p:leading-relaxed">
           <ReactMarkdown>{recommendation || ''}</ReactMarkdown>
        </div>
      </motion.div>

      <div className="flex justify-center gap-8 mb-24">
        <InteractiveButton
          onClick={() => setStep('social')}
          className="px-20 py-6 glass-red rounded-full"
        >
          <span className="text-xl font-display font-bold uppercase tracking-widest">Connect with Community</span>
        </InteractiveButton>
      </div>
    </div>
  );
};
