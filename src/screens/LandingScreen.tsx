import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { InteractiveButton } from '../components/InteractiveButton';
import { Sparkles } from 'lucide-react';

export const LandingScreen: React.FC = () => {
  const setStep = useStore((state) => state.setStep);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl"
      >
        <h1 className="text-6xl md:text-8xl font-display font-bold mb-6 tracking-tighter uppercase leading-none">
          VanBeresteyn <br />
          <span className="text-brand text-glow-red">AI Experience</span>
        </h1>

        <p className="text-xl md:text-2xl text-white/60 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
          Geef ons jouw mening en join de leukste community voor film liefhebbers
        </p>

        <InteractiveButton 
          onClick={() => setStep('intro')}
          className="px-10 py-5 glass-red rounded-full group"
        >
          <span className="text-xl font-display font-bold uppercase tracking-widest text-brand group-hover:text-white transition-colors relative z-10 pointer-events-none">
            START DE ERVARING
          </span>
        </InteractiveButton>


      </motion.div>
    </div>
  );
};
