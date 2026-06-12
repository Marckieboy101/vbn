import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { InteractiveButton } from '../components/InteractiveButton';

export const InstructionsScreen: React.FC = () => {
  const setStep = useStore((state) => state.setStep);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Achtergrond */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand/5 rounded-full blur-[120px] -z-10" />

      <div className="w-full max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="glass rounded-[2.5rem] overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
            {/* Linkerkant */}
            <div className="flex flex-col justify-center p-10 md:p-16">
              <h3 className="text-4xl md:text-5xl font-display font-bold uppercase tracking-tight mb-8">
                Zo gebruik je de sliders
              </h3>

              <div className="space-y-6 text-lg md:text-xl text-white/60 leading-relaxed">
                <p>
                  Beweeg je hand voor de camera om de sliders te bedienen.
                </p>

                <p>
                  Doe je duim en wijsvingers dichter naar elkaar toe en doe ze weer open om het los te laten.
                </p>

                <p>
                  Neem rustig de tijd om alle vragen in te vullen. Zodra je
                  klaar bent, wordt jouw persoonlijke advies samengesteld.
                </p>
              </div>

              <div className="mt-12 flex flex-col sm:flex-row gap-4">
  <InteractiveButton
    onClick={() => setStep('genre')}
    className="px-8 py-2.5 glass rounded-full bg-white/5 hover:bg-white/10 transition-all group"
  >
    <span className="text-base font-display font-medium uppercase tracking-[0.2em] text-white/60 group-hover:text-white transition-colors">
      Vorige
    </span>
  </InteractiveButton>

  <InteractiveButton
  onClick={() => setStep('questions')}
  className="px-16 py-3 glass rounded-full bg-white/5 hover:bg-white/10 transition-all group overflow-hidden relative"
>
  <span className="relative z-10 whitespace-nowrap text-lg md:text-xl font-display font-bold uppercase tracking-[0.15em] group-hover:text-brand transition-colors">
    Start met de sliders
  </span>
</InteractiveButton>
</div>
            </div>

            {/* Rechterkant - Video */}
            <div className="relative bg-white/5">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              >
                <source src="/vingers3.mp4" type="video/mp4" />
              </video>

              <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};