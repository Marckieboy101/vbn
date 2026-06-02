import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { QrCode, ArrowRight, Share2, Users } from 'lucide-react';
import { InteractiveButton } from '../components/InteractiveButton';

export const CommunityScreen: React.FC = () => {
  const { setStep } = useStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/10 blur-[150px] rounded-full opacity-50" />
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center relative z-10 w-full max-w-2xl mx-auto"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
        >
          <Users className="w-4 h-4 text-brand" />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/60">Community Connection</span>
        </motion.div>

        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-5xl md:text-7xl font-display font-bold uppercase mb-12 tracking-tight leading-none"
        >
          Join <span className="text-brand">de</span> Community
        </motion.h1>

        <motion.div 
                
        >
          {/* QR Code Container */}
          <div className="w-64 h-64 md:w-80 md:h-80 mx-auto p-4 glass rounded-[2.5rem] border-white/10 relative overflow-hidden flex items-center justify-center bg-black/20 backdrop-blur-xl group-hover:border-brand/30 transition-all duration-700 shadow-[0_0_80px_rgba(0,0,0,0.5)]">
            
            {/* The "QR Code" (Using a styled SVG for consistent look) */}
            <div className="relative z-10 w-full h-full text-white/80 group-hover:text-brand transition-colors duration-500">
              <QrCode className="w-full h-full stroke-[1.5]" />
            </div>
            
            {/* Scanning animation line */}
            <motion.div 
              animate={{ 
                top: ['10%', '90%', '10%'],
                opacity: [0, 1, 0]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="absolute left-4 right-4 h-[2px] bg-brand/50 shadow-[0_0_15px_rgba(255,80,80,0.5)] z-20"
            />
          </div>
          
          {/* Subtle corner accents */}
          <div className="absolute top-0 left-1/2 -translate-x-[170px] -translate-y-4 md:-translate-x-[210px]">
            <Share2 className="w-6 h-6 text-white/5" />
          </div>
        </motion.div>

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
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-500" />
            </div>
          </InteractiveButton>

          <p className="font-mono text-[9px] uppercase tracking-[0.5em] text-white/20 font-black">
            Scan to synchronize digital footprint
          </p>
        </motion.div>
      </motion.div>

      {/* Background aesthetic details */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand/20 to-transparent opacity-20" />
    </div>
  );
};
