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
        <div className="flex items-center justify-center mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="p-4 rounded-full bg-brand/10 border border-brand/20 backdrop-blur-sm"
          >
            <Sparkles className="w-8 h-8 text-brand" />
          </motion.div>
        </div>

        <h1 className="text-6xl md:text-8xl font-display font-bold mb-6 tracking-tighter uppercase leading-none">
          VanBeresteyn <br />
          <span className="text-brand text-glow-red">AI Experience</span>
        </h1>

        <p className="text-xl md:text-2xl text-white/60 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
          Step into a futuristic cinematic realm where AI meets culture. 
          Control the experience with your hands and discover your digital preference profile.
        </p>

        <InteractiveButton 
          onClick={() => setStep('intro')}
          className="px-12 py-6 glass-red rounded-full group overflow-hidden"
        >
          <span className="text-2xl font-display font-medium uppercase tracking-widest text-brand group-hover:text-white transition-colors">
            Initialize Experience
          </span>
          <div className="absolute inset-0 bg-brand/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </InteractiveButton>

        <motion.div 
          className="mt-16 flex gap-8 justify-center items-center text-white/30 font-mono text-sm uppercase tracking-widest"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <span>1920x1080 Optimized</span>
          <span className="w-1 h-1 bg-white/20 rounded-full" />
          <span>Hand Gesture Enabled</span>
          <span className="w-1 h-1 bg-white/20 rounded-full" />
          <span>Powered by Gemini</span>
        </motion.div>
      </motion.div>
    </div>
  );
};
