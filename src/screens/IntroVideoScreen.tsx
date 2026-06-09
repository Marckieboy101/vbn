import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { InteractiveButton } from '../components/InteractiveButton';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Film, 
  Maximize, 
  RotateCcw,
  ChevronRight,
  Upload
} from 'lucide-react';
import { cn } from '../lib/utils';

export const IntroVideoScreen: React.FC = () => {
  const setStep = useStore((state) => state.setStep);
  const soundEnabled = useStore((state) => state.soundEnabled);
  const toggleSound = useStore((state) => state.toggleSound);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Custom video selection, fallback, and drag-and-drop states
  // We initialize with the local instructievideo.mp4 (or fallback to intro_video.mp4 / film projector).
  // If it's not present on the server, the video element's onError will trigger handleVideoError and fall back to alternative sources.
  const [videoSrc, setVideoSrc] = useState<string>("/instructievideo.mp4");
  const [isDragging, setIsDragging] = useState(false);

  const handleVideoError = () => {
    // Cascading fallback strategy:
    // 1. If /instructievideo.mp4 fails, try /intro_video.mp4
    // 2. If /intro_video.mp4 fails, load high-quality Mixkit movie projector trailer
    if (videoSrc === "/instructievideo.mp4") {
      console.log("[IntroVideo] Local /instructievideo.mp4 not found or failed, falling back to /intro_video.mp4.");
      setVideoSrc("/intro_video.mp4");
    } else if (videoSrc === "/intro_video.mp4") {
      console.log("[IntroVideo] Local /intro_video.mp4 failed, falling back to Mixkit projector trailer.");
      setVideoSrc("https://assets.mixkit.co/videos/preview/mixkit-vintage-movie-projector-playing-41884-large.mp4");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setVideoSrc(objectUrl);
      setIsPlaying(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const objectUrl = URL.createObjectURL(file);
      setVideoSrc(objectUrl);
      setIsPlaying(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    }
  };

  // Sync mute state with global sound settings initially
  useEffect(() => {
    setIsMuted(!soundEnabled);
  }, [soundEnabled]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    
    // If user unmutes, let's enable global sound
    if (!nextMuted && !soundEnabled) {
      toggleSound();
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration || 1;
    setProgress((current / total) * 100);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickFraction = clickX / width;
    const newTime = clickFraction * videoRef.current.duration;
    videoRef.current.currentTime = newTime;
    setProgress(clickFraction * 100);
  };

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const attemptPlay = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = isMuted;
    
    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.log("Unmuted/default autoplay was blocked or video not ready, attempting muted fallback...", err);
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play()
              .then(() => {
                setIsPlaying(true);
              })
              .catch((finalErr) => {
                console.error("Muted autoplay also blocked", finalErr);
                setIsPlaying(false);
              });
          }
        });
    }
  };

  // Auto-play when screen is mounted or when video source changes
  useEffect(() => {
    attemptPlay();
  }, [videoSrc]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-black text-white">
      {/* Dynamic Cinematic Background Overlay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-brand/5 rounded-full blur-[140px] -z-10 pointer-events-none" />
      
      {/* Atmospheric Film Grain Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_3px_100%] pointer-events-none opacity-20 -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-6xl w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-16 z-10"
      >
        {/* Left Side: Presentation and Welcoming Text */}
        <div className="flex-1 flex flex-col items-start text-left max-w-xl">
          <motion.h2
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tight leading-none uppercase mb-6"
          >
            ONTDEK JE <br />
            <span className="text-glow-red text-brand">FILM VIBE</span>
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="w-full flex flex-col sm:flex-row gap-4"
          >
            <InteractiveButton
              onClick={() => setStep('intro')}
              className="px-8 py-5 flex items-center justify-center gap-3 bg-brand text-white border border-brand/30 hover:bg-brand-dark transition-all duration-300 font-display font-bold uppercase tracking-wider rounded-xl shadow-[0_0_25px_rgba(255,80,80,0.2)] hover:shadow-[0_0_35px_rgba(255,80,80,0.4)] group overflow-hidden relative cursor-pointer"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start de Instructies
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
            </InteractiveButton>
          </motion.div>
        </div>

        {/* Right Side: Showcase Video Player with Drag-and-Drop and Upload */}
        <div className="flex-1 w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative rounded-3xl overflow-hidden bg-white/[0.01] border shadow-[0_15px_40px_rgba(0,0,0,0.6)] aspect-video group transition-all duration-300",
              isDragging ? "border-brand shadow-[0_0_40px_rgba(255,80,80,0.4)] scale-[1.02]" : "border-white/10"
            )}
          >
            {/* HTML5 Video Element */}
            <video
              ref={videoRef}
              src={videoSrc}
              onClick={handlePlayPause}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onCanPlay={attemptPlay}
              onError={handleVideoError}
              className="w-full h-full object-cover cursor-pointer"
              playsInline
              loop
              autoPlay
              muted={isMuted}
            />

            {/* Film projector audio reel/film icon visual layout */}
            <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5 opacity-80 pointer-events-none flex items-center gap-2 font-mono text-[10px] tracking-widest text-white/60">
              <Film className="w-3.5 h-3.5 text-brand animate-spin" style={{ animationDuration: '6s' }} />
              <span>LIVE FEED: {videoSrc.startsWith('blob:') ? 'GEÜPLOADE_VIDEO.MP4' : videoSrc === '/instructievideo.mp4' ? 'INSTRUCTIEVIDEO.MP4' : videoSrc === '/intro_video.mp4' ? 'INTRO_VIBE.MP4' : 'INSTRUCTIEVIDEO.MP4'}</span>
            </div>

            {/* Upload Video Button Overlay */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <label className="bg-brand/90 hover:bg-brand active:scale-95 border border-white/20 px-3 py-1.5 rounded-xl backdrop-blur-md text-[10px] font-mono tracking-widest text-white font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,80,80,0.3)] hover:scale-105 select-none">
                <Upload className="w-3.5 h-3.5" />
                <span>KIES VIDEO</span>
                <input 
                  type="file" 
                  accept="video/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {/* Drag and Drop Immersive Overlay */}
            <AnimatePresence>
              {isDragging && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-brand/20 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none pointer-events-none border-2 border-dashed border-brand m-2 rounded-2xl z-20"
                >
                  <Upload className="w-12 h-12 text-brand animate-bounce mb-3" />
                  <p className="font-display font-bold uppercase text-lg tracking-wide text-brand drop-shadow-md">
                    Laat de video hier los!
                  </p>
                  <p className="text-white/70 text-xs mt-1 max-w-xs leading-normal">
                    Laat de video-feedback van de blonde avatar (of uw eigen video) los om deze af te spelen.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Custom Interactive Player Controls Overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 flex flex-col gap-3">
              
              {/* Progress Slider Bar */}
              <div 
                onClick={handleProgressBarClick}
                className="h-1.5 w-full bg-white/15 rounded-full overflow-hidden cursor-pointer relative hover:h-2 transition-all duration-200"
              >
                <div 
                  className="h-full bg-brand rounded-full relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
                </div>
              </div>

              {/* Botton Control Ribbon */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Play / Pause Toggle */}
                  <button
                    onClick={handlePlayPause}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white border border-white/5 cursor-pointer"
                    title={isPlaying ? "Pauzeren" : "Afspelen"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>

                  {/* Restart Control */}
                  <button
                    onClick={handleRestart}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white border border-white/5 cursor-pointer"
                    title="Opnieuw afspelen"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Audio Volume Toggle */}
                  <button
                    onClick={handleToggleMute}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white border border-white/5 cursor-pointer flex items-center gap-1"
                    title={isMuted ? "Geluid inschakelen" : "Geluid dempen"}
                  >
                    {isMuted ? (
                      <>
                        <VolumeX className="w-4 h-4 text-brand" />
                        <span className="text-[10px] font-mono text-brand/80">GEDEMPT</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-mono text-emerald-400">GELUID AAN</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Total remaining / counter */}
                  {duration > 0 && (
                    <span className="text-[10px] font-mono text-white/50 bg-black/40 px-2 py-1 rounded-md border border-white/5">
                      {Math.floor((progress/100) * duration)}s / {Math.floor(duration)}s
                    </span>
                  )}

                  {/* Fullscreen Tool */}
                  <button
                    onClick={handleFullscreen}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white border border-white/5 cursor-pointer"
                    title="Volledig Scherm"
                  >
                    <Maximize className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Ambient pause central click layout */}
            <AnimatePresence>
              {!isPlaying && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handlePlayPause}
                  className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-full bg-brand/90 border border-white/20 flex items-center justify-center text-white shadow-2xl scale-120 hover:scale-130 transition-transform">
                    <Play className="w-8 h-8 fill-white translate-x-0.5" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
