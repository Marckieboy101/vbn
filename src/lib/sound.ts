import { useStore } from '../store';

const SFX_URLS = {
  HOVER: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  CLICK: '/click.mp3',
  SUCCESS: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  TRANSITION: '/transition.mp3',
};

class SoundManager {
  private audios: Record<string, HTMLAudioElement> = {};

  constructor() {
    if (typeof window !== 'undefined') {
      Object.entries(SFX_URLS).forEach(([key, url]) => {
        const audio = new Audio(url);
        audio.preload = 'auto';
        this.audios[key] = audio;
      });
    }
  }

  play(key: keyof typeof SFX_URLS, volume = 0.5) {
    const isEnabled = useStore.getState().soundEnabled;
    if (!isEnabled) return;

    const audio = this.audios[key];
    if (audio) {
      audio.currentTime = 0;
      audio.volume = volume;
      audio.play().catch(() => {
        // Autoplay policy might block this until user interacts
      });
    }
  }
}

export const soundManager = new SoundManager();
