import { useEffect, useRef } from 'react';
import { useStore } from '../store';

interface UseScreenVoiceOverOptions {
  volume?: number;
  loop?: boolean;
  autoPlay?: boolean;
}

export const useScreenVoiceOver = (
  src: string,
  { volume = 0.8, loop = false, autoPlay = true }: UseScreenVoiceOverOptions = {}
) => {
  const soundEnabled = useStore((state) => state.soundEnabled);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!src) return;

    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = volume;
    audio.loop = loop;

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, [src, volume, loop]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (soundEnabled && autoPlay) {
      audio.play().catch(() => {
        // Browsers may block autoplay until user interacts.
      });
    } else {
      audio.pause();
    }
  }, [soundEnabled, autoPlay]);

  return audioRef;
};
