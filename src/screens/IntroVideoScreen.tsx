import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';

export const IntroVideoScreen: React.FC = () => {
  const setStep = useStore((state) => state.setStep);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showPlaybackFallback, setShowPlaybackFallback] = useState(false);

  const handleVideoEnd = () => {
    setStep('intro');
  };

  const tryPlayVideo = async () => {
    if (!videoRef.current) return;
    try {
      await videoRef.current.play();
      setShowPlaybackFallback(false);
    } catch {
      setShowPlaybackFallback(true);
    }
  };

  useEffect(() => {
    tryPlayVideo();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl w-full flex flex-col items-center gap-8"
      >
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-5xl md:text-6xl font-display font-black uppercase tracking-tight text-white"
        >
          Welkom
        </motion.h1>

        {/* Video Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        >
          <video
            ref={videoRef}
            onEnded={handleVideoEnd}
            onError={() => setShowPlaybackFallback(true)}
            className="w-full h-auto aspect-video bg-black"
            playsInline
            autoPlay
            muted
          >
            <source src="/videovbn.mp4" type="video/mp4" />
            Je browser ondersteunt video niet.
          </video>

          {showPlaybackFallback && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 text-center px-6">
              <button
                onClick={tryPlayVideo}
                className="rounded-full border border-white/20 bg-white/10 px-8 py-4 text-white text-lg font-semibold uppercase tracking-[0.18em] hover:bg-white/20 transition"
              >
                Klik om de video te starten
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};
