import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useGesture } from './GestureProvider';
import { cn } from '../lib/utils';

interface InteractiveElementProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  hoverDuration?: number; // ms
  disabled?: boolean;
  activateOnPointerHover?: boolean;
}

export const InteractiveButton: React.FC<InteractiveElementProps> = ({ 
  children, 
  onClick, 
  className, 
  hoverDuration = 2000,
  disabled,
  activateOnPointerHover = false
}) => {
  const { x, y, isVisible } = useGesture();
  const ref = useRef<HTMLDivElement>(null);
  const pointerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoverTime, setHoverTime] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isPointerHovered, setIsPointerHovered] = useState(false);

  const clearPointerTimer = () => {
    if (pointerTimerRef.current) {
      clearTimeout(pointerTimerRef.current);
      pointerTimerRef.current = null;
    }
  };

  const startPointerHover = () => {
    if (!activateOnPointerHover || disabled || pointerTimerRef.current) return;

    setIsPointerHovered(true);
    pointerTimerRef.current = setTimeout(() => {
      pointerTimerRef.current = null;
      onClick?.();
    }, hoverDuration);
  };

  const endPointerHover = () => {
    setIsPointerHovered(false);
    clearPointerTimer();
  };

  const handleClick = () => {
    if (disabled) return;

    clearPointerTimer();
    onClick?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || (event.key !== 'Enter' && event.key !== ' ')) return;

    event.preventDefault();
    handleClick();
  };

  useEffect(() => clearPointerTimer, []);

  useEffect(() => {
    if (!isVisible || disabled) {
      setIsHovered(false);
      setHoverTime(0);
      return;
    }

    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      const cursorX = x * window.innerWidth;
      const cursorY = y * window.innerHeight;

      const inside = cursorX >= rect.left && cursorX <= rect.right &&
                     cursorY >= rect.top && cursorY <= rect.bottom;

      setIsHovered(inside);

      if (inside) {
        const timer = setInterval(() => {
          setHoverTime(prev => {
            if (prev >= hoverDuration) {
              clearInterval(timer);
              if (onClick) onClick();
              return 0;
            }
            return prev + 50;
          });
        }, 50);
        return () => clearInterval(timer);
      } else {
        setHoverTime(0);
      }
    }
  }, [x, y, isVisible, hoverDuration, onClick, disabled]);

  const progress = (hoverTime / hoverDuration) * 100;
  const showHoverState = isHovered || isPointerHovered;

  return (
    <div 
      ref={ref}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerEnter={startPointerHover}
      onPointerLeave={endPointerHover}
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        disabled ? "pointer-events-none opacity-50" : "cursor-pointer",
        showHoverState ? "scale-105" : "scale-100",
        className
      )}
    >
      <div className="relative z-10">{children}</div>
      
      {/* Progressive Fill Loader */}
      {isHovered && progress > 0 && (
        <motion.div 
          className="absolute bottom-0 left-0 h-1 bg-brand shadow-[0_0_10px_rgba(225,29,72,0.8)]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
        />
      )}

      {/* Hover Edge Glow */}
      <motion.div
        className="absolute inset-0 border border-brand/50 rounded-inherit pointer-events-none"
        animate={{ opacity: showHoverState ? 1 : 0 }}
      />
    </div>
  );
};
