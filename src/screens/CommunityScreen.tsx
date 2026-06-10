import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { ArrowRight, Share2 } from 'lucide-react';
import { InteractiveButton } from '../components/InteractiveButton';

export const CommunityScreen: React.FC = () => {
  const { setStep } = useStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/10 blur-[150px] rounded-full opacity-50" />

      {/* Title */}
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-5xl md:text-7xl font-display font-bold uppercase mb-12 tracking-tight leading-none text-center"
      >
        Join <span className="text-brand">de</span> Community
      </motion.h1>

      {/* QR Section */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="group w-72 h-72 md:w-[336px] md:h-[336px] mx-auto mb-10 p-4 glass rounded-none border border-white/10 relative overflow-hidden flex items-center justify-center bg-black/20 backdrop-blur-xl hover:border-brand/30 transition-all duration-700 shadow-[0_0_80px_rgba(0,0,0,0.5)]">
          <div className="relative z-10 w-full h-full transition-transform duration-500 group-hover:scale-105">
            <img
              src="/qrcode.png"
              alt="QR Code"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Scanning line */}
          <motion.div
            animate={{
              top: ['10%', '90%', '10%'],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute left-4 right-4 h-[2px] bg-brand/50 shadow-[0_0_15px_rgba(255,80,80,0.5)] z-20"
          />
        </div>

        {/* Corner accent */}
        <div className="absolute top-0 left-1/2 -translate-x-[170px] -translate-y-4 md:-translate-x-[210px]">
          <Share2 className="w-6 h-6 text-white/5" />
        </div>
      </motion.div>

      {/* Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col items-center gap-8"
      >
        <InteractiveButton
          onClick={() => setStep('thankyou')}
          className="px-12 py-5 glass-red rounded-full group min-w-[280px]"
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-base font-display font-bold uppercase tracking-[0.3em]">
              Finish Experience
            </span>
            <ArrowRight className="w-5 h-5 transition-transform duration-500 group-hover:translate-x-2" />
          </div>
        </InteractiveButton>
      </motion.div>

      {/* Bottom line */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand/20 to-transparent opacity-20" />
    </div>
  );
};