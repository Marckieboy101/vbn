import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { Coffee, RefreshCcw, Heart } from 'lucide-react';
import { InteractiveButton } from '../components/InteractiveButton';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export const ThankYouScreen: React.FC = () => {
  const { reset, sessionId, selectedGenres, answers } = useStore();

  useEffect(() => {
    // Save the interaction data as "completed"
    const saveProgress = async () => {
      try {
        await setDoc(doc(db, 'sessions', sessionId), {
          sessionId,
          genres: selectedGenres,
          answers,
          timestamp: Date.now(),
          completed: true,
          thanked: true
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `sessions/${sessionId}`);
      }
    };
    saveProgress();

    // Auto-reset timer (10 seconds)
    const timer = setTimeout(() => {
      reset();
    }, 10000);

    return () => clearTimeout(timer);
  }, [sessionId, selectedGenres, answers, reset]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-brand/5 blur-[120px] rounded-full" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center relative z-10 max-w-2xl"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-24 h-24 bg-brand/10 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-brand/20 shadow-[0_0_40px_rgba(255,80,80,0.1)]"
        >
          <Heart className="w-10 h-10 text-brand" />
        </motion.div>

        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-5xl md:text-7xl font-display font-bold uppercase mb-6 tracking-tight"
        >
          Bedankt <span className="text-brand">voor je deelname</span>
        </motion.h1>

        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xl text-white/60 mb-12 leading-relaxed"
        >
          We hopen je snel te zien in Theater van Beresteyn.
        </motion.p>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center gap-8"
        >
          <InteractiveButton 
            onClick={reset}
            className="px-12 py-4 glass-red rounded-full group"
          >
            <div className="flex items-center gap-3">
              <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
              <span className="text-base font-display font-bold uppercase tracking-widest">
                Herstart Protocol
              </span>
            </div>
          </InteractiveButton>

          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/20">
            Systeem gereed voor volgende reeks
          </p>
        </motion.div>
      </motion.div>

      {/* Subtle bottom detail */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 text-white/10"
      >
        <Coffee className="w-4 h-4" />
        <span className="font-mono text-[10px] uppercase tracking-widest">Gemaakt voor Cultuur</span>
      </motion.div>
    </div>
  );
};
