import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { InteractiveButton } from '../components/InteractiveButton';
import { useGesture } from '../components/GestureProvider';
import { Sparkles, Scan, Loader2 } from 'lucide-react';

export const LandingScreen: React.FC = () => {
  const { step, setStep } = useStore();
  const { isVisible, error, retry } = useGesture();
  const [detectionProgress, setDetectionProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isVisible && !error) {
      // If detected, increase progress over 3 seconds as requested
      interval = setInterval(() => {
        setDetectionProgress(prev => Math.min(100, prev + 1));
      }, 30);
    } else {
      setDetectionProgress(0);
    }

    return () => clearInterval(interval);
  }, [isVisible, error]);

  useEffect(() => {
    if (detectionProgress >= 100 && step === 'landing') {
      setStep('intro');
    }
  }, [detectionProgress, setStep, step]);

  return (
    <div 
      onClick={() => setStep('intro')}
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative cursor-pointer select-none"
    >
      {/* Immersive Detection Overlay */}
      <AnimatePresence>
        {isVisible && !error && (
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
          opacity: isVisible && !error ? 0.4 : 1, 
          y: isVisible && !error ? -20 : 0,
          scale: isVisible && !error ? 0.95 : 1
        }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl pointer-events-none"
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
          KOM <br />
          <span className="text-brand text-glow-red">DICHTERBIJ</span>
        </motion.h1>

        <p className="text-xl md:text-2xl text-white/60 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
          Geef ons jouw mening en join de leukste community voor film liefhebbers
        </p>
      </motion.div>
    </div>
  );
};
