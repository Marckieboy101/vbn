import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { InteractiveButton } from '../components/InteractiveButton';
import { Sparkles, Smile, Shield, Rocket } from 'lucide-react';
import { cn } from '../lib/utils';

interface AgeOption {
  id: '12-13' | '14-15' | '16-18';
  range: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  bgGradient: string;
}

export const AgeSelectionScreen: React.FC = () => {
  const { setAgeGroup, setStep } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const ageOptions: AgeOption[] = [
    {
      id: '12-13',
      range: '12 - 13 jaar',
      label: 'Young Creators',
      description: 'Nieuwsgierig en creatief. Ontdek de vetste nieuwe filmvrienden en trends.',
      icon: <Smile className="w-8 h-8 text-white" />,
      bgGradient: 'from-amber-500/20 to-orange-600/10'
    },
    {
      id: '14-15',
      range: '14 - 15 jaar',
      label: 'Trendsetters',
      description: 'Grensverleggend en energiek. Ervaar actie, humor en meeslepende verhalen.',
      icon: <Rocket className="w-8 h-8 text-white" />,
      bgGradient: 'from-brand/20 to-purple-600/10'
    },
    {
      id: '16-18',
      range: '16 - 18 jaar',
      label: 'Cinema Connoisseurs',
      description: 'Rijp en scherpzinnig. Duik dieper in complexe plots en meesterlijke films.',
      icon: <Sparkles className="w-8 h-8 text-white" />,
      bgGradient: 'from-indigo-500/20 to-blue-600/10'
    }
  ];

  const handleSelect = (optionId: '12-13' | '14-15' | '16-18') => {
    if (isTransitioning) return;
    setSelectedId(optionId);
    setIsTransitioning(true);
    setAgeGroup(optionId);
    
    setTimeout(() => {
      setStep('genre');
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-8 pt-20 max-w-[1200px] mx-auto justify-center select-none">
      <header className="mb-12 md:mb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-4 text-xs font-mono tracking-widest text-brand uppercase"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Gepersonaliseerd Profiel</span>
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-5xl lg:text-6xl font-display font-bold uppercase mb-4 tracking-tight"
        >
          Kies je <span className="text-brand text-glow-red">Leeftijd</span>
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-white/40 max-w-xl mx-auto text-sm sm:text-base leading-relaxed"
        >
          Selecteer je leeftijdgroep zodat we de vetste video-reviews en films perfect op jouw niveau kunnen afstemmen.
        </motion.p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full mb-12">
        {ageOptions.map((option, index) => {
          const isSelected = selectedId === option.id;
          const otherIsSelected = selectedId !== null && !isSelected;
          
          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 * index + 0.3 }}
            >
              <InteractiveButton
                disabled={isTransitioning}
                onClick={() => handleSelect(option.id)}
                className={cn(
                  "relative w-full h-auto p-8 py-12 rounded-3xl border overflow-hidden transition-all duration-500 flex flex-col items-center justify-center text-center gap-6 group min-h-[180px]",
                  isSelected 
                    ? "border-brand bg-brand/5 shadow-[0_0_40px_rgba(255,80,80,0.25)] scale-[1.03]" 
                    : "border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04] hover:scale-[1.01]",
                  otherIsSelected && "opacity-30 scale-95"
                )}
              >
                {/* Visual Glow Effect */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none -z-10",
                  option.bgGradient
                )} />

                {/* Animated Inner Ring on Active selection */}
                {isSelected && (
                  <motion.div
                    layoutId="activeAgeGlow"
                    className="absolute inset-0 bg-brand/5 border border-brand/50 rounded-3xl -z-10"
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.02, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}

                <div className="flex-1 flex flex-col justify-center items-center text-center">
                  <h3 className={cn(
                    "text-3xl font-display font-bold uppercase tracking-tight transition-colors duration-500",
                    isSelected ? "text-white" : "text-white/90 group-hover:text-white"
                  )}>
                    {option.range}
                  </h3>
                </div>
              </InteractiveButton>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
