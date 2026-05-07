import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { InteractiveButton } from '../components/InteractiveButton';
import { MousePointer2, Move, Hand, ThumbsUp } from 'lucide-react';

const InstructionCard: React.FC<{ icon: React.ReactNode, title: string, text: string, delay: number }> = ({ icon, title, text, delay }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    className="glass p-8 rounded-3xl flex flex-col items-center text-center gap-4 hover:border-brand/40 transition-colors duration-500"
  >
    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-brand">
      {icon}
    </div>
    <h3 className="text-xl font-display font-bold uppercase tracking-wide">{title}</h3>
    <p className="text-white/50 text-sm">{text}</p>
  </motion.div>
);

export const IntroductionScreen: React.FC = () => {
  const setStep = useStore((state) => state.setStep);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-6xl w-full"
      >
        <header className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold uppercase tracking-tight mb-4">
            Gebaarbediening <span className="text-brand">Protocol</span>
          </h2>
          <p className="text-white/40 max-w-xl mx-auto">
            Gebruik je webcam om interactie te hebben met de ervaring. 
            Zorg dat je hand duidelijk zichtbaar is.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <InstructionCard 
            icon={<Move className="w-8 h-8" />}
            title="Navigeren"
            text="Beweeg je wijsvinger om de cursor te besturen."
            delay={0.2}
          />
          <InstructionCard 
            icon={<MousePointer2 className="w-8 h-8" />}
            title="Selecteren"
            text="Beweeg over elementen gedurende 3 seconden voor interactie."
            delay={0.4}
          />
          <InstructionCard 
            icon={<Hand className="w-8 h-8" />}
            title="Knijpen"
            text="Knijp duim en wijsvinger samen om schuifregelaars te slepen."
            delay={0.6}
          />
          <InstructionCard 
            icon={<ThumbsUp className="w-8 h-8" />}
            title="Bevestigen"
            text="Een duim omhoog bevestigt je uiteindelijke keuze."
            delay={0.8}
          />
        </div>

        <div className="flex justify-center">
          <InteractiveButton 
            onClick={() => setStep('genre')}
            className="px-12 py-4 glass rounded-full bg-white/5 hover:bg-white/10 transition-all"
          >
            <span className="text-base font-display font-medium uppercase tracking-widest">
              Kalibreren & Doorgaan
            </span>
          </InteractiveButton>
        </div>
      </motion.div>
    </div>
  );
};
