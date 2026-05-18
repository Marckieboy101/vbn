import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { ArrowRight, Share2, Users } from 'lucide-react';
import { InteractiveButton } from '../components/InteractiveButton';

import qrCode from '../afbeeldingen/qrcode3.png';

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

        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-5xl md:text-7xl font-display font-bold uppercase mb-12 tracking-tight leading-none"
        >
          Join <span className="text-brand">de</span> <br />Communitie
        </motion.h1>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
          className="relative group mb-16"
        >
          {/* QR Code Container */}
          <div className="w-54 h-54 md:w-70 md:h-70 mx-auto p-4 glass rounded-[2.5rem] border-white/10 relative overflow-hidden flex items-center justify-center bg-black/20 backdrop-blur-xl group-hover:border-brand/30 transition-all duration-700 shadow-[0_0_80px_rgba(0,0,0,0.5)]">
            
            <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            {/* QR Code Image */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <img
                src={qrCode}
                alt="QR Code"
                className="
                  w-full
                  h-full
                  object-contain
                  opacity-80
                  group-hover:opacity-100
                  group-hover:scale-105
                  transition-all
                  duration-500
                "
              />
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
              className="absolute left-4 right-4 h-[2px] bg-brand/50 shadow-[0_0_15px_rgba(225,29,72,0.5)] z-20"
            />
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
        </motion.div>
      </motion.div>

      {/* Background aesthetic details */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand/20 to-transparent opacity-20" />
    </div>
  );
};