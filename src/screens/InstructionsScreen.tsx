import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { InteractiveButton } from '../components/InteractiveButton';
import { Hand, MousePointerClick, MoveHorizontal } from 'lucide-react';

const InstructionStep: React.FC<{ icon: React.ReactNode, title: string, text: string, delay: number }> = ({ icon, title, text, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.8 }}
    className="glass p-10 rounded-[2.5rem] flex flex-col items-center text-center gap-6 hover:border-brand/40 transition-all duration-500 group"
  >
    <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-brand group-hover:scale-110 group-hover:bg-brand/10 transition-all duration-500 shadow-[0_0_30px_rgba(255,255,255,0.02)]">
      {icon}
    </div>
    <div>
      <h3 className="text-2xl font-display font-bold uppercase tracking-wider mb-3">{title}</h3>
      <p className="text-white/50 leading-relaxed">{text}</p>
    </div>
  </motion.div>
);

export const InstructionsScreen: React.FC = () => {
  const setStep = useStore((state) => state.setStep);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand/5 rounded-full blur-[120px] -z-10" />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-6xl w-full"
      >
        <header className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-7xl font-display font-bold uppercase tracking-tighter mb-6 leading-none">
              Hoe werkt de <span className="text-brand">Slider</span>?
            </h2>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <InstructionStep 
            icon={<Hand className="w-10 h-10" />}
            title="Positioneer"
            text="Houd je hand voor de camera zodat de tracker de cirkel boven de slider kan vinden."
            delay={0.2}
          />
          <InstructionStep 
            icon={<MousePointerClick className="w-10 h-10" />}
            title="Grijp"
            text="Breng je duim en wijsvinger naar elkaar (knijpgebaar) om de cirkel 'vast te pakken'."
            delay={0.4}
          />
          <InstructionStep 
            icon={<MoveHorizontal className="w-10 h-10" />}
            title="Sleep"
            text="Blijf knijpen en beweeg je hand naar links of rechts om de waarde aan te passen."
            delay={0.6}
          />
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          <InteractiveButton 
            onClick={() => setStep('genre')}
            className="px-8 py-4 glass rounded-full bg-white/5 hover:bg-white/10 transition-all group"
          >
            <span className="text-base font-display font-medium uppercase tracking-[0.2em] text-white/60 group-hover:text-white transition-colors">
              Vorige
            </span>
          </InteractiveButton>

          <InteractiveButton 
            onClick={() => setStep('questions')}
            className="px-16 py-6 glass rounded-full bg-white/5 hover:bg-white/10 transition-all group overflow-hidden relative"
          >
            <span className="relative z-10 text-xl font-display font-bold uppercase tracking-[0.2em] group-hover:text-brand transition-colors">
              Ga naar de slide pagina's
            </span>
          </InteractiveButton>
        </div>
      </motion.div>
    </div>
  );
};
