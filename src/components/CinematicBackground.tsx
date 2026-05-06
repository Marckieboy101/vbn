import React from 'react';
import { motion } from 'motion/react';

export const CinematicBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-black">
      {/* Gradient Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(225,29,72,0.15)_0%,rgba(0,0,0,1)_70%)]" />
      
      {/* Moving Waves */}
      <svg className="absolute w-full h-full opacity-30" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        <motion.path
          d="M0,500 Q250,400 500,500 T1000,500 V1000 H0 Z"
          fill="url(#grad1)"
          animate={{
            d: [
              "M0,500 Q250,400 500,500 T1000,500 V1000 H0 Z",
              "M0,500 Q250,600 500,500 T1000,500 V1000 H0 Z",
              "M0,500 Q250,400 500,500 T1000,500 V1000 H0 Z"
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#e11d48', stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: '#000', stopOpacity: 0.8 }} />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating Particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-brand-glow/40 rounded-full"
          initial={{ 
            x: Math.random() * 100 + "%", 
            y: Math.random() * 100 + "%",
            opacity: Math.random()
          }}
          animate={{
            y: [null, "-10%"],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 5 + Math.random() * 10,
            repeat: Infinity,
            delay: Math.random() * 5
          }}
        />
      ))}

      {/* Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
    </div>
  );
};
