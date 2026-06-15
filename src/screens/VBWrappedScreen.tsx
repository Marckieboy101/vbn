import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { useStore } from '../store';
import { saveSessionData } from '../lib/sessionStorage';
import { triggerAutomaticGoogleSheetsSync } from '../services/googleSheetsService';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Lock,
  Play,
  Sliders,
  RefreshCw,
  Share2,
  Download,
  Smartphone
} from 'lucide-react';
import { cn } from '../lib/utils';
import { soundManager } from '../lib/sound';
import { InteractiveButton } from '../components/InteractiveButton';

interface VBWrappedScreenProps {
  onClose: () => void;
}

const GENRE_STYLES: Record<string, { label: string; emoji: string; text: string; bg: string; border: string }> = {
  comedy: { label: 'Komedie', emoji: '🎭', text: 'Je zoekt de lach, gein, en pure memes. Jouw radar is gericht op puur entertainment!', bg: 'from-amber-600 to-yellow-500', border: 'border-yellow-400/30' },
  sports: { label: 'Sport', emoji: '⚽', text: 'Actie, adrenaline, en topprestaties. Jij staat altijd in de competitieve aanvalsstand!', bg: 'from-blue-600 to-cyan-500', border: 'border-cyan-400/30' },
  thriller: { label: 'Thriller', emoji: '👾', text: 'Mysterieuze vibes en bloedstollende spanning. Je houdt ervan om op het puntje van je stoel te zitten!', bg: 'from-purple-600 to-rose-500', border: 'border-rose-400/30' },
  adventure: { label: 'Avontuur', emoji: '🏔️', text: 'Verkenning, ontdekkingen, en grootse panorama\'s. Grenzen verleggen is jouw tweede natuur!', bg: 'from-emerald-600 to-teal-500', border: 'border-teal-400/30' },
  romance: { label: 'Romantiek', emoji: '💖', text: 'Diepe emoties, zachte melodieën, en oprechte relaties. Jij kiest voor verbinding en warmte!', bg: 'from-pink-600 to-red-400', border: 'border-red-400/30' },
  scifi: { label: 'Sci-Fi', emoji: '🪐', text: 'Futuristische dromen, kosmische geluidseffecten, en cybernetics. De toekomst is vandaag voor jou!', bg: 'from-cyan-600 to-blue-500', border: 'border-cyan-400/30' },
  none: { label: 'Geen sfeer', emoji: '🧬', text: 'Nog geen sfeer gekozen. Start je ontdekking om een genre te matchen!', bg: 'from-gray-600 to-gray-500', border: 'border-gray-400/30' }
};

export const VBWrappedScreen: React.FC<VBWrappedScreenProps> = ({ onClose }) => {
  const {
    selectedGenres,
    answers,
    activeArchetype,
    voiceFeedbackText,
    voiceFeedbackOriginal,
    sessionId,
    setStep,
    ageGroup
  } = useStore();

  useEffect(() => {
    const saveSessionDataLocally = async () => {
      try {
        saveSessionData({
          sessionId,
          genres: selectedGenres,
          answers,
          ageGroup: ageGroup || '',
          archetypeId: activeArchetype?.id,
          archetypeTitle: activeArchetype?.title,
          timestamp: Date.now(),
          completed: true,
          thanked: true
        });
        await triggerAutomaticGoogleSheetsSync();
      } catch (error) {
        console.warn('Lokale sessieopslag mislukt:', error);
      }
    };
    saveSessionDataLocally();

    let idleTimeout: NodeJS.Timeout;
    const resetIdleTimer = () => {
      if (idleTimeout) clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => { onClose(); }, 90000);
    };
    resetIdleTimer();

    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetIdleTimer));
    return () => {
      if (idleTimeout) clearTimeout(idleTimeout);
      events.forEach(event => window.removeEventListener(event, resetIdleTimer));
    };
  }, [sessionId, selectedGenres, answers, activeArchetype, onClose]);

  const [mode, setMode] = useState<'slides' | 'summary'>('slides');
  const [activeSlide, setActiveSlide] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const shareUrl = window.location.origin;

  const hasGenre = selectedGenres.length > 0;
  const genreId = hasGenre ? selectedGenres[0] : 'none';
  const genreInfo = GENRE_STYLES[genreId] || GENRE_STYLES.none;

  const answersCount = Object.keys(answers).length;
  const hasAnswers = answersCount > 0;

  const calcEnergyAndVibe = () => {
    let base = 50;
    if (answers['immersion']) base += (answers['immersion'] - 50) * 0.3;
    if (answers['social']) base += (answers['social'] - 50) * 0.3;
    if (answers['duration']) base -= (answers['duration'] - 50) * 0.2;
    if (answers['breaks']) base -= (answers['breaks'] - 50) * 0.2;
    return Math.max(10, Math.min(100, Math.round(base)));
  };

  const generateUserTitle = () => {
    const extreme = getMostExtremeCalibration();
    const cleanExtreme = extreme ? extreme.label.replace('Max-', '').replace('Ultra-', '') : 'Aura';
    return `${activeArchetype?.title || 'Trendsetter'} of ${cleanExtreme}`;
  };

  const questionLabels: Record<string, { min: string; max: string; desc: string }> = {
    duration: { min: 'Kort & Krachtig', max: 'Episch Lang', desc: 'filmduursvoorkeur' },
    immersion: { min: 'Passief Relaxt', max: 'Ultiem Meeslepend', desc: 'virtual reality verdrinking' },
    social: { min: 'Individueel Solo', max: 'Mega Sociaal', desc: 'groepscohesie' },
    breaks: { min: 'Non-stop Flow', max: 'Bewust Gedoseerd', desc: 'reflectiepauzes' }
  };

  const getMostExtremeCalibration = () => {
    if (!hasAnswers) return null;
    let maxDeviation = -1;
    let extremeId = '';
    let extremeValue = 50;

    Object.entries(answers).forEach(([key, value]) => {
      const deviation = Math.abs(value - 50);
      if (deviation > maxDeviation) {
        maxDeviation = deviation;
        extremeId = key;
        extremeValue = value;
      }
    });

    if (maxDeviation < 5) return null;

    const minLabel = questionLabels[extremeId]?.min || 'Rustig';
    const maxLabel = questionLabels[extremeId]?.max || 'Druk';
    const chosenLabel = extremeValue > 50 ? maxLabel : minLabel;
    const desc = questionLabels[extremeId]?.desc || 'balans';

    return {
      id: extremeId,
      deviation: maxDeviation,
      value: extremeValue,
      label: extremeValue > 65 ? `Ultra-${chosenLabel}` : extremeValue < 35 ? `Max-${chosenLabel}` : chosenLabel,
      desc: `Je koos radicaal voor ${chosenLabel} bij ${desc}.`
    };
  };

  const hasVoice = !!voiceFeedbackText && voiceFeedbackText.trim().length > 0;

  const getVocalPersona = () => {
    if (!hasVoice) return null;
    const wordCount = voiceFeedbackOriginal ? voiceFeedbackOriginal.split(' ').length : 0;
    let title = 'De Snappy Minimalist';
    let emoji = '🎙️';
    let summary = 'Kort, bondig en to-the-point. Je verspilt geen woorden en deelt direct je scherpe mening!';
    if (wordCount > 18) {
      title = 'De Eloquente Spraakwaterval'; emoji = '🗣️';
      summary = 'Jij houdt wel van een goed gesprek! Je legt je feedback diepgaand en met veel passie uit.';
    } else if (voiceFeedbackOriginal?.toLowerCase().includes('stom') || voiceFeedbackOriginal?.toLowerCase().includes('slecht')) {
      title = 'De Ongezouten Critici'; emoji = '🌶️';
      summary = 'Eerlijk, vurig en kritisch. Jij noemt het beestje direct bij zijn naam en helpt ons echt scherp te blijven!';
    } else if (voiceFeedbackOriginal && voiceFeedbackOriginal !== voiceFeedbackText) {
      title = 'The Stealth Censor-dodger'; emoji = '🕵️';
      summary = 'Je hebt de AI filters echt uitgetest! Onze slimme gematigde audit heeft je opmerkingen keurig gered.';
    } else if (wordCount > 6) {
      title = 'De Filosofische Vibe-Expert'; emoji = '🧘';
      summary = 'Bedachtzame feedback met de perfecte balans. Je woorden klinken gebalanceerd en inspirerend.';
    }
    return { title, emoji, summary, wordCount };
  };

  const calcParticipation = () => {
    let score = 0;
    if (hasGenre) score += 30;
    score += (answersCount / 4) * 45;
    if (hasVoice) score += 25;
    return Math.round(Math.min(100, score));
  };

  // ─── Slides ────────────────────────────────────────────────────────────────

  const slides = [
    {
      id: 'welcome',
      render: () => (
        <div className="flex flex-col items-center justify-center text-center h-full max-w-lg mx-auto px-4 py-8 relative">
          <h2 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tight leading-none mb-4 text-white">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand via-rose-400 to-yellow-400">
              Mijn Wrapped
            </span>
          </h2>
          <p className="text-white/60 text-sm mb-8 leading-relaxed max-w-xs">
            Bekijk wat jij interessant vind!
          </p>

          <div className="flex flex-col gap-2.5 w-full">
            <InteractiveButton
              onClick={() => {
                soundManager.play('SUCCESS', 0.2);
                setIsPaused(false);
                setSlideProgress(0);
                setActiveSlide(1);
              }}
              className="px-8 py-3.5 bg-brand text-black font-display font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-brand/10 w-full"
            >
              <div className="flex items-center gap-2">
                <span>Bekijk Mijn Verhaal</span>
                <ArrowRight className="w-4 h-4 fill-current" />
              </div>
            </InteractiveButton>

            <InteractiveButton
              onClick={() => {
                soundManager.play('CLICK', 0.3);
                setMode('summary');
              }}
              className="px-8 py-3.5 bg-white/5 border border-white/5 text-white/70 font-display font-bold uppercase text-xs tracking-widest rounded-2xl w-full"
            >
              Naar Mijn Overzicht
            </InteractiveButton>
          </div>
        </div>
      )
    },
    {
      id: 'genre',
      render: () => (
        <div className="flex flex-col justify-between h-full px-4 py-8 relative">
          <div className="text-center mt-6">
            <h2 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tight text-white leading-none">
              Jouw <span className="text-brand">Interesse</span>
            </h2>
          </div>

          {hasGenre ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="my-auto max-w-sm mx-auto w-full"
            >
              <div className={cn(
                "glass rounded-[2rem] p-6 text-center border overflow-hidden relative group shadow-2xl bg-gradient-to-b",
                genreInfo.bg
              )}>
                <div className="absolute top-0 inset-x-0 h-1 bg-white/40 shadow-lg" />
                <div className="text-6xl my-6 animate-bounce" style={{ animationDuration: '3s' }}>
                  {genreInfo.emoji}
                </div>
                <h3 className="text-2xl md:text-3xl font-display font-black uppercase text-white tracking-tight mb-2">
                  {genreInfo.label}
                </h3>
                <p className="text-white/80 text-xs font-light leading-relaxed px-2">
                  "{genreInfo.text}"
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="my-auto max-w-sm mx-auto p-8 glass border border-white/5 rounded-3xl text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-white/5 rounded-full border border-white/5 flex items-center justify-center mb-4 text-white/20">
                <Lock className="w-6 h-6 text-brand/40 animate-pulse" />
              </div>
              <InteractiveButton
                onClick={() => {
                  soundManager.play('CLICK', 0.3);
                  setStep('genre');
                }}
                className="px-6 py-2.5 bg-brand text-black font-mono text-[10px] font-black uppercase tracking-widest rounded-xl"
              >
                Kies genre
              </InteractiveButton>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'extreme',
      render: () => {
        const extreme = getMostExtremeCalibration();
        return (
          <div className="flex flex-col justify-between h-full px-4 py-8 relative">
            <div className="text-center mt-6">
              <h2 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tight text-white leading-none">
                Jouw <span className="text-brand">voorkeuren</span>
              </h2>
            </div>

            {hasAnswers && extreme ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="my-auto max-w-sm mx-auto w-full"
              >
                <div className="glass border border-brand/20 bg-black/60 rounded-[2rem] p-8 text-center relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-brand animate-scan shadow-[0_0_15px_#ff4d4d]" style={{ animationDuration: '4s' }} />
                  <div className="w-14 h-14 bg-brand/10 border border-brand/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-brand">
                    <Sliders className="w-7 h-7" />
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#00ffcc] font-black block mb-1">
                    EST_VALUE: {extreme.value}% DEVIATION
                  </span>
                  <h3 className="text-2xl md:text-3xl font-display font-black uppercase tracking-tight text-white mb-3">
                    {extreme.label}
                  </h3>
                  <p className="text-white/60 text-xs font-light leading-relaxed">
                    {extreme.desc} Als jij iets kiest, ga je er helemaal voor.
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="my-auto max-w-sm mx-auto p-8 glass border border-white/5 rounded-3xl text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-white/5 rounded-full border border-white/5 flex items-center justify-center mb-4 text-white/20">
                  <Lock className="w-6 h-6 text-brand/40 animate-pulse" />
                </div>
                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-white mb-2">Bijna daar!</h3>
                <p className="text-[11px] text-white/40 leading-relaxed mb-6">
                  Blijf ontdekken om deze insight vrij te spelen. Vul de sliders in en ontdek jouw meest extreme voorkeuren!
                </p>
                <InteractiveButton
                  onClick={() => {
                    soundManager.play('CLICK', 0.3);
                    setStep('questions');
                  }}
                  className="px-6 py-2.5 bg-brand text-black font-mono text-[10px] font-black uppercase tracking-widest rounded-xl"
                >
                  Starten
                </InteractiveButton>
              </div>
            )}

            <div className="text-center text-[10px] text-white/30 font-mono uppercase tracking-widest mb-6">
              Elke slider onthult een stukje van jouw profiel.
            </div>
          </div>
        );
      }
    },
    {
      id: 'archetype',
      render: () => (
        <div className="flex flex-col justify-between h-full px-4 py-8 relative">
          <div className="text-center mt-6">
            <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-white/30 block mb-2">
              STAP 3 // Wie Ben Jij?
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tight text-white leading-none">
              Jouw Archetype <span className="text-brand">DNA</span>
            </h2>
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="my-auto max-w-sm mx-auto w-full"
          >
            <div className="glass border border-white/5 rounded-[2.5rem] p-6 text-center overflow-hidden flex flex-col items-center group relative shadow-2xl bg-black/60">
              <span>{activeArchetype?.subtitle}</span>
              <div className="w-20 h-20 bg-brand/10 rounded-full border border-brand/20 flex items-center justify-center text-4xl mb-4 shadow-[0_0_20px_rgba(255,80,80,0.15)]">
                {activeArchetype?.emoji || '👑'}
              </div>
              <h3 className="text-2xl md:text-3xl font-display font-black uppercase text-white tracking-tight mb-2">
                {activeArchetype?.title}
              </h3>
              <p className="text-white/60 text-xs font-light leading-relaxed px-2">
                "{activeArchetype?.description}"
              </p>
              <div className="w-full mt-6 border-t border-white/5 pt-4 text-left">
                <span className="text-[10px] text-white/90 font-medium">
                  {activeArchetype?.socialFit}
                </span>
              </div>
            </div>
          </motion.div>

          <div className="text-center text-[10px] text-white/30 font-mono uppercase tracking-widest mb-6">
            Je persoonlijkheidstype past zich aan op basis van wat jij kiest.
          </div>
        </div>
      )
    },
    {
      id: 'voice',
      render: () => {
        const voice = getVocalPersona();
        return (
          <div className="flex flex-col justify-between h-full px-4 py-8 relative">
            <div className="text-center mt-6">
              <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-white/30 block mb-2">
                Stap 4 // Spraak Naar Tekst
              </span>
              <h2 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tight text-white leading-none">
                Stemaudio <span className="text-brand">Vibe</span>
              </h2>
            </div>

            {hasVoice && voice ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="my-auto max-w-sm mx-auto w-full"
              >
                <div className="glass border border-brand/20 bg-brand/5 rounded-[2.5rem] p-6 text-center relative overflow-hidden shadow-2xl">
                  <div className="absolute top-4 right-4 text-[9px] font-mono text-brand/60 uppercase">
                    🎙️ RECORD: OK
                  </div>
                  <div className="w-16 h-16 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-3xl mx-auto mb-4 animate-pulse">
                    {voice.emoji}
                  </div>
                  <h3 className="text-xl md:text-2xl font-display font-black uppercase text-white tracking-tight mb-2">
                    {voice.title}
                  </h3>
                  <p className="text-white/70 text-xs font-light leading-relaxed px-4 mb-4">
                    "{voice.summary}"
                  </p>
                  <div className="p-3.5 bg-black/40 rounded-2xl text-left border border-white/5">
                    <span className="font-mono text-[8px] uppercase text-white/30 block mb-1">
                      Jouw Spraakinzicht
                    </span>
                    <p className="text-[10px] text-white/75 italic line-clamp-2">
                      "{voiceFeedbackText}"
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="my-auto max-w-sm mx-auto p-8 glass border border-white/5 rounded-3xl text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-white/5 rounded-full border border-white/5 flex items-center justify-center mb-4 text-white/20">
                  <Lock className="w-6 h-6 text-brand/40 animate-pulse" />
                </div>
                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-white mb-2">
                  Vocal Vibe Vergrendeld
                </h3>
                <p className="text-[11px] text-white/40 leading-relaxed mb-6">
                  Blijf ontdekken om dit inzicht vrij te spelen. Deel je spraak-feedback bij de microfoonscreen om een real-time AI analyseresultaat toe te voegen!
                </p>
                <InteractiveButton
                  onClick={() => {
                    soundManager.play('CLICK', 0.3);
                    setStep('voice_feedback');
                  }}
                  className="px-6 py-2.5 bg-brand text-black font-mono text-[10px] font-black uppercase tracking-widest rounded-xl"
                >
                  Nu Inspreken
                </InteractiveButton>
              </div>
            )}

            <div className="text-center text-[10px] text-white/30 font-mono uppercase tracking-widest mb-6">
              De AI kijkt naar je toon, tekstlengte en woordkeuze.
            </div>
          </div>
        );
      }
    },
    {
      id: 'final_card',
      render: () => (
        <div className="flex flex-col justify-between h-full px-4 py-8 relative">
          <div className="text-center mt-6">
            <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-white/30 block mb-1">
              Jouw Eindresultaat
            </span>
            <h2 className="text-2xl md:text-3xl font-display font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand to-rose-400 leading-none">
              Dit Is Jouw Wrapped
            </h2>
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="my-auto max-w-sm mx-auto w-full"
          >
            <div className="relative glass bg-[#0e0e0e] border-2 border-brand/40 rounded-[2.5rem] p-6 shadow-2xl flex flex-col items-center">
              <div className="absolute top-4 left-4 text-brand/35 text-xs animate-ping font-mono">✦</div>
              <div className="absolute bottom-4 right-4 text-[#00ffcc]/35 text-xs animate-pulse font-mono">✦</div>

              <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest border border-white/5 p-1 px-3 bg-white/[0.02] rounded-full mb-4">
                Jouw Overzicht
              </div>

              <div className="w-16 h-16 rounded-3xl bg-brand font-black text-black text-3xl flex items-center justify-center rotate-6 shadow-lg shadow-brand/10 mb-4 font-mono">
                {activeArchetype?.emoji}
              </div>

              <h3 className="text-center text-xl font-display font-black uppercase text-brand tracking-tight mb-1">
                {generateUserTitle()}
              </h3>
              <p className="text-[10px] text-white/40 uppercase font-mono tracking-widest mb-6">
                Dit Past Bij Jou: {activeArchetype?.title}
              </p>

              <div className="w-full flex flex-col gap-2 bg-black/40 rounded-2xl p-4 border border-white/5 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/40 font-mono text-[9px]">FAV SFEER:</span>
                  <span className="text-white font-bold uppercase">{genreInfo.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 font-mono text-[9px]">DEELNAME RATIO:</span>
                  <span className="text-emerald-400 font-bold font-mono">{calcParticipation()}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 font-mono text-[9px]">ENERGIE INDEX:</span>
                  <span className="text-amber-400 font-mono font-bold">{calcEnergyAndVibe()}%</span>
                </div>
              </div>

              <p className="text-[10px] text-center text-white/40 italic leading-relaxed mt-4 px-4 font-light">
                "Je bent uniek gecalibreerd binnen het cultuurlandschap van VanBeresteyn. Deel je Wrapped of probeer andere sfeercombi's!"
              </p>
            </div>
          </motion.div>

          <div className="flex flex-col gap-2 w-full max-w-sm mx-auto mb-4">
            <InteractiveButton
              onClick={() => {
                soundManager.play('CLICK', 0.2);
                setMode('summary');
              }}
              className="px-6 py-3 bg-brand/10 border border-brand/20 text-brand font-display font-bold uppercase text-[10px] tracking-widest rounded-2xl w-full"
            >
              <div className="flex items-center gap-2">
                <span>Exporteer & Deel</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </InteractiveButton>

            <InteractiveButton
              onClick={() => {
                soundManager.play('SUCCESS', 0.5);
                onClose();
              }}
              className="px-6 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-[9px] uppercase tracking-widest rounded-xl w-full"
            >
              Speel Opnieuw
            </InteractiveButton>
          </div>
        </div>
      )
    }
  ];

  // Story slides auto-advancer
  useEffect(() => {
    if (mode === 'summary' || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const interval = 60;
    const stepAmount = 100 / (6000 / interval);

    timerRef.current = setInterval(() => {
      setSlideProgress(prev => {
        const next = prev + stepAmount;
        if (next >= 100) {
          if (activeSlide < slides.length - 1) {
            setActiveSlide(prevSlide => prevSlide + 1);
            return 0;
          } else {
            setMode('summary');
            return 100;
          }
        }
        return next;
      });
    }, interval);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeSlide, mode, isPaused]);

  // Generate QR when entering summary (export) mode
  useEffect(() => {
    if (mode !== 'summary') return;
    QRCode.toDataURL(shareUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#FF5050', light: '#111111' },
    }).then(setQrDataUrl).catch(() => {});
  }, [mode, shareUrl]);

  const downloadExportCard = async () => {
    setIsDownloading(true);
    try {
      const qrUrl = await QRCode.toDataURL(shareUrl, {
        width: 220, margin: 2,
        color: { dark: '#FF5050', light: '#111111' },
      });

      const canvas = document.createElement('canvas');
      const W = 800, H = 1080;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      const rr = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
      };

      const bg = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, 700);
      bg.addColorStop(0, '#150303'); bg.addColorStop(1, '#050505');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      const tl = ctx.createLinearGradient(0, 0, W, 0);
      tl.addColorStop(0, 'rgba(255,80,80,0)'); tl.addColorStop(0.5, 'rgba(255,80,80,1)'); tl.addColorStop(1, 'rgba(255,80,80,0)');
      ctx.fillStyle = tl; ctx.fillRect(0, 0, W, 3);

      ctx.fillStyle = 'rgba(255,80,80,0.1)';
      rr(40, 26, 210, 28, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(255,80,80,0.25)'; ctx.lineWidth = 1;
      rr(40, 26, 210, 28, 8); ctx.stroke();
      ctx.fillStyle = '#FF5050';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText('VANBER•ESTEYN  WRAPPED', 55, 43);

      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(sessionId.toUpperCase(), W - 40, 43);
      ctx.textAlign = 'left';

      ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(40, 68, W - 80, 1);

      await document.fonts.ready;
      ctx.font = '72px serif'; ctx.textAlign = 'center';
      ctx.fillText(activeArchetype?.emoji || '👑', W / 2, 185);

      ctx.fillStyle = '#FF5050';
      ctx.font = 'bold 30px "Inter", system-ui, sans-serif';
      ctx.textAlign = 'center';
      const rawTitle = generateUserTitle().toUpperCase();
      const maxTW = W - 120;
      const titleWords = rawTitle.split(' ');
      const titleLines: string[] = [];
      let tLine = '';
      for (const word of titleWords) {
        const test = tLine ? tLine + ' ' + word : word;
        if (ctx.measureText(test).width > maxTW && tLine) { titleLines.push(tLine); tLine = word; }
        else { tLine = test; }
      }
      titleLines.push(tLine);
      titleLines.forEach((line, i) => ctx.fillText(line, W / 2, 240 + i * 36));

      const archetypeY = 240 + titleLines.length * 36;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText((activeArchetype?.title || '').toUpperCase(), W / 2, archetypeY);
      ctx.textAlign = 'left';

      const statsY = archetypeY + 34;
      const cW = (W - 80 - 20) / 3, cH = 96;
      [
        { label: 'GENRE SFEER', value: genreInfo.emoji + ' ' + genreInfo.label, color: '#10b981' },
        { label: 'ENERGIE', value: calcEnergyAndVibe() + '%', color: '#00ffcc' },
        { label: 'DEELNAME', value: calcParticipation() + '%', color: '#FF5050' },
      ].forEach(({ label, value, color }, i) => {
        const cx = 40 + i * (cW + 10);
        ctx.fillStyle = 'rgba(255,255,255,0.03)'; rr(cx, statsY, cW, cH, 14); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; rr(cx, statsY, cW, cH, 14); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, cx + cW / 2, statsY + 22);
        ctx.fillStyle = color;
        ctx.font = 'bold 20px "Inter", system-ui, sans-serif';
        ctx.fillText(value, cx + cW / 2, statsY + 62);
        ctx.textAlign = 'left';
      });

      const radarY = statsY + cH + 22;
      ctx.fillStyle = 'rgba(255,255,255,0.03)'; rr(40, radarY, W - 80, 196, 18); ctx.fill();
      ctx.strokeStyle = 'rgba(255,80,80,0.12)'; ctx.lineWidth = 1; rr(40, radarY, W - 80, 196, 18); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.fillText('CALIBRATIE RADAR', 60, radarY + 22);
      const barAreaX = 165, barAreaW = W - barAreaX - 90;
      [
        { label: 'FILMDUUR', id: 'duration', color: '#8b5cf6' },
        { label: 'IMMERSIE', id: 'immersion', color: '#06b6d4' },
        { label: 'SOCIAAL', id: 'social', color: '#f43f5e' },
        { label: 'PAUZES', id: 'breaks', color: '#f59e0b' },
      ].forEach(({ label, id, color }, i) => {
        const sy = radarY + 44 + i * 38;
        const val = (answers[id] ?? 50) / 100;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillText(label, 60, sy + 10);
        ctx.fillStyle = 'rgba(255,255,255,0.07)'; rr(barAreaX, sy, barAreaW, 8, 4); ctx.fill();
        ctx.fillStyle = color; rr(barAreaX, sy, Math.max(4, barAreaW * val), 8, 4); ctx.fill();
        ctx.fillStyle = color; ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(val * 100) + '%', W - 50, sy + 10);
        ctx.textAlign = 'left';
      });

      const divY = radarY + 210;
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(40, divY, W - 80, 1);

      const qrImg = new Image();
      await new Promise<void>((res, rej) => { qrImg.onload = () => res(); qrImg.onerror = rej; qrImg.src = qrUrl; });
      const qrSize = 155, qrY = divY + 22;
      ctx.fillStyle = '#111111'; rr(40, qrY - 8, qrSize + 16, qrSize + 16, 14); ctx.fill();
      ctx.drawImage(qrImg, 48, qrY, qrSize, qrSize);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN OM TE STARTEN', 40 + (qrSize + 16) / 2, qrY + qrSize + 22);

      ctx.fillStyle = '#FF5050';
      ctx.font = 'bold 26px "Inter", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('VanBeresteyn', W - 40, qrY + 46);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('WRAPPED EXPERIENCE 2025', W - 40, qrY + 66);

      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = '11px "Inter", system-ui, sans-serif';
      const descWords = ('"' + (activeArchetype?.description || '') + '"').split(' ');
      let dLine = '', dY = qrY + 100;
      for (const word of descWords) {
        const test = dLine ? dLine + ' ' + word : word;
        if (ctx.measureText(test).width > 430 && dLine) {
          ctx.fillText(dLine, W - 40, dY); dLine = word; dY += 17;
          if (dY > qrY + qrSize) break;
        } else { dLine = test; }
      }
      if (dLine) ctx.fillText(dLine, W - 40, dY);
      ctx.textAlign = 'left';

      const bl = ctx.createLinearGradient(0, 0, W, 0);
      bl.addColorStop(0, 'rgba(255,80,80,0)'); bl.addColorStop(0.5, 'rgba(255,80,80,0.7)'); bl.addColorStop(1, 'rgba(255,80,80,0)');
      ctx.fillStyle = bl; ctx.fillRect(0, H - 3, W, 3);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `vbn-wrapped-${sessionId}.png`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
      }, 'image/png');

      setDownloadComplete(true);
      setTimeout(() => setDownloadComplete(false), 3000);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 select-none touch-manipulation flex flex-col overflow-hidden text-white">
      {/* Decorative background blobs */}
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-blue-900/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Top-right controls */}
      <div className="absolute top-8 right-8 z-[220] flex items-center gap-3">
        {mode === 'slides' && (
          <InteractiveButton
            onClick={() => {
              setIsPaused(!isPaused);
              soundManager.play('CLICK', 0.2);
            }}
            className="px-3 py-2 bg-white/5 rounded-full text-xs font-mono font-bold tracking-widest uppercase border border-white/10 text-white/70"
          >
            {isPaused ? '▶️ PLAY' : '⏸️ PAUZE'}
          </InteractiveButton>
        )}

        <InteractiveButton
          onClick={onClose}
          className="p-3 bg-white/5 border border-white/10 rounded-full text-white/60"
        >
          <X className="w-5 h-5" />
        </InteractiveButton>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'slides' ? (
          /* ════════════════════════════════════════
             SLIDESHOW VIEW
          ════════════════════════════════════════ */
          <motion.div
            key="slides_mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col justify-between max-w-lg w-full mx-auto relative h-full"
          >
            {/* Story progress bars */}
            <div className="flex gap-1.5 px-6 pt-10 absolute top-0 inset-x-0 z-[210]">
              {slides.map((_, index) => {
                let width = '0%';
                if (index < activeSlide) width = '100%';
                if (index === activeSlide) width = `${slideProgress}%`;
                return (
                  <div key={index} className="h-[2.5px] flex-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand to-red-400 shadow-[0_0_8px_#ff4d4d]"
                      style={{ width, transition: index === activeSlide ? 'none' : 'width 0.15s ease' }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Slide stage */}
            <div className="flex-1 flex items-center justify-center mt-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlide}
                  initial={{ opacity: 0, scale: 0.96, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 1.04, x: -20 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="w-full h-full"
                >
                  {slides[activeSlide].render()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Side tap zones for gesture/touch slide navigation */}
            <div className="absolute inset-y-24 inset-x-0 flex justify-between z-[190] pointer-events-none">
              <InteractiveButton
                onClick={() => {
                  if (activeSlide > 0) {
                    setActiveSlide(activeSlide - 1);
                    setSlideProgress(0);
                    soundManager.play('CLICK', 0.2);
                  }
                }}
                className="w-1/4 h-full pointer-events-auto cursor-w-resize bg-transparent"
              >
                <span />
              </InteractiveButton>

              <InteractiveButton
                onClick={() => {
                  if (activeSlide < slides.length - 1) {
                    setActiveSlide(activeSlide + 1);
                    setSlideProgress(0);
                    soundManager.play('CLICK', 0.2);
                  } else {
                    setMode('summary');
                  }
                }}
                className="w-1/4 h-full pointer-events-auto cursor-e-resize bg-transparent"
              >
                <span />
              </InteractiveButton>
            </div>

            {/* Bottom navigation bar */}
            <div className="flex justify-between items-center px-8 pb-10 z-[210]">
              <InteractiveButton
                disabled={activeSlide === 0}
                onClick={() => {
                  setActiveSlide(activeSlide - 1);
                  setSlideProgress(0);
                  soundManager.play('CLICK', 0.2);
                }}
                className={cn(
                  "p-2.5 rounded-full glass border border-white/10 text-white/50",
                  activeSlide === 0 && "opacity-20"
                )}
              >
                <ArrowLeft className="w-4 h-4" />
              </InteractiveButton>

              <span className="font-mono text-[10px] tracking-widest text-white/40">
                STORY {activeSlide + 1} / {slides.length}
              </span>

              <InteractiveButton
                onClick={() => {
                  if (activeSlide < slides.length - 1) {
                    setActiveSlide(activeSlide + 1);
                    setSlideProgress(0);
                    soundManager.play('CLICK', 0.2);
                  } else {
                    setMode('summary');
                  }
                }}
                className="p-2.5 rounded-full border border-brand bg-brand text-black font-black"
              >
                <ArrowRight className="w-4 h-4 fill-current" />
              </InteractiveButton>
            </div>
          </motion.div>

        ) : (
          /* ════════════════════════════════════════
             EXPORT & SHARE — FINAL SCREEN
          ════════════════════════════════════════ */
          <motion.div
            key="summary_mode"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex-1 w-full max-w-5xl mx-auto px-6 py-10 md:py-14 overflow-y-auto custom-scrollbar relative h-full flex flex-col"
          >
            {/* Header */}
            <div className="text-center mb-10">
              <span className="px-3.5 py-1 text-[9px] font-mono font-black uppercase text-brand tracking-widest bg-brand/10 border border-brand/20 rounded-md inline-block mb-3">
                EXPORTEER & DEEL
              </span>
              <h1 className="text-3xl md:text-5xl font-display font-black uppercase tracking-tight text-white leading-none">
                JOUW <span className="text-brand">WRAPPED KAART</span>
              </h1>
              <p className="text-xs text-white/40 mt-2 font-mono uppercase tracking-widest">
                Download en deel jouw resultaten
              </p>
            </div>

            {/* Export Card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="glass border border-white/5 rounded-[2.5rem] p-6 md:p-10 bg-black/50 shadow-2xl relative overflow-hidden flex-1"
            >
              <div className="absolute top-0 inset-x-0 h-[2px] bg-brand/30 animate-scan" style={{ animationDuration: '6s' }} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start h-full">

                {/* Left: Card Preview */}
                <div>
                  <span className="font-mono text-[9px] text-white/30 uppercase tracking-widest font-black block mb-3">
                    Kaart Voorbeeld
                  </span>

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="relative rounded-3xl overflow-hidden border border-brand/25 shadow-2xl shadow-brand/10 bg-[#090909]"
                    style={{ aspectRatio: '4/5' }}
                  >
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent" />
                    <div className="p-5 flex flex-col h-full">
                      <div className="flex justify-between items-center mb-5">
                        <span className="font-mono text-[8px] font-black uppercase text-brand tracking-widest bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-md">
                          VBN WRAPPED
                        </span>
                        <span className="font-mono text-[7px] text-white/20 uppercase tracking-widest">
                          {sessionId.substring(0, 14)}
                        </span>
                      </div>

                      <div className="text-center mb-4">
                        <motion.div
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                          className="text-5xl mb-2"
                        >
                          {activeArchetype?.emoji}
                        </motion.div>
                        <h3 className="text-sm font-display font-black uppercase text-brand tracking-tight leading-tight">
                          {generateUserTitle()}
                        </h3>
                        <p className="font-mono text-[8px] text-white/35 uppercase tracking-widest mt-0.5">
                          {activeArchetype?.title}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 mb-4">
                        {[
                          { label: 'GENRE', value: genreInfo.emoji + ' ' + genreInfo.label, color: 'text-emerald-400' },
                          { label: 'ENERGIE', value: calcEnergyAndVibe() + '%', color: 'text-[#00ffcc]' },
                          { label: 'SCORE', value: calcParticipation() + '%', color: 'text-brand' },
                        ].map((s) => (
                          <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-2 text-center">
                            <div className="font-mono text-[6px] text-white/25 uppercase tracking-widest mb-0.5">{s.label}</div>
                            <div className={cn('font-mono font-black text-[10px]', s.color)}>{s.value}</div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col gap-1.5 mb-5 flex-1">
                        {[
                          { label: 'Duur', id: 'duration', color: '#8b5cf6' },
                          { label: 'Immersie', id: 'immersion', color: '#06b6d4' },
                          { label: 'Sociaal', id: 'social', color: '#f43f5e' },
                          { label: 'Pauzes', id: 'breaks', color: '#f59e0b' },
                        ].map((s) => (
                          <div key={s.id} className="flex items-center gap-2">
                            <span className="font-mono text-[6px] text-white/25 uppercase w-10 shrink-0">{s.label}</span>
                            <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${answers[s.id] ?? 50}%`, backgroundColor: s.color }} />
                            </div>
                            <span className="font-mono text-[7px] font-black shrink-0" style={{ color: s.color }}>
                              {answers[s.id] ?? 50}%
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-end justify-between mt-auto">
                        <div className="flex flex-col items-center gap-1">
                          {qrDataUrl ? (
                            <img src={qrDataUrl} alt="QR" className="rounded-lg opacity-75" style={{ width: 52, height: 52 }} />
                          ) : (
                            <div className="w-[52px] h-[52px] rounded-lg bg-white/5 border border-white/10 animate-pulse" />
                          )}
                          <span className="font-mono text-[5px] text-white/25 uppercase tracking-widest">SCAN MIJ</span>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] font-display font-black text-brand">VanBeresteyn</div>
                          <div className="font-mono text-[6px] text-white/20 uppercase tracking-widest">WRAPPED 2025</div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand/50 to-transparent" />
                  </motion.div>
                </div>

                {/* Right: QR + Actions */}
                <div className="flex flex-col gap-8">

                  {/* QR code */}
                  <div>
                    <span className="font-mono text-[9px] text-white/30 uppercase tracking-widest font-black block mb-3">
                      Scan Op Je Telefoon
                    </span>
                    <div className="flex items-start gap-5">
                      <div className="glass border border-brand/20 rounded-2xl p-3 bg-black/60 flex flex-col items-center gap-2 shrink-0">
                        {qrDataUrl ? (
                          <motion.img
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            src={qrDataUrl}
                            alt="QR code"
                            className="rounded-lg"
                            style={{ width: 130, height: 130 }}
                          />
                        ) : (
                          <div className="w-[130px] h-[130px] rounded-lg bg-white/5 border border-white/10 animate-pulse" />
                        )}
                        <span className="font-mono text-[8px] text-white/35 uppercase tracking-widest">VBN Experience</span>
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="w-7 h-7 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center shrink-0">
                            <Smartphone className="w-3.5 h-3.5 text-brand" />
                          </div>
                          <span className="text-xs font-display font-bold uppercase text-white/80">Scan & Deel</span>
                        </div>
                        <p className="text-[11px] text-white/40 leading-relaxed font-light">
                          Scan deze QR code om direct toegang te krijgen tot je VBNext informatie op je telefoon
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Download button */}
                  <div className="flex flex-col gap-3">
                    <InteractiveButton
                      onClick={() => {
                        if (!isDownloading) {
                          soundManager.play('SUCCESS', 0.3);
                          downloadExportCard();
                        }
                      }}
                      disabled={isDownloading}
                      className={cn(
                        'w-full rounded-2xl font-display font-black uppercase text-sm tracking-widest',
                        downloadComplete
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                          : isDownloading
                            ? 'bg-brand/50 text-black/60'
                            : 'bg-brand text-black shadow-lg shadow-brand/20'
                      )}
                    >
                      <div className="flex items-center justify-center gap-3 px-6 py-4 w-full">
                        {isDownloading ? (
                          <><RefreshCw className="w-4 h-4 animate-spin" /><span>Genereren...</span></>
                        ) : downloadComplete ? (
                          <span>✓ Gedownload!</span>
                        ) : (
                          <><Download className="w-4 h-4" /><span>Download als Afbeelding</span></>
                        )}
                      </div>
                    </InteractiveButton>

                    <InteractiveButton
                      onClick={() => {
                        soundManager.play('SUCCESS', 0.5);
                        navigator.clipboard.writeText(
                          `Ik ben gecalibreerd als de ${generateUserTitle()} in de VanBeresteyn Experience! Met een cultuuraandeel van ${calcParticipation()}%! Probeer het zelf op de development game console.`
                        ).then(() => { soundManager.play('CLICK', 0.3); }).catch(() => {});
                      }}
                      className="w-full px-5 py-3 bg-white/5 border border-white/10 text-white/70 font-display font-bold uppercase text-[10px] tracking-widest rounded-2xl"
                    >
                      <div className="flex items-center gap-2">
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Kopieer Deel-Tekst</span>
                      </div>
                    </InteractiveButton>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bottom actions */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8 pb-4">
              <InteractiveButton
                onClick={() => {
                  soundManager.play('SUCCESS', 0.3);
                  setActiveSlide(0);
                  setSlideProgress(0);
                  setMode('slides');
                }}
                className="px-6 py-3 bg-white/5 border border-white/10 text-white/80 font-display font-bold uppercase text-[10px] tracking-widest rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  <span>Replay Story</span>
                </div>
              </InteractiveButton>

              <InteractiveButton
                onClick={() => {
                  soundManager.play('SUCCESS', 0.5);
                  onClose();
                }}
                className="px-8 py-3.5 bg-brand text-black font-display font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg"
              >
                Opnieuw Afspelen
              </InteractiveButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
