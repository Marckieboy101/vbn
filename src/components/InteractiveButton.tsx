import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useGesture } from './GestureProvider';
import { cn } from '../lib/utils';
import { soundManager } from '../lib/sound';

interface InteractiveElementProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const InteractiveButton: React.FC<InteractiveElementProps> = ({ 
  children, 
  onClick, 
  className, 
  disabled,
}) => {
  const { x, y, isVisible } = useGesture();
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [hoverTime, setHoverTime] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMouseHovered, setIsMouseHovered] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  
  const HOVER_DURATION = 3000; // Strictly 3 seconds

  useEffect(() => {
    const isActuallyHovered = (isVisible && isHovered) || isMouseHovered;

    if (disabled) {
      setHoverTime(0);
      return;
    }

    if (isActuallyHovered) {
      if (!timerRef.current) {
        soundManager.play('HOVER', 0.2);
        const startTime = Date.now() - hoverTime;
        timerRef.current = setInterval(() => {
          const currentHoverTime = Date.now() - startTime;
          if (currentHoverTime >= HOVER_DURATION) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            
            const now = Date.now();
            if (now - lastClickTime > 800) {
              soundManager.play('CLICK', 0.6);
              if (onClick) onClick();
              setLastClickTime(now);
            }
            
            setHoverTime(0);
            return;
          }
          setHoverTime(currentHoverTime);
        }, 30); // Higher resolution for smoother progress
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (hoverTime !== 0) setHoverTime(0);
    }
  }, [isVisible, isHovered, isMouseHovered, onClick, disabled, lastClickTime, hoverTime]);

  useEffect(() => {
    if (!isVisible || disabled) {
      if (isHovered) setIsHovered(false);
      return;
    }

    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      const cursorX = x * window.innerWidth;
      const cursorY = y * window.innerHeight;

      const inside = cursorX >= rect.left && cursorX <= rect.right &&
                     cursorY >= rect.top && cursorY <= rect.bottom;

      if (inside !== isHovered) {
        setIsHovered(inside);
      }
    }
  }, [x, y, isVisible, disabled, isHovered]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const progress = (hoverTime / HOVER_DURATION) * 100;

  return (
    <motion.div 
      ref={ref}
      onMouseEnter={() => setIsMouseHovered(true)}
      onMouseLeave={() => setIsMouseHovered(false)}
      onTouchStart={(e) => {
        if (!disabled) {
          setIsMouseHovered(true);
        }
      }}
      onTouchEnd={() => {
        setIsMouseHovered(false);
      }}
      onTouchCancel={() => {
        setIsMouseHovered(false);
      }}
      onClick={() => {
        if (!disabled && onClick) {
          const now = Date.now();
          if (now - lastClickTime > 800) {
            soundManager.play('CLICK', 0.6);
            onClick();
            setLastClickTime(now);
          }
        }
      }}
      initial={false}
      animate={{ 
        scale: (isHovered || isMouseHovered) ? 1.05 : 1,
        boxShadow: (isHovered || isMouseHovered)
          ? "0 0 40px rgba(255,80,80,0.3)" 
          : "0 0 0px rgba(255,80,80,0)"
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 20 
      }}
      className={cn(
        "relative overflow-hidden transition-all duration-150 cursor-pointer select-none touch-manipulation",
        "hover:brightness-[1.08] active:scale-[0.97]",
        className
      )}
    >
      <div className="relative z-10 w-full h-full flex items-center justify-center p-1">{children}</div>
      
      {/* Dynamic Progress Glow Overlay */}
      <motion.div
        className="absolute inset-0 bg-brand/20 z-0"
        animate={{
          opacity: (isHovered || isMouseHovered) ? 1 : 0,
          scale: (isHovered || isMouseHovered) ? [1, 1.1, 1] : 1
        }}
        transition={{
          opacity: { duration: 0.3 },
          scale: { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
        }}
      />

      {/* Progressive Fill Loader Overlay - More prominent */}
      {(isHovered || isMouseHovered) && progress > 0 && (
        <motion.div 
          className="absolute inset-0 bg-brand/15 z-0 origin-left"
          style={{ width: `${progress}%` }}
          transition={{ type: "tween", ease: "linear" }}
        />
      )}

      {/* Progressive Fill Loader Bar (Bottom) - Thicker and more visible */}
      {(isHovered || isMouseHovered) && progress > 0 && (
        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/10 z-20">
          <motion.div 
            className="h-full bg-brand shadow-[0_0_15px_rgba(255,80,80,1)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Pulsing Border when charging */}
      <motion.div
        className="absolute inset-0 border-2 border-brand pointer-events-none z-30 rounded-[inherit]"
        animate={{ 
          opacity: (isHovered || isMouseHovered) ? (progress / 100) : 0,
          scale: (isHovered || isMouseHovered) ? [1, 1.02, 1] : 1
        }}
        transition={{
          opacity: { duration: 0.1 },
          scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
        }}
      />
    </motion.div>
  );
};
