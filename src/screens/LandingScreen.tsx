import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { InteractiveButton } from '../components/InteractiveButton';
import { useGesture } from '../components/GestureProvider';
import { Sparkles, Scan, Loader2 } from 'lucide-react';

export const LandingScreen: React.FC = () => {
  const { step, setStep } = useStore();
  const { isVisible } = useGesture();
  const [detectionProgress, setDetectionProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isVisible) {
      // If detected, increase progress over 0.6 seconds for a faster, more responsive feel
      interval = setInterval(() => {
        setDetectionProgress(prev => Math.min(100, prev + 10));
      }, 30);
    } else {
      setDetectionProgress(0);
    }

    return () => clearInterval(interval);
  }, [isVisible]);

  useEffect(() => {
    if (detectionProgress >= 100 && step === 'landing') {
      setStep('intro');
    }
  }, [detectionProgress, setStep, step]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative">
      {/* Immersive Detection Overlay */}
      <AnimatePresence>
        {isVisible && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50 flex flex-col items-center justify-center"
          >
            {/* Detection Feedback */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* Progress Ring */}
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-white/5"
                  />
                  <motion.circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 88}
                    strokeDashoffset={2 * Math.PI * 88 * (1 - detectionProgress / 100)}
                    className="text-brand"
                    transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="w-4 h-4 bg-brand rounded-full animate-ping opacity-75" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: isVisible ? 0.4 : 1, 
          y: isVisible ? -20 : 0,
          scale: isVisible ? 0.95 : 1
        }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl"
      >
        <motion.h1 
          className="text-6xl md:text-8xl font-display font-bold mb-6 tracking-tighter uppercase leading-none"
          animate={{ 
            opacity: [0.85, 1, 0.85],
            scale: [0.98, 1, 0.98]
          }}
          transition={{ 
            duration: 5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          VanBeresteyn <br />
          <span className="text-brand text-glow-red">AI Experience</span>
        </motion.h1>

        <p className="text-xl md:text-2xl text-white/60 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
          Geef ons jouw mening en join de leukste community voor film liefhebbers
        </p>

        <div className="relative group">
          <InteractiveButton 
            onClick={() => setStep('intro')}
            className={`px-10 py-5 glass-red rounded-full transition-all duration-700 ${isVisible ? 'scale-90 opacity-20' : 'hover:scale-105'}`}
          >
            <span className="text-xl font-display font-bold uppercase tracking-widest text-brand group-hover:text-white transition-colors relative z-10 pointer-events-none">
              {isVisible ? 'Dectectie actief...' : 'Kom dichterbij of klik'}
            </span>
          </InteractiveButton>
          
          <motion.div 
            className="mt-8 text-white/20 font-mono text-[10px] uppercase tracking-[0.4em] flex items-center justify-center gap-2"
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Loader2 className="w-3 h-3 animate-spin" /> 
            Wachten op interactie
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
