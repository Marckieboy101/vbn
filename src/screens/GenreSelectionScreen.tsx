import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { InteractiveButton } from '../components/InteractiveButton';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';

const GENRES = [
  { 
    id: 'comedy', 
    label: 'Komedie', 
    color: 'from-amber-950/80', 
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=800' 
  },
  { 
    id: 'sports', 
    label: 'Sport', 
    color: 'from-blue-950/80', 
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=800' 
  },
  { 
    id: 'thriller', 
    label: 'Thriller', 
    color: 'from-purple-950/80', 
    image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=800' 
  },
  { 
    id: 'adventure', 
    label: 'Avontuur', 
    color: 'from-emerald-950/80', 
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800' 
  },
  { 
    id: 'romance', 
    label: 'Romantiek', 
    color: 'from-pink-950/80', 
    image: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&q=80&w=800' 
  },
    { 
    id: 'fantasie', 
    label: 'Fantasie', 
    color: 'from-pink-950/80', 
    image: 'https://images.unsplash.com/photo-1656878564120-ab988c47f0b5?q=80&w=928&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' 
  },
];

export const GenreSelectionScreen: React.FC = () => {
  const { selectedGenres, toggleGenre, setStep } = useStore();

  return (
    <div className="min-h-screen flex flex-col p-8 pt-20 max-w-[1400px] mx-auto justify-center">
      <header className="mb-16 text-center">
        <h2 className="text-4xl md:text-5xl font-display font-bold uppercase mb-4">Selecteer je <span className="text-brand">Sfeer</span></h2>
        <p className="text-white/40 max-w-xl mx-auto text-base">
          Selecteer een genre dat je leuk vind
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 mb-20">
        {GENRES.map((genre, idx) => {
          const isSelected = selectedGenres.includes(genre.id);
          return (
            <InteractiveButton
              key={genre.id}
              onClick={() => toggleGenre(genre.id)}
              className={cn(
                "relative h-48 rounded-3xl border overflow-hidden bg-black group",
                isSelected ? "border-brand shadow-[0_0_30px_rgba(225,29,72,0.2)]" : "border-white/10 glass hover:border-white/30"
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId={`pulse-${genre.id}`}
                  className="absolute inset-0 z-0 bg-brand/5"
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.02, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              )}
              <div className="absolute inset-0 z-0">
                <img 
                  src={genre.image} 
                  alt={genre.label}
                  className={cn(
                    "w-full h-full object-cover transition-all duration-700",
                    isSelected ? "scale-110 opacity-70 saturate-150" : "scale-100 opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-60"
                  )}
                  referrerPolicy="no-referrer"
                />
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-t to-transparent transition-opacity duration-700", 
                  genre.color, 
                  isSelected ? "opacity-100" : "opacity-40"
                )} />
              </div>
              
              <div className="absolute inset-0 p-6 flex flex-col justify-between items-start z-10">
                <div className={cn(
                  "w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-500",
                  isSelected ? "bg-brand border-brand scale-110" : "border-white/20"
                )}>
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <Check className="w-5 h-5 text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="text-left">
                  <h3 className="text-xl font-display font-bold uppercase tracking-tight">{genre.label}</h3>
                </div>
              </div>
            </InteractiveButton>
          );
        })}
      </div>

      <div className="flex justify-center">
        <InteractiveButton
          disabled={selectedGenres.length === 0}
          onClick={() => setStep('instructions')}
          className={cn(
            "px-12 py-4 rounded-full transition-all duration-500",
            selectedGenres.length > 0 ? "glass-red" : "opacity-20 cursor-not-allowed"
          )}
        >
          <span className="text-base font-display font-medium uppercase tracking-[0.2em]">Dit genre kiezen</span>
        </InteractiveButton>
      </div>
    </div>
  );
};
