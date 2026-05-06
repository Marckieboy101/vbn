import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useGesture } from './GestureProvider';
import { cn } from '../lib/utils';

interface GestureSliderProps {
  value: number;
  onChange: (val: number) => void;
  minLabel?: string;
  maxLabel?: string;
}

export const GestureSlider: React.FC<GestureSliderProps> = ({ value, onChange, minLabel = "Disagree", maxLabel = "Agree" }) => {
  const { x, y, isPinching, isVisible } = useGesture();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const rect = trackRef.current?.getBoundingClientRect();
    if (rect && isPinching) {
      const cursorX = x * window.innerWidth;
      const cursorY = y * window.innerHeight;

      // Check if cursor is near the track or already dragging
      const isOverTrack = cursorX >= rect.left - 50 && cursorX <= rect.right + 50 &&
                         cursorY >= rect.top - 100 && cursorY <= rect.bottom + 100;

      if (isOverTrack || isDragging) {
        setIsDragging(true);
        const relativeX = Math.max(0, Math.min(1, (cursorX - rect.left) / rect.width));
        onChange(Math.round(relativeX * 100));
      }
    } else {
      setIsDragging(false);
    }
  }, [x, y, isPinching, isVisible, isDragging, onChange]);

  return (
    <div className="w-full py-12">
      <div className="flex justify-between text-xs font-mono uppercase tracking-[0.2em] text-white/40 mb-6 px-2">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
      
      <div 
        ref={trackRef}
        className="relative h-4 bg-white/5 rounded-full border border-white/10 overflow-visible"
      >
        {/* Track Progress */}
        <motion.div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/10 to-brand rounded-full"
          style={{ width: `${value}%` }}
        />

        {/* Draggable Handle */}
        <motion.div
          animate={{ 
            left: `${value}%`,
            scale: isDragging ? 1.4 : 1,
            boxShadow: isDragging ? "0 0 30px rgba(225,29,72,1)" : "0 0 10px rgba(225,29,72,0.5)"
          }}
          className="absolute top-1/2 -ml-6 -mt-6 w-12 h-12 rounded-full border-4 border-brand bg-black z-20 flex items-center justify-center cursor-none"
        >
          <div className="w-2 h-2 bg-brand rounded-full" />
        </motion.div>

        {/* Feedback Number */}
        <motion.div
          animate={{ left: `${value}%`, opacity: isDragging ? 1 : 0 }}
          className="absolute -top-12 -ml-6 text-2xl font-display font-bold text-brand"
        >
          {value}%
        </motion.div>
      </div>

      <div className="flex justify-center mt-8">
        <p className="text-white/20 text-[10px] font-mono tracking-widest uppercase">
          {isDragging ? 'Dragging...' : 'Pinch handle to move'}
        </p>
      </div>
    </div>
  );
};
