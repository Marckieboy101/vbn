import React, { useState } from 'react';
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
    id: 'sport', 
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
    label: 'Mindfuck', 
    color: 'from-pink-950/80', 
    image: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&q=80&w=800' 
  },
  { 
    id: 'scifi', 
    label: 'Sci-Fi', 
    color: 'from-cyan-950/80', 
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800' 
  },
];

export const GenreSelectionScreen: React.FC = () => {
  const { selectedGenres, toggleGenre, setStep } = useStore();
  const [isTransitioning, setIsTransitioning] = useState(false);

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-8 pt-20 max-w-[1200px] mx-auto justify-center">
      <header className="mb-10 md:mb-16 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold uppercase mb-3">Selecteer je <span className="text-brand">genre</span></h2>
        <p className="text-white/40 max-w-xl mx-auto text-sm sm:text-base">
          Kies een genre dat jij leuk vind.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6 max-w-4xl mx-auto w-full mb-12 md:mb-16">
        {GENRES.map((genre) => {
          const isSelected = selectedGenres.includes(genre.id);
          return (
            <InteractiveButton
              key={genre.id}
              disabled={isTransitioning}
              onClick={() => {
                if (isTransitioning) return;
                setIsTransitioning(true);
                toggleGenre(genre.id);
                setTimeout(() => {
                  setStep('genre_confirmed');
                }, 400);
              }}
              className={cn(
                "relative h-28 sm:h-44 md:h-52 lg:h-60 rounded-2xl md:rounded-3xl border overflow-hidden bg-black group transition-all duration-300",
                isSelected ? "border-brand shadow-[0_0_30px_rgba(255,80,80,0.15)] scale-[1.02]" : "border-white/10 glass hover:border-white/30 hover:scale-[1.01]",
                isTransitioning && !isSelected && "opacity-30 scale-95"
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
                    isSelected ? "scale-110 opacity-70 saturate-150" : "scale-100 opacity-30 grayscale group-hover:grayscale-0 group-hover:opacity-60"
                  )}
                  referrerPolicy="no-referrer"
                />
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-t to-transparent transition-opacity duration-700", 
                  genre.color, 
                  isSelected ? "opacity-100" : "opacity-45"
                )} />
              </div>
              
              <div className="absolute inset-0 p-3 sm:p-5 md:p-6 flex flex-col justify-between items-start z-10">
                <div className={cn(
                  "w-6 h-6 sm:w-8 md:w-10 md:h-10 rounded-full border flex items-center justify-center transition-all duration-500",
                  isSelected ? "bg-brand border-brand scale-110" : "border-white/20 bg-black/40 backrop-blur-sm"
                )}>
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="text-left w-full">
                  <h3 className="text-xs sm:text-lg md:text-xl lg:text-2xl font-display font-bold uppercase tracking-tight line-clamp-1">{genre.label}</h3>
                </div>
              </div>
            </InteractiveButton>
          );
        })}
      </div>
    </div>
  );
};
