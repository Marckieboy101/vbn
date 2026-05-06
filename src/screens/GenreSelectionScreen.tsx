import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { InteractiveButton } from '../components/InteractiveButton';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';

const GENRES = [
  { id: 'horror', label: 'Horror', color: 'from-red-900/40' },
  { id: 'comedy', label: 'Comedy', color: 'from-amber-900/40' },
  { id: 'sports', label: 'Sports', color: 'from-blue-900/40' },
  { id: 'thriller', label: 'Thriller', color: 'from-purple-900/40' },
  { id: 'adventure', label: 'Adventure', color: 'from-emerald-900/40' },
  { id: 'romance', label: 'Romance', color: 'from-pink-900/40' },
];

export const GenreSelectionScreen: React.FC = () => {
  const { selectedGenres, toggleGenre, setStep } = useStore();

  return (
    <div className="min-h-screen flex flex-col p-8 pt-20 max-w-7xl mx-auto">
      <header className="mb-12 text-center">
        <motion.span 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-brand font-mono text-sm tracking-[0.3em] uppercase mb-4 block"
        >
          Phase 01 / Perception
        </motion.span>
        <h2 className="text-5xl font-display font-bold uppercase mb-4">Select your <span className="text-brand">Vibe</span></h2>
        <p className="text-white/40 max-w-2xl mx-auto">
          Hover to toggle categories that resonate with your current mood. 
          We'll use these to calibrate your cultural recommendation.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-16">
        {GENRES.map((genre, idx) => {
          const isSelected = selectedGenres.includes(genre.id);
          return (
            <InteractiveButton
              key={genre.id}
              onClick={() => toggleGenre(genre.id)}
              className={cn(
                "relative h-64 rounded-[2rem] border overflow-hidden",
                isSelected ? "border-brand shadow-[0_0_30px_rgba(225,29,72,0.2)]" : "border-white/10 glass hover:border-white/30"
              )}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-t to-transparent transition-opacity duration-700", genre.color, isSelected ? "opacity-100" : "opacity-0")} />
              
              <div className="absolute inset-0 p-8 flex flex-col justify-between items-start">
                <div className={cn(
                  "w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-500",
                  isSelected ? "bg-brand border-brand scale-110" : "border-white/20"
                )}>
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <Check className="w-6 h-6 text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="text-left">
                  <span className="text-white/30 font-mono text-xs mb-1 block">CAT_0{idx + 1}</span>
                  <h3 className="text-3xl font-display font-bold uppercase tracking-tight">{genre.label}</h3>
                </div>
              </div>

              {/* Decorative scanline */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-brand/30 animate-scanline pointer-events-none" />
            </InteractiveButton>
          );
        })}
      </div>

      <div className="flex justify-center">
        <InteractiveButton
          disabled={selectedGenres.length === 0}
          onClick={() => setStep('questions')}
          className={cn(
            "px-20 py-6 rounded-full transition-all duration-500",
            selectedGenres.length > 0 ? "glass-red" : "opacity-20 cursor-not-allowed"
          )}
        >
          <span className="text-xl font-display font-medium uppercase tracking-[0.2em]">Next Protocol</span>
        </InteractiveButton>
      </div>
    </div>
  );
};
