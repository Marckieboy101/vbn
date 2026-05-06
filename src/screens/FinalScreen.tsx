import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { useGesture } from '../components/GestureProvider';
import { ThumbsUp, RefreshCw } from 'lucide-react';
import { InteractiveButton } from '../components/InteractiveButton';

export const FinalScreen: React.FC = () => {
  const { reset } = useStore();
  const { isThumbUp } = useGesture();

  useEffect(() => {
    if (isThumbUp) {
      setTimeout(() => {
        reset();
      }, 2000);
    }
  }, [isThumbUp, reset]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center relative"
      >
        <div className="absolute inset-0 bg-brand/10 blur-[120px] rounded-full scale-150" />
        
        <div className="relative z-10">
          <motion.div
            animate={{ 
              scale: isThumbUp ? [1, 1.2, 1.1] : 1,
              rotate: isThumbUp ? [0, 5, -5, 0] : 0
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center border-2 mb-12 transition-colors duration-500 ${isThumbUp ? 'bg-brand border-brand shadow-[0_0_50px_rgba(225,29,72,0.5)]' : 'border-white/20 bg-white/5'}`}
          >
            <ThumbsUp className={`w-16 h-16 ${isThumbUp ? 'text-white' : 'text-white/20'}`} />
          </motion.div>

          <h2 className="text-6xl md:text-8xl font-display font-bold uppercase mb-8 tracking-tighter">
            Thank you <br />
            <span className="text-brand">Explorer</span>
          </h2>

          <p className="text-xl text-white/50 max-w-xl mx-auto mb-16">
            Your interaction data has been securely added to the cultural collective. 
            Give a <span className="text-white font-bold">Thumbs Up</span> gesture to return to start.
          </p>

          <div className="flex flex-col items-center gap-4">
             <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden relative">
               <motion.div 
                 className="absolute inset-y-0 left-0 bg-brand"
                 animate={{ width: isThumbUp ? '100%' : '0%' }}
                 transition={{ duration: 2 }}
               />
             </div>
             <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/30">
               {isThumbUp ? 'Returning to Landing Protocol...' : 'Confirm with Thumbs Up'}
             </p>
          </div>

          <motion.div className="mt-20">
            <InteractiveButton 
              onClick={reset}
              className="group"
            >
              <div className="flex items-center gap-3 text-white/20 group-hover:text-white transition-colors">
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                <span className="font-mono text-sm uppercase tracking-widest">Manual Restart</span>
              </div>
            </InteractiveButton>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
