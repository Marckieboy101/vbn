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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/5 blur-[150px] rounded-full opacity-30 animate-pulse" />
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="text-center relative z-10 max-w-3xl"
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 260, 
            damping: 20,
            delay: 0.2 
          }}
          className="w-28 h-28 bg-brand/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-12 border border-brand/20 shadow-[0_0_50px_rgba(255,80,80,0.15)] bg-gradient-to-br from-brand/20 to-transparent"
        >
          <Heart className="w-12 h-12 text-brand fill-brand/20" />
        </motion.div>

        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-6xl md:text-8xl font-display font-bold uppercase mb-8 tracking-tighter leading-none"
        >
          Bedankt voor <br /><span className="text-brand">jouw bezoek!</span>
        </motion.h1>

        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-2xl text-white/50 mb-20 max-w-xl mx-auto font-light leading-relaxed"
        >
          We vonden het geweldig om je mee te nemen in onze wereld. <br />
          Zien we je snel in het echt bij <span className="text-white/80 font-medium">van Beresteyn</span>?
        </motion.p>

        {/* Visual Timer Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 10, ease: "linear" }}
              className="h-full bg-brand shadow-[0_0_15px_rgba(255,80,80,0.5)]"
            />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.6em] text-white/20 font-black animate-pulse">
            Systeem wordt gereset voor de volgende bezoeker
          </p>
        </motion.div>
      </motion.div>

      {/* Decorative details */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="fixed bottom-12 flex items-center gap-6 text-white/5"
      >
        <div className="h-[1px] w-12 bg-current" />
        <Heart className="w-4 h-4" />
        <div className="h-[1px] w-12 bg-current" />
      </motion.div>
    </div>
  );
};
