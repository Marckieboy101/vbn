import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { InteractiveButton } from '../components/InteractiveButton';
import { GestureSlider } from '../components/GestureSlider';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';

const QUESTIONS = [
  { id: 'duration', text: "Ik geniet van lange, epische films die een complexe wereld opbouwen.", min: "Kort", max: "Episch" },
  { id: 'immersion', text: "Ik wil volledig ondergedompeld worden in een virtuele omgeving.", min: "Passief", max: "Meeslepend" },
  { id: 'social', text: "Ik deel culturele ervaringen het liefst met een grote groep.", min: "Solo", max: "Sociaal" },
  { id: 'breaks', text: "Ik waardeer af en toe een pauze voor reflectie tijdens digitale kunst.", min: "Continu", max: "Gedoseerd" },
];

export const QuestionFlowScreen: React.FC = () => {
  const { answers, setAnswer, setStep } = useStore();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showContinue, setShowContinue] = useState(false);
  
  const question = QUESTIONS[currentIdx];
  const progress = ((currentIdx + 1) / QUESTIONS.length) * 100;

  const next = () => {
    if (currentIdx < QUESTIONS.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setShowContinue(false);
    } else {
      setStep('social');
    }
  };

  const prev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      setShowContinue(true); // Since it was already answered
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 max-w-4xl mx-auto overflow-hidden">
      <header className="mb-20 text-center w-full">
        {/* Progress Bar */}
        <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-brand"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.05, y: -20 }}
          className="w-full glass p-12 rounded-[3rem] border-white/5"
        >
          <h2 className="text-4xl md:text-5xl font-display font-medium text-center mb-12 leading-tight">
            {question.text}
          </h2>

          <GestureSlider 
            value={answers[question.id] ?? 50} 
            onChange={(val) => setAnswer(question.id, val)}
            onInteractionEnd={() => setShowContinue(true)}
            minLabel={question.min}
            maxLabel={question.max}
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation - Fixed at bottom */}
      <div className="fixed bottom-12 left-0 w-full flex justify-center items-center pointer-events-none z-50">
        <div className="flex items-center gap-4 pointer-events-auto">
          <AnimatePresence>
            {currentIdx > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <InteractiveButton
                  onClick={prev}
                  className="p-2 rounded-full glass border-white/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </InteractiveButton>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showContinue && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <InteractiveButton
                  onClick={next}
                  className="px-8 py-3 glass-red rounded-full flex items-center gap-4 group shadow-[0_0_40px_rgba(225,29,72,0.3)] hover:shadow-[0_0_60px_rgba(225,29,72,0.5)] transition-all duration-500"
                >
                  <span className="text-base font-display font-bold uppercase tracking-[0.2em] text-brand group-hover:text-white">
                    {currentIdx === QUESTIONS.length - 1 ? 'Analyseer Reeks' : 'Doorgaan'}
                  </span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </InteractiveButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

