import React, { useEffect, useRef } from 'react';

interface ConfettiEffectProps {
  level: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'circle' | 'square' | 'triangle';
}

const THEME_COLORS = [
  '#ff4d4d', // Brand Red
  '#00ffcc', // Mint Neon Cyan
  '#a855f7', // Cyber Violet
  '#fbbf24', // Trophy Gold
  '#3b82f6', // Bright Blue
  '#ffffff'  // Pure Ice White
];

export const ConfettiEffect: React.FC<ConfettiEffectProps> = ({ level }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Setup particles based on Level achieving multiplier
    const particlesCount = Math.min(350, 100 + level * 50);
    const particles: Particle[] = [];

    // Create a particle
    const createParticle = (side?: 'left' | 'right' | 'any'): Particle => {
      const activeSide = side || (Math.random() < 0.5 ? 'left' : 'right');
      const startX = activeSide === 'left' ? 0 : activeSide === 'right' ? window.innerWidth : Math.random() * window.innerWidth;
      const startY = activeSide === 'any' ? -20 : window.innerHeight * 0.7 + Math.random() * (window.innerHeight * 0.2);

      const angle = activeSide === 'left' 
        ? -Math.PI / 4 - Math.random() * (Math.PI / 6) 
        : activeSide === 'right' 
          ? -3 * Math.PI / 4 + Math.random() * (Math.PI / 6)
          : Math.PI / 2 + (Math.random() - 0.5);

      const speed = 12 + Math.random() * 22;

      return {
        x: startX,
        y: startY,
        size: 5 + Math.random() * 10,
        color: THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)],
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
        shape: Math.random() < 0.4 ? 'circle' : Math.random() < 0.5 ? 'triangle' : 'square'
      };
    };

    // Initialize side bursts
    for (let i = 0; i < particlesCount; i++) {
      particles.push(createParticle());
    }

    // Animation Loop
    let animationId: number;
    let frameCount = 0;

    const tick = () => {
      if (!canvas || !ctx) return;
      frameCount++;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Periodically add standard falling debris from the top during the first 5 seconds
      if (frameCount < 300 && frameCount % 6 === 0) {
        particles.push(createParticle('any'));
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Apply physics
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += 0.35; // Gravity
        p.speedX *= 0.985; // Air drag
        p.rotation += p.rotationSpeed;

        // Start fading when falling down slowly
        if (p.speedY > 2) {
          p.opacity -= 0.006;
        }

        // De-spawn off-screen or faded particles
        if (p.opacity <= 0 || p.y > canvas.height + 20 || p.x < -40 || p.x > canvas.width + 40) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        // Draw particle shape
        ctx.beginPath();
        if (p.shape === 'circle') {
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        } else if (p.shape === 'triangle') {
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath();
        } else {
          ctx.rect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        ctx.fill();
        ctx.restore();
      }

      if (particles.length > 0) {
        animationId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [level]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[200] w-full h-full"
    />
  );
};
