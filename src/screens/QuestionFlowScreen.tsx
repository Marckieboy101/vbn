import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { InteractiveButton } from '../components/InteractiveButton';
import { GestureSlider } from '../components/GestureSlider';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';

const QUESTIONS = [
  { id: 'duration', text: "I enjoy long, epic movies that build a complex world.", min: "Short", max: "Epic" },
  { id: 'immersion', text: "I want to be completely immersed in a virtual environment.", min: "Passive", max: "Immersive" },
  { id: 'social', text: "I prefer sharing cultural experiences with a large group.", min: "Solo", max: "Social" },
  { id: 'breaks', text: "I appreciate occasional breaks for reflection during digital art.", min: "Non-stop", max: "Paced" },
];

export const QuestionFlowScreen: React.FC = () => {
  const { answers, setAnswer, setStep } = useStore();
  const [currentIdx, setCurrentIdx] = useState(0);
  
  const question = QUESTIONS[currentIdx];
  const progress = ((currentIdx + 1) / QUESTIONS.length) * 100;

  const next = () => {
    if (currentIdx < QUESTIONS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setStep('recommendation');
    }
  };

  const prev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 max-w-4xl mx-auto overflow-hidden">
      <header className="mb-20 text-center w-full">
        <div className="flex justify-between items-center mb-12">
          <span className="text-brand font-mono text-sm tracking-[0.3em] uppercase">Phase 02 / Analysis</span>
          <span className="text-white/30 font-mono text-sm">PROG_{currentIdx + 1}OF{QUESTIONS.length}</span>
        </div>
        
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
            value={answers[question.id] || 50} 
            onChange={(val) => setAnswer(question.id, val)}
            minLabel={question.min}
            maxLabel={question.max}
          />
        </motion.div>
      </AnimatePresence>

      <div className="mt-16 flex gap-8 w-full justify-center">
        <InteractiveButton
          onClick={prev}
          disabled={currentIdx === 0}
          className={cn("p-6 rounded-full glass border-white/10", currentIdx === 0 && "opacity-0 pointer-events-none")}
        >
          <ChevronLeft className="w-8 h-8" />
        </InteractiveButton>

        <InteractiveButton
          onClick={next}
          className="px-12 py-6 glass-red rounded-[2rem] flex items-center gap-4 group"
        >
          <span className="text-xl font-display font-bold uppercase tracking-[0.2em] text-brand group-hover:text-white">
            {currentIdx === QUESTIONS.length - 1 ? 'Analyze Data' : 'Next Question'}
          </span>
          <ChevronRight className="w-6 h-6" />
        </InteractiveButton>
      </div>
    </div>
  );
};

