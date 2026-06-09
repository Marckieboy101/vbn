import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { InteractiveButton } from '../components/InteractiveButton';
import { useGesture } from '../components/GestureProvider';
import { CameraOff, MousePointer, RotateCcw } from 'lucide-react';

export const LandingScreen: React.FC = () => {
  const { step, setStep } = useStore();
  const { isVisible, error } = useGesture();
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
      setStep('intro_video');
    }
  }, [detectionProgress, setStep, step]);

  return (
    <div 
      onClick={() => {
        // Prevent clicking background if error is shown to avoid accidental navigations
        if (!error) {
          setStep('intro_video');
        }
      }}
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
        className="max-w-4xl pointer-events-none flex flex-col items-center"
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



        {/* Camera Permission Error Overlay & Manual Mouse/Touch Fallback */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="pointer-events-auto w-full max-w-xl mx-auto glass p-6 rounded-2xl border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-4 mt-4 text-left select-text relative overflow-hidden"
              onClick={(e) => e.stopPropagation()} // Prevent triggering parent div click
            >
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-brand/5 rounded-full blur-2xl" />
              
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-brand shrink-0">
                  <CameraOff className="w-6 h-6 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-brand font-bold mb-1">
                    Cameratoegang Niet Beschikbaar
                  </h3>
                  <p className="text-white/80 text-sm font-medium leading-relaxed mb-2">
                    {error}
                  </p>
                  <p className="text-white/55 text-xs flex items-center gap-1.5 leading-snug">
                    <MousePointer className="w-3.5 h-3.5 text-glow-red animate-pulse shrink-0" />
                    <span>Geen probleem! Bestuur de gehele ervaring eenvoudig met je <strong>computermuis</strong> of <strong>touchscreen</strong>.</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons Container */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 font-mono text-xs">
                {/* Fallback Entry Button */}
                <InteractiveButton
                  onClick={() => setStep('intro_video')}
                  className="flex-1 bg-brand text-white border border-brand hover:bg-brand-hover hover:border-brand-hover active:scale-[0.98] py-3.5 px-6 rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,80,80,0.4)] tracking-wider text-[11px] uppercase"
                >
                  <span>Met Muis / Touch Besturen &rarr;</span>
                </InteractiveButton>

                {/* Optional Retry Button */}
                <button
                  onClick={() => {
                    setStep('voice_feedback');
                  }}
                  className="px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 active:scale-[0.98] text-white/80 hover:text-white font-medium flex items-center justify-center gap-2 tracking-wider text-[11px] uppercase transition-all duration-300"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Feedback geven</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


      </motion.div>
    </div>
  );
};
