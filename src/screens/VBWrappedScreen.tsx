import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Trophy, 
  Flame, 
  Mic, 
  Cpu, 
  Lock, 
  Activity, 
  Compass, 
  Heart, 
  Zap, 
  User, 
  Play, 
  Volume2, 
  Layers, 
  Sliders, 
  MessageSquare,
  RefreshCw,
  Share2,
  Award
} from 'lucide-react';
import { cn } from '../lib/utils';
import { soundManager } from '../lib/sound';

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
    setAnswer,
    toggleGenre
  } = useStore();

  useEffect(() => {
    // Save session data to Firestore on load
    const saveSessionData = async () => {
      try {
        await setDoc(doc(db, 'sessions', sessionId), {
          sessionId,
          genres: selectedGenres,
          answers,
          archetypeId: activeArchetype?.id,
          archetypeTitle: activeArchetype?.title,
          timestamp: Date.now(),
          completed: true,
          thanked: true
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}`);
      }
    };
    saveSessionData();

    // Smart idle reset timeout: restarts the experience if no activity is detected for 90 seconds
    let idleTimeout: NodeJS.Timeout;
    
    const resetIdleTimer = () => {
      if (idleTimeout) clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        onClose();
      }, 90000); // 90 seconds idle timeout to allow plentiful slide watching & dashboard playing
    };

    // Initialize timer
    resetIdleTimer();

    // Listen to user interactions to reset idle timer
    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, resetIdleTimer);
    });

    return () => {
      if (idleTimeout) clearTimeout(idleTimeout);
      events.forEach(event => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [sessionId, selectedGenres, answers, activeArchetype, onClose]);

  const [mode, setMode] = useState<'slides' | 'summary'>('slides');
  const [activeSlide, setActiveSlide] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Define genres
  const hasGenre = selectedGenres.length > 0;
  const genreId = hasGenre ? selectedGenres[0] : 'none';
  const genreInfo = GENRE_STYLES[genreId] || GENRE_STYLES.none;

  // Answers count
  const answersCount = Object.keys(answers).length;
  const hasAnswers = answersCount > 0;

  // Calculators
  // 1. Energy Score / Vibe Rating
  const calcEnergyAndVibe = () => {
    let base = 50;
    if (answers['immersion']) base += (answers['immersion'] - 50) * 0.3;
    if (answers['social']) base += (answers['social'] - 50) * 0.3;
    if (answers['duration']) base -= (answers['duration'] - 50) * 0.2; // brief is energetic
    if (answers['breaks']) base -= (answers['breaks'] - 50) * 0.2;
    return Math.max(10, Math.min(100, Math.round(base)));
  };

  // 3. User Title
  const generateUserTitle = () => {
    const extreme = getMostExtremeCalibration();
    const cleanExtreme = extreme ? extreme.label.replace('Max-', '').replace('Ultra-', '') : 'Aura';
    return `${activeArchetype?.title || 'Trendsetter'} of ${cleanExtreme}`;
  };

  // 4. Most Extreme Slider Calibration
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

    if (maxDeviation < 5) return null; // Very neutral

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

  const questionLabels: Record<string, { min: string; max: string; desc: string }> = {
    duration: { min: 'Kort & Krachtig', max: 'Episch Lang', desc: 'filmduursvoorkeur' },
    immersion: { min: 'Passief Relaxt', max: 'Ultiem Meeslepend', desc: 'virtual reality verdrinking' },
    social: { min: 'Individueel Solo', max: 'Mega Sociaal', desc: 'groepscohesie' },
    breaks: { min: 'Non-stop Flow', max: 'Bewust Gedoseerd', desc: 'reflectiepauzes' }
  };

  // 5. Vocal Persona Profile
  const hasVoice = !!voiceFeedbackText && voiceFeedbackText.trim().length > 0;
  const getVocalPersona = () => {
    if (!hasVoice) return null;
    const wordCount = voiceFeedbackOriginal ? voiceFeedbackOriginal.split(' ').length : 0;
    
    let title = 'De Snappy Minimalist';
    let emoji = '🎙️';
    let summary = 'Kort, bondig en to-the-point. Je verspilt geen woorden en deelt direct je scherpe mening!';
    
    if (wordCount > 18) {
      title = 'De Eloquente Spraakwaterval';
      emoji = '🗣️';
      summary = 'Jij houdt wel van een goed gesprek! Je legt je feedback diepgaand en met veel passie uit.';
    } else if (voiceFeedbackOriginal?.toLowerCase().includes('stom') || voiceFeedbackOriginal?.toLowerCase().includes('slecht')) {
      title = 'De Ongezouten Critici';
      emoji = '🌶️';
      summary = 'Eerlijk, vurig en kritisch. Jij noemt het beestje direct bij zijn naam en helpt ons echt scherp te blijven!';
    } else if (voiceFeedbackOriginal && voiceFeedbackOriginal !== voiceFeedbackText) {
      title = 'The Stealth Censor-dodger';
      emoji = '🕵️';
      summary = 'Je hebt de AI filters echt uitgetest! Onze slimme gematigde audit heeft je opmerkingen keurig gered.';
    } else if (wordCount > 6) {
      title = 'De Filosofische Vibe-Expert';
      emoji = '🧘';
      summary = 'Bedachtzame feedback met de perfecte balans. Je woorden klinken gebalanceerd en inspirerend.';
    }

    return { title, emoji, summary, wordCount };
  };

  // 6. Overall Participation Level %
  const calcParticipation = () => {
    let score = 0;
    if (hasGenre) score += 30;
    score += (answersCount / 4) * 45; // up to 45%
    if (hasVoice) score += 25;
    return Math.round(Math.min(100, score));
  };

  const slides = [
    {
      id: 'welcome',
      render: () => (
        <div className="flex flex-col items-center justify-center text-center h-full max-w-lg mx-auto px-4 py-8 relative">
          <div className="absolute top-12 left-1/2 -translate-x-1/2 animate-bounce">
            <span className="px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20 font-mono text-[9px] uppercase tracking-widest font-black text-brand">
              ✨ VANBERESTEYN CO-OP v1.0
            </span>
          </div>

          <div className="relative mb-8">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
              className="w-36 h-36 rounded-full border-2 border-dashed border-brand/35 flex items-center justify-center p-2 relative"
            >
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-brand to-red-400 opacity-20 blur-md absolute" />
            </motion.div>
            <div className="absolute inset-0 flex items-center justify-center text-5xl">
              {activeArchetype?.emoji || '🧬'}
            </div>
          </div>

          <h2 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tight leading-none mb-4 text-white">
            MIJN TIENER <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand via-rose-400 to-yellow-400">
              VIBE WRAPPED
            </span>
          </h2>
          <p className="text-white/60 text-sm mb-8 leading-relaxed max-w-xs">
            Zie in real-time welk cultuur-profiel en welke prestaties je hebt ontgrendeld tijdens je calibratie-sessie!
          </p>

          <div className="flex flex-col gap-2.5 w-full">
            <button
              onClick={() => {
                soundManager.play('SUCCESS', 0.2);
                setIsPaused(false);
                setSlideProgress(0);
                setActiveSlide(1);
              }}
              className="px-8 py-3.5 bg-brand text-black font-display font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-brand/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Ontdek Mijn Verhaal</span>
              <ArrowRight className="w-4 h-4 fill-current" />
            </button>
            
            <button
              onClick={() => {
                soundManager.play('CLICK', 0.3);
                setMode('summary');
              }}
              className="px-8 py-3.5 bg-white/5 border border-white/5 hover:bg-white/10 text-white/70 font-display font-bold uppercase text-xs tracking-widest rounded-2xl transition-all cursor-pointer"
            >
              Direct Naar Dashboard 📊
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'genre',
      render: () => (
        <div className="flex flex-col justify-between h-full px-4 py-8 relative">
          <div className="text-center mt-6">
            <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-white/30 block mb-2">
              STAP 1 // DE EERSTE INTERACTIE
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tight text-white leading-none">
              Jouw Initiële <span className="text-brand">Sfeervibe</span>
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
                
                <div className="mt-6 font-mono text-[9px] uppercase tracking-widest font-black text-black bg-white/80 p-2 rounded-xl inline-block">
                  SFEER: GELAUNCHED 🚀
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="my-auto max-w-sm mx-auto p-8 glass border border-white/5 rounded-3xl text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-white/5 rounded-full border border-white/5 flex items-center justify-center mb-4 text-white/20">
                <Lock className="w-6 h-6 text-brand/40 animate-pulse" />
              </div>
              <h3 className="text-sm font-display font-bold uppercase tracking-wider text-white mb-2">
                Sfeer Nog Niet Gekozen
              </h3>
              <p className="text-[11px] text-white/40 leading-relaxed mb-6">
                Keep exploring to unlock this insight. Ga terug naar de sfeerselectie-gamedisplay om deze te kalibreren!
              </p>
              <button
                onClick={() => {
                  soundManager.play('CLICK', 0.3);
                  setStep('genre');
                }}
                className="px-6 py-2.5 bg-brand text-black font-mono text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Kies Sfeer Nu 🧭
              </button>
            </div>
          )}

          <div className="text-center text-[10px] text-white/30 font-mono uppercase tracking-widest mb-6">
            Genres weerspiegelen jouw emotionele startlijn
          </div>
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
              <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-white/30 block mb-2">
                STAP 2 // DE SCHUIFREGELAARS
              </span>
              <h2 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tight text-white leading-none">
                Uiterste <span className="text-brand">Meting</span>
              </h2>
            </div>

            {hasAnswers && extreme ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="my-auto max-w-sm mx-auto w-full"
              >
                <div className="glass border border-brand/20 bg-black/60 rounded-[2rem] p-8 text-center relative overflow-hidden shadow-2xl">
                  {/* Neon laser scan bar */}
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
                    {extreme.desc} Jij houdt niet van halfslachtige keuzes; je stemt met maximale overtuiging!
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="my-auto max-w-sm mx-auto p-8 glass border border-white/5 rounded-3xl text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-white/5 rounded-full border border-white/5 flex items-center justify-center mb-4 text-white/20">
                  <Lock className="w-6 h-6 text-brand/40 animate-pulse" />
                </div>
                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-white mb-2">
                  Calibratie Nog Niet Compleet
                </h3>
                <p className="text-[11px] text-white/40 leading-relaxed mb-6">
                  Keep exploring to unlock this insight. Beantwoord de schuifregelaars om jouw meest extreme ijkpunten in te ramen!
                </p>
                <button
                  onClick={() => {
                    soundManager.play('CLICK', 0.3);
                    setStep('questions');
                  }}
                  className="px-6 py-2.5 bg-brand text-black font-mono text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  Start Kalibratie 🧪
                </button>
              </div>
            )}

            <div className="text-center text-[10px] text-white/30 font-mono uppercase tracking-widest mb-6">
              Sliders bouwen de contouren van je cultuurprofiel
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
              STAP 3 // IDENTITEITSCODE
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
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#00ffcc] font-black border border-[#00ffcc]/20 px-3 py-1 bg-[#00ffcc]/5 rounded-full inline-block mb-4">
                {activeArchetype?.subtitle}
              </span>
              
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
                <span className="font-mono text-[8px] uppercase font-bold text-white/30 block mb-1">
                  CO-OP MATCHMAKING COMPATIBILITY:
                </span>
                <span className="text-[10px] text-white/90 font-medium">
                  {activeArchetype?.socialFit}
                </span>
              </div>
            </div>
          </motion.div>

          <div className="text-center text-[10px] text-white/30 font-mono uppercase tracking-widest mb-6">
            Archetypes veranderen mee met dynamische keuzes
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
                STAP 4 // SPEECH-TO-TEXT ANALYTICS
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
                      GEAUDITEERD SPRAAKINSIGHT:
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
                  Keep exploring to unlock this insight. Deel je spraak-feedback bij de microfoonscreen om een real-time AI analyseresultaat toe te voegen!
                </p>
                <button
                  onClick={() => {
                    soundManager.play('CLICK', 0.3);
                    setStep('voice_feedback');
                  }}
                  className="px-6 py-2.5 bg-brand text-black font-mono text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  Nu Inspreken 🎙️
                </button>
              </div>
            )}

            <div className="text-center text-[10px] text-white/30 font-mono uppercase tracking-widest mb-6">
              AI module analyseert toon, lengte en woordkeuze
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
              FINALE DOSSIERCOGNITIE
            </span>
            <h2 className="text-2xl md:text-3xl font-display font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand to-rose-400 leading-none">
              JOUW WRAPPED CERTIFICATE
            </h2>
          </div>

          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="my-auto max-w-sm mx-auto w-full"
          >
            <div className="relative glass bg-[#0e0e0e] border-2 border-brand/40 rounded-[2.5rem] p-6 shadow-2xl flex flex-col items-center">
              {/* Decorative design sparkles */}
              <div className="absolute top-4 left-4 text-brand/35 text-xs animate-ping font-mono">✦</div>
              <div className="absolute bottom-4 right-4 text-[#00ffcc]/35 text-xs animate-pulse font-mono">✦</div>
              
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest border border-white/5 p-1 px-3 bg-white/[0.02] rounded-full mb-4">
                CO-OP MEMORANDUM // 2026
              </div>

              <div className="w-16 h-16 rounded-3xl bg-brand font-black text-black text-3xl flex items-center justify-center rotate-6 shadow-lg shadow-brand/10 mb-4 font-mono">
                {activeArchetype?.emoji}
              </div>

              <h3 className="text-center text-xl font-display font-black uppercase text-brand tracking-tight mb-1">
                {generateUserTitle()}
              </h3>
              <p className="text-[10px] text-white/40 uppercase font-mono tracking-widest mb-6">
                ARCHETYPE INVENTIE: {activeArchetype?.title}
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
                "Je bent uniek gecalibreerd binnen het cultuurlandschap van VanBeresteyn. Deel je Wrapped of probeer andere sfeercombi\'s!"
              </p>
            </div>
          </motion.div>

          {/* Bottom buttons summary */}
          <div className="flex flex-col gap-2 w-full max-w-sm mx-auto mb-4">
            <button
              onClick={() => {
                soundManager.play('CLICK', 0.2);
                setMode('summary');
              }}
              className="px-6 py-3 bg-brand/10 border border-brand/20 hover:bg-brand/20 text-brand font-display font-bold uppercase text-[10px] tracking-widest rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Layers className="w-4 h-4" />
              <span>Bekijk Geconsolideerd Dashboard</span>
            </button>
            
            <button
              onClick={() => {
                soundManager.play('SUCCESS', 0.5);
                onClose();
              }}
              className="px-6 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:text-white hover:bg-rose-500/10 font-mono text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
            >
              Speel Opnieuw 🔄
            </button>
          </div>
        </div>
      )
    }
  ];

  // Story Slides auto-advancer
  useEffect(() => {
    if (mode === 'summary' || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const interval = 60; // ms
    const stepAmount = 100 / (6000 / interval); // 6 seconds total per slide

    timerRef.current = setInterval(() => {
      setSlideProgress(prev => {
        const next = prev + stepAmount;
        if (next >= 100) {
          if (activeSlide < slides.length - 1) {
            setActiveSlide(prevSlide => prevSlide + 1);
            return 0;
          } else {
            // Completed, go to summary dashboard
            setMode('summary');
            return 100;
          }
        }
        return next;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSlide, mode, isPaused]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 select-none touch-manipulation flex flex-col overflow-hidden text-white">
      {/* Decorative background vectors */}
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-blue-900/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating control close trigger (top-right) */}
      <div className="absolute top-8 right-8 z-[220] flex items-center gap-3">
        {mode === 'slides' && (
          <button
            onClick={() => {
              setIsPaused(!isPaused);
              soundManager.play('CLICK', 0.2);
            }}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-xs font-mono font-bold tracking-widest uppercase border border-white/10 cursor-pointer text-white/70 hover:text-white transition-all shadow-md"
          >
            {isPaused ? '▶️ PLAY' : '⏸️ PAUZE'}
          </button>
        )}
        
        <button
          onClick={onClose}
          className="p-3 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 rounded-full text-white/60 hover:text-red-500 transition-all cursor-pointer shadow-lg z-[250]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'slides' ? (
          /* ==================================== */
          /* SLIDESHOW VIEW                       */
          /* ==================================== */
          <motion.div
            key="slides_mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col justify-between max-w-lg w-full mx-auto relative h-full"
          >
            {/* Story Progress Bars Bar */}
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

            {/* Slide renderer stage */}
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

            {/* Tap/click helpers for navigating slide stories */}
            <div className="absolute inset-y-24 inset-x-0 flex justify-between z-[190] pointer-events-none">
              <button 
                onClick={() => {
                  if (activeSlide > 0) {
                    setActiveSlide(activeSlide - 1);
                    setSlideProgress(0);
                    soundManager.play('CLICK', 0.2);
                  }
                }}
                className="w-1/4 h-full pointer-events-auto cursor-w-resize"
                title="Vorige Slide"
              />
              <button 
                onClick={() => {
                  if (activeSlide < slides.length - 1) {
                    setActiveSlide(activeSlide + 1);
                    setSlideProgress(0);
                    soundManager.play('CLICK', 0.2);
                  } else {
                    setMode('summary');
                  }
                }}
                className="w-1/4 h-full pointer-events-auto cursor-e-resize"
                title="Volgende Slide"
              />
            </div>
            
            {/* Slide Navigation Buttons At bottom */}
            <div className="flex justify-between items-center px-8 pb-10 z-[210]">
              <button
                disabled={activeSlide === 0}
                onClick={() => {
                  setActiveSlide(activeSlide - 1);
                  setSlideProgress(0);
                  soundManager.play('CLICK', 0.2);
                }}
                className={cn(
                  "p-2.5 rounded-full glass border border-white/10 text-white/50 hover:text-white transition-colors cursor-pointer",
                  activeSlide === 0 && "opacity-20 cursor-not-allowed"
                )}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <span className="font-mono text-[10px] tracking-widest text-white/40">
                STORY {activeSlide + 1} / {slides.length}
              </span>

              <button
                onClick={() => {
                  if (activeSlide < slides.length - 1) {
                    setActiveSlide(activeSlide + 1);
                    setSlideProgress(0);
                    soundManager.play('CLICK', 0.2);
                  } else {
                    setMode('summary');
                  }
                }}
                className="p-2.5 rounded-full border border-brand bg-brand text-black font-black hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <ArrowRight className="w-4 h-4 fill-current" />
              </button>
            </div>
          </motion.div>
        ) : (
          /* ==================================== */
          /* SUMMARY DASHBOARD GRID VIEW          */
          /* ==================================== */
          <motion.div
            key="summary_mode"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex-1 w-full max-w-5xl mx-auto px-6 py-10 md:py-16 overflow-y-auto custom-scrollbar relative h-full flex flex-col justify-between"
          >
            <div>
              {/* Top summary title */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-8 mb-10 gap-6">
                <div>
                  <span className="px-3.5 py-1 text-[9px] font-mono font-black uppercase text-brand tracking-widest bg-brand/10 border border-brand/20 rounded-md">
                    CO-OP TRANSITIEDATA HUB
                  </span>
                  <h1 className="text-3xl md:text-5xl font-display font-black uppercase tracking-tight text-white leading-none mt-3">
                    MIJN VERZAMELDE <span className="text-brand">INSIGHTS</span>
                  </h1>
                  <p className="text-xs text-white/40 mt-2 font-mono uppercase tracking-widest">
                    Live dynamic analytics • updateert bij elke actie
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      soundManager.play('SUCCESS', 0.3);
                      setActiveSlide(0);
                      setSlideProgress(0);
                      setMode('slides');
                    }}
                    className="px-5 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 font-display font-bold uppercase text-[10px] tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" /> REPLAY STORY
                  </button>
                  
                  <button
                    onClick={() => {
                      soundManager.play('SUCCESS', 0.5);
                      navigator.clipboard.writeText(`Ik ben gecalibreerd als de ${generateUserTitle()} in de VanBeresteyn Experience! Met een cultuuraandeel van ${calcParticipation()}%! Probeer het zelf op de development game console.`).then(() => {
                        soundManager.play('CLICK', 0.3);
                      }).catch(() => {});
                    }}
                    className="px-5 py-3 bg-brand text-black font-display font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-brand/10"
                  >
                    <Share2 className="w-4 h-4" fill-current /> COPIEER DEEL-TEKST
                  </button>
                </div>
              </div>

              {/* Bento Grid Summary statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                
                {/* ID Card card */}
                <div className="glass border border-brand/20 bg-brand/5 rounded-[2rem] p-6 flex flex-col justify-between shadow-xl min-h-[220px]">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[#00ffcc] font-black">
                      IDENTITEITS RAPPORT
                    </span>
                    <div className="w-10 h-10 bg-brand/25 rounded-2xl flex items-center justify-center text-2xl font-mono border border-brand/45">
                      {activeArchetype?.emoji}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-black uppercase text-white tracking-tight leading-none mb-1">
                      {generateUserTitle()}
                    </h3>
                    <p className="text-[10px] font-mono text-white/35 uppercase tracking-widest mb-3">
                      ROLE PROFILE: {activeArchetype?.title}
                    </p>
                    <p className="text-[10px] text-white/60 leading-relaxed font-light line-clamp-3">
                      {activeArchetype?.description}
                    </p>
                  </div>
                </div>

                {/* Favorite Vibe Genre card */}
                <div className="glass border border-white/5 rounded-[2rem] p-6 flex flex-col justify-between shadow-xl min-h-[220px]">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-white/30 font-bold">
                        GEKOZEN GENRE SFEER
                      </span>
                      <span className="text-3xl">{genreInfo.emoji}</span>
                    </div>
                    
                    {hasGenre ? (
                      <div>
                        <h4 className="text-xl font-display font-black uppercase tracking-tight text-white mb-1.5">
                          {genreInfo.label} Vibe
                        </h4>
                        <p className="text-[11px] text-white/50 leading-relaxed font-light">
                          {genreInfo.text} Deze selectie geeft kleur aan de volledige calibratie.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-4 text-center">
                        <Lock className="w-5 h-5 text-brand/40 animate-pulse mb-2" />
                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
                          [ Keep exploring to unlock ]
                        </p>
                      </div>
                    )}
                  </div>

                  {!hasGenre && (
                    <button
                      onClick={() => {
                        soundManager.play('CLICK', 0.3);
                        setStep('genre');
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 font-mono text-[9px] uppercase font-bold tracking-widest border border-white/10 rounded-xl text-center w-full cursor-pointer mt-4"
                    >
                      Kies Genre Sfeer
                    </button>
                  )}
                </div>

                {/* Communication and Voice Analytics */}
                <div className="glass border border-white/5 rounded-[2rem] p-6 flex flex-col justify-between shadow-xl min-h-[220px]">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-white/30 font-bold">
                        COMMUNICATIE PERSONA
                      </span>
                      <span className="text-2xl">{hasVoice ? '🎙️' : '🔒'}</span>
                    </div>

                    {hasVoice ? (
                      <div>
                        <h4 className="text-lg font-display font-black uppercase tracking-tight text-white mb-1.5">
                          {getVocalPersona()?.title}
                        </h4>
                        <p className="text-[11px] text-white/50 leading-relaxed font-light line-clamp-3">
                          {getVocalPersona()?.summary}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-4 text-center">
                        <Lock className="w-5 h-5 text-brand/40 animate-pulse mb-2" />
                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
                          [ Voice insight LOCKED ]
                        </p>
                        <p className="text-[10px] text-white/40 mt-1 leading-normal px-2">
                          Keep exploring to unlock this insight
                        </p>
                      </div>
                    )}
                  </div>

                  {!hasVoice && (
                    <button
                      onClick={() => {
                        soundManager.play('CLICK', 0.3);
                        setStep('voice_feedback');
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 font-mono text-[9px] uppercase font-bold tracking-widest border border-white/10 rounded-xl text-center w-full cursor-pointer mt-4"
                    >
                      Audit Voice Record
                    </button>
                  )}
                </div>

                {/* Calibration Energy score indicator card */}
                <div className="glass border border-white/5 rounded-[2rem] p-6 flex flex-col justify-between shadow-xl min-h-[220px]">
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-white/30 font-bold block mb-4">
                      ENERGIE & VIBE RATING
                    </span>
                    
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-5xl font-display font-black uppercase tracking-tight text-[#00ffcc] font-mono leading-none">
                        {calcEnergyAndVibe()}%
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono tracking-widest font-black uppercase">
                        ACTIVE VIBE
                      </span>
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed font-light">
                      Berekend op basis van actieve schuifregelaars en gamified streaks. Een {calcEnergyAndVibe() > 70 ? 'zeer hoog energetisch spectrum' : 'bedachtzame, lage-frequentie aura'}.
                    </p>
                  </div>
                </div>

                {/* Extreme sliders card */}
                <div className="glass border border-white/5 rounded-[2rem] p-6 flex flex-col justify-between shadow-xl min-h-[220px]">
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-white/30 font-bold block mb-4">
                      MEEST EXTREME IJKELEMENT
                    </span>

                    {hasAnswers && getMostExtremeCalibration() ? (
                      <div>
                        <h4 className="text-lg font-display font-black uppercase tracking-tight text-white mb-1.5 flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-[#ff4d4d]" />
                          <span>{getMostExtremeCalibration()?.label}</span>
                        </h4>
                        <p className="text-xs text-white/55 leading-relaxed font-light">
                          {getMostExtremeCalibration()?.desc} Je stemt niet neutraal op deze stelling, ideaal voor een geprononceerde cultuurvoorkeur.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-4 text-center">
                        <Lock className="w-5 h-5 text-brand/40 animate-pulse mb-2" />
                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
                          [ Locked insight ]
                        </p>
                        <p className="text-[10px] text-white/40 mt-1">
                          Sleep de schuifregelaars uiterst om te unlocken
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Achievements progression index card */}
                <div className="glass border border-white/5 rounded-[2rem] p-6 flex flex-col justify-between shadow-xl min-h-[220px]">
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-white/30 font-bold block mb-4">
                      DEELNAME VOLTOOIING
                    </span>

                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-5xl font-display font-black uppercase text-brand tracking-tight font-mono leading-none">
                        {calcParticipation()}%
                      </span>
                      <span className="text-[9px] font-mono text-purple-400 font-bold uppercase tracking-wider">
                        COMPLETED SKELETON
                      </span>
                    </div>

                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-4 relative">
                      <div 
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${calcParticipation()}%` }}
                      />
                    </div>
                    
                    <p className="text-[10px] text-white/40 leading-normal font-light">
                      Voltooi de sfeer selectie, alle schuifregelaars en laat je audio feedback achter voor de felbegeerde 100%!
                    </p>
                  </div>
                </div>

              </div>

              {/* LIVE VIBE TUNING & REAL-TIME CALIBRATION CONSOLE CARD */}
              <div className="glass border-2 border-brand/20 rounded-[2.5rem] p-6 md:p-8 mb-8 bg-black/40 shadow-[0_0_50px_rgba(255,77,77,0.08)] relative overflow-hidden text-left">
                {/* Decorative scanning line and title details */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-brand/35 animate-scan" style={{ animationDuration: '5s' }} />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6 mb-6">
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[#00ffcc] font-black border border-[#00ffcc]/20 px-2.5 py-0.5 bg-[#00ffcc]/5 rounded-full inline-block mb-2">
                      REAL-TIME SIMU-LAB 🧪
                    </span>
                    <h3 className="text-xl md:text-2xl font-display font-black uppercase text-white tracking-tight flex items-center gap-2">
                       LIVE VIBE TUNER & CALIBRATIE CONSOLE
                    </h3>
                    <p className="text-xs text-white/50 font-light leading-relaxed">
                      Wissel direct van genre of versleep de schuifregelaars hieronder om je Wrapped DNA-uitkomst, energietype en archetype in real-time te zien kantelen!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Sferische Matrix (Genre Chooser) */}
                  <div className="flex flex-col gap-4">
                    <span className="font-mono text-[10px] text-white/35 uppercase tracking-widest font-black flex items-center gap-1.5 mb-1 text-left">
                      📍 SFERISCHE MATRIX (GENRE SELECTIE)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.entries(GENRE_STYLES).filter(([key]) => key !== 'none').map(([key, info]) => {
                        const isSelected = selectedGenres.includes(key);
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              toggleGenre(key);
                            }}
                            className={cn(
                              "p-3 rounded-2xl flex flex-col items-center justify-center text-center gap-1 cursor-pointer transition-all border",
                              isSelected 
                                ? "bg-gradient-to-tr from-brand/20 to-brand/5 border-brand text-white shadow-lg shadow-brand/5" 
                                : "bg-white/[0.01] border-white/5 text-white/60 hover:text-white hover:bg-white/[0.04]"
                            )}
                          >
                            <span className="text-2xl mb-1">{info.emoji}</span>
                            <span className="text-[10px] font-display font-black uppercase tracking-wider">{info.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Calibration Parameters (Sliders Tuning) */}
                  <div className="flex flex-col gap-4">
                    <span className="font-mono text-[10px] text-white/35 uppercase tracking-widest font-black flex items-center gap-1.5 mb-1 text-left">
                      ⚙️ EXPERIMENTELE PARAMETERS (SLIDERS TUNEN)
                    </span>
                    <div className="flex flex-col gap-4">
                      {[
                        { id: 'duration', label: 'Filmduur-Voorkeur', min: 'Kort', max: 'Episch' },
                        { id: 'immersion', label: 'Immersie Spectrum', min: 'Passief', max: 'Meeslepend' },
                        { id: 'social', label: 'Sociaal Engagement', min: 'Solo', max: 'Sociaal' },
                        { id: 'breaks', label: 'Reflectie-Pauzes', min: 'Continu', max: 'Gedoseerd' }
                      ].map((param) => {
                        const val = answers[param.id] ?? 50;
                        return (
                          <div key={param.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase mb-1.5 tracking-wider">
                              <span className="text-white/80">{param.label}</span>
                              <span className="text-brand font-mono font-black">{val}%</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-[8px] text-white/30 uppercase tracking-widest">{param.min}</span>
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={val}
                                onChange={(e) => {
                                  const newVal = parseInt(e.target.value, 10);
                                  setAnswer(param.id, newVal);
                                }}
                                className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand animate-none"
                              />
                              <span className="font-mono text-[8px] text-white/30 uppercase tracking-widest">{param.max}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom consolidated feedback actions */}
            <div className="border-t border-white/5 pt-8 mt-10 text-center flex flex-col sm:flex-row justify-between items-center gap-6 font-mono text-[10px] text-white/30">
              <span className="uppercase tracking-widest">
                VanBeresteyn Wrapped • Versie 1.0.2 • 2026
              </span>

              <button
                onClick={() => {
                  soundManager.play('SUCCESS', 0.5);
                  onClose();
                }}
                className="px-8 py-3.5 bg-brand text-black font-display font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer font-black"
              >
                SPEEL OPNIEUW 🔄
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
