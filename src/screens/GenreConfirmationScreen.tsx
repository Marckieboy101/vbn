import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { CheckCircle2, Sparkles } from 'lucide-react';

export const GenreConfirmationScreen: React.FC = () => {
  const setStep = useStore((state) => state.setStep);
  const selectedGenres = useStore((state) => state.selectedGenres);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStep('instructions');
    }, 3000); // 3 seconds of glory

    return () => clearTimeout(timer);
  }, [setStep]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-brand to-transparent blur-2xl opacity-20"
            />
            <div className="glass-red p-6 rounded-full relative z-10">
              <CheckCircle2 className="w-16 h-16 text-brand" />
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.5, 0] }}
              transition={{ duration: 1, delay: 0.5 }}
              className="absolute inset-0 bg-brand rounded-full blur-xl opacity-30"
            />
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-4xl md:text-5xl font-display font-bold uppercase tracking-tighter mb-4"
        >
          Bedankt voor het kiezen van een <span className="text-brand">genre</span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-2 mb-8"
        >
          <Sparkles className="w-4 h-4 text-brand" />
          <p className="text-white/60 font-mono text-sm uppercase tracking-[0.3em]">
            Genre vastgelegd: <span className="text-white font-bold">{selectedGenres.join(', ')}</span>
          </p>
          <Sparkles className="w-4 h-4 text-brand" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-white/40 text-lg font-light tracking-wide"
        >
          We bereiden de vragen voor op basis van jouw interesses...
        </motion.p>
        
        {/* Progress loader */}
        <div className="mt-12 w-48 h-1 bg-white/5 rounded-full mx-auto overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 3, ease: "linear" }}
            className="h-full bg-brand shadow-[0_0_10px_#FF5050]"
          />
        </div>
      </motion.div>
    </div>
  );
};
