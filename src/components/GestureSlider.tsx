import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useGesture } from './GestureProvider';
import { cn } from '../lib/utils';

interface GestureSliderProps {
  value: number;
  onChange: (val: number) => void;
  onInteractionEnd?: () => void;
  minLabel?: string;
  maxLabel?: string;
}

export const GestureSlider: React.FC<GestureSliderProps> = ({ value, onChange, onInteractionEnd, minLabel = "Oneens", maxLabel = "Eens" }) => {
  const { x, y, isVisible, isPinching } = useGesture();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastXRef = useRef<number>(x);

  useEffect(() => {
    if (!isVisible) {
      if (isDragging) {
        setIsDragging(false);
        if (onInteractionEnd) onInteractionEnd();
      }
      return;
    }

    // Smooth the X coordinate slightly to reduce jitter
    const smoothedX = lastXRef.current * 0.7 + x * 0.3;
    lastXRef.current = smoothedX;

    const rect = trackRef.current?.getBoundingClientRect();
    if (rect) {
      const cursorX = smoothedX * window.innerWidth;
      const cursorY = y * window.innerHeight;

      // When dragging, we focus solely on the relative X
      if (isDragging) {
        if (!isPinching) {
          setIsDragging(false);
          if (onInteractionEnd) onInteractionEnd();
          return; // STOP immediately
        }

        const relativeX = Math.max(0, Math.min(1, (cursorX - rect.left) / rect.width));
        const newValue = Math.round(relativeX * 100);
        if (newValue !== value) {
          onChange(newValue);
        }

        // Safety release
        if (Math.abs(cursorY - (rect.top + rect.height / 2)) > 200) {
          setIsDragging(false);
          if (onInteractionEnd) onInteractionEnd();
        }
      } else {
        // Not dragging, check for grab
        const currentHandleX = rect.left + (value / 100) * rect.width;
        const currentHandleY = rect.top + rect.height / 2;
        const isOverHandle = Math.abs(cursorX - currentHandleX) < 50 &&
                             Math.abs(cursorY - currentHandleY) < 50;

        if (isOverHandle && isPinching) {
          setIsDragging(true);
        }
      }
    }
  }, [x, y, isVisible, isDragging, isPinching, onChange, value]);

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
            scale: isDragging ? 1.6 : 1,
            boxShadow: isDragging ? "0 0 40px rgba(225,29,72,1)" : "0 0 10px rgba(225,29,72,0.5)"
          }}
          className="absolute top-1/2 -ml-6 -mt-6 w-12 h-12 rounded-full border-4 border-brand bg-black z-20 flex items-center justify-center cursor-none"
        >
          <div className={cn(
            "w-2 h-2 rounded-full transition-all duration-300",
            isDragging ? "bg-white scale-150" : "bg-brand"
          )} />
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
          {isDragging ? 'Knijp en Sleep' : 'Breng je duim en wijsvinger naar elkaar toe om de circel te pakken'}
        </p>
      </div>
    </div>
  );
};
