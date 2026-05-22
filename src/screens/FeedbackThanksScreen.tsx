import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { CheckCircle2, ArrowRight, BrainCircuit } from 'lucide-react';
import { InteractiveButton } from '../components/InteractiveButton';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export const FeedbackThanksScreen: React.FC = () => {
  const { setStep, sessionId, selectedGenres, answers } = useStore();

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
          feedback_received: true
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}`);
      }
    };
    saveProgress();
  }, [sessionId, selectedGenres, answers]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand/10 blur-[120px] rounded-full opacity-30 animate-pulse" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center relative z-10 max-w-3xl"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
          className="w-24 h-24 bg-brand/10 border border-brand/30 rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(255,80,80,0.2)]"
        >
          <CheckCircle2 className="w-12 h-12 text-brand" />
        </motion.div>

        <h1 className="text-5xl md:text-7xl font-display font-bold uppercase mb-6 tracking-tight">
          Bedankt voor <span className="text-brand">jouw feedback</span>
        </h1>

        <p className="text-xl text-white/60 mb-16 max-w-xl mx-auto font-light leading-relaxed">
          Jouw antwoorden zijn succesvol opgeslagem, bedankt voor je mening!
        </p>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col items-center gap-8"
        >
          <InteractiveButton 
            onClick={() => setStep('voice_feedback')}
            className="px-8 py-4 glass-red rounded-full group overflow-hidden relative"
          >
            <div className="flex items-center gap-2 relative z-1">
              <span className="text-xl font-display font-bold uppercase tracking-[0.2em] text-brand group-hover:text-white transition-colors">
                Volgende Stap
              </span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-500" />
            </div>
          </InteractiveButton>
<<<<<<< Updated upstream
=======

          <div className="flex items-center gap-3 text-white/20 font-mono text-[9px] uppercase tracking-[0.5em] font-black">
            <BrainCircuit className="w-4 h-4" />
            <span>Analyse Voltooid</span>
          </div>
>>>>>>> Stashed changes
        </motion.div>
      </motion.div>
    </div>
  );
};
