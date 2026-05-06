import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'motion/react';
import { useGesture } from './GestureProvider';

export const FuturisticCursor: React.FC = () => {
  const { x, y, isPinching, isVisible } = useGesture();
  
  const springConfig = { damping: 25, stiffness: 200 };
  const cursorX = useSpring(useMotionValue(window.innerWidth / 2), springConfig);
  const cursorY = useSpring(useMotionValue(window.innerHeight / 2), springConfig);

  useEffect(() => {
    cursorX.set(x * window.innerWidth);
    cursorY.set(y * window.innerHeight);
  }, [x, y, cursorX, cursorY]);

  if (!isVisible) return null;

  return (
    <motion.div
      style={{ x: cursorX, y: cursorY }}
      className="fixed top-0 left-0 w-8 h-8 -ml-4 -mt-4 pointer-events-none z-[9999] flex items-center justify-center"
    >
      {/* Outer Core */}
      <motion.div 
        animate={{ 
          scale: isPinching ? 0.8 : 1,
          rotate: isPinching ? 45 : 0
        }}
        className="absolute inset-0 border-2 border-brand rounded-lg shadow-[0_0_15px_rgba(225,29,72,0.8)]" 
      />
      
      {/* Inner Dot */}
      <motion.div 
        animate={{ scale: isPinching ? 1.5 : 1 }}
        className="w-1.5 h-1.5 bg-white rounded-full" 
      />

      {/* Trailing Glow */}
      <div className="absolute inset-0 bg-brand/20 blur-xl rounded-full scale-150" />
    </motion.div>
  );
};
