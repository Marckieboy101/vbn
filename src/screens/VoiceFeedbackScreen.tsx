import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { 
  Mic, 
  MicOff, 
  CheckCircle2, 
  BrainCircuit, 
  Globe, 
  Settings, 
  Sliders, 
  Shield, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Plus,
  Play,
  Volume2
} from 'lucide-react';
import { InteractiveButton } from '../components/InteractiveButton';
import { soundManager } from '../lib/sound';
import { cn } from '../lib/utils';
import { saveSessionData } from '../lib/sessionStorage';
import { moderateAndRefineSpeech, ModerationResult } from '../services/geminiService';
import { triggerAutomaticGoogleSheetsSync } from '../services/googleSheetsService';

const DEFAULT_PROFANITY_LIST = [
  // Dutch Swears
  'kut', 'klootzak', 'godverdomme', 'godver', 'tyfus', 'tering', 'teringlijer', 'kanker', 'lul', 'hoer', 'flikker', 'pleuris', 'homo', 'slet', 'mongool', 'pannenkoek', 'eikel', 'rotzak', 'klerelijer',
  // English Swears
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'pussy', 'whore', 'motherfucker', 'crap', 'wanker', 'bollocks', 'faggot'
];

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isMuted: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream, isMuted }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    if (!stream || isMuted) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      const ring1 = document.getElementById('mic-pulse-ring-1');
      const ring2 = document.getElementById('mic-pulse-ring-2');
      const btn = document.getElementById('mic-pulse-button');
      if (ring1) ring1.style.transform = 'scale(1)';
      if (ring2) ring2.style.transform = 'scale(1)';
      if (btn) {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = '';
      }
      return;
    }

    const initAudio = async () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        if (!active) {
          audioCtx.close();
          return;
        }

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        let phase = 0;

        const draw = () => {
          if (!active || !canvasRef.current || isMuted) return;
          const currentCanvas = canvasRef.current;
          const currentCtx = currentCanvas.getContext('2d');
          if (!currentCtx) return;

          const width = currentCanvas.width;
          const height = currentCanvas.height;

          animationRef.current = requestAnimationFrame(draw);
          
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          let activeBuckets = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
            if (dataArray[i] > 10) activeBuckets++;
          }
          const average = sum / (activeBuckets || bufferLength);
          let normVolume = average / 140;
          if (normVolume > 1) normVolume = 1;

          const pulseRing1 = document.getElementById('mic-pulse-ring-1');
          const pulseRing2 = document.getElementById('mic-pulse-ring-2');
          const micButton = document.getElementById('mic-pulse-button');

          if (pulseRing1) {
            pulseRing1.style.transform = `scale(${1 + normVolume * 0.75})`;
            pulseRing1.style.opacity = `${0.3 + normVolume * 0.6}`;
          }
          if (pulseRing2) {
            pulseRing2.style.transform = `scale(${1 + normVolume * 1.5})`;
            pulseRing2.style.opacity = `${0.1 + normVolume * 0.4}`;
          }
          if (micButton) {
            micButton.style.transform = `scale(${1 + normVolume * 0.12})`;
            micButton.style.boxShadow = `0 0 ${20 + normVolume * 60}px rgba(244, 63, 94, ${0.15 + normVolume * 0.75})`;
          }

          currentCtx.clearRect(0, 0, width, height);

          const barWidth = (width / bufferLength) * 1.4;
          let barX = 0;
          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * height * 0.5;
            const currentBarHeight = Math.max(2, barHeight);
            const yPos = height / 2 - currentBarHeight / 2;

            const barGrad = currentCtx.createLinearGradient(0, yPos, 0, yPos + currentBarHeight);
            barGrad.addColorStop(0, 'rgba(244, 63, 94, 0.04)');
            barGrad.addColorStop(0.5, `rgba(244, 63, 94, ${0.12 + normVolume * 0.28})`);
            barGrad.addColorStop(1, 'rgba(244, 63, 94, 0.04)');

            currentCtx.fillStyle = barGrad;
            
            if (currentCtx.roundRect) {
              currentCtx.beginPath();
              currentCtx.roundRect(barX, yPos, barWidth - 2, currentBarHeight, 2);
              currentCtx.fill();
            } else {
              currentCtx.fillRect(barX, yPos, barWidth - 2, currentBarHeight);
            }
            barX += barWidth;
          }

          phase += 0.06 + normVolume * 0.08;

          const drawSineWave = (frequency: number, ampMultiplier: number, phaseOffset: number, color: string, lineWidth: number) => {
            currentCtx.beginPath();
            currentCtx.moveTo(0, height / 2);

            for (let xPos = 0; xPos <= width; xPos += 2) {
              const taper = Math.sin((xPos / width) * Math.PI);
              const sinAngle = xPos * frequency + phaseOffset;
              const y = height / 2 + Math.sin(sinAngle) * (14 + normVolume * 28) * ampMultiplier * taper;
              currentCtx.lineTo(xPos, y);
            }

            currentCtx.strokeStyle = color;
            currentCtx.lineWidth = lineWidth;
            currentCtx.stroke();
          };

          drawSineWave(0.018, 0.9, phase, 'rgba(244, 63, 94, 0.95)', 2.5);
          drawSineWave(0.012, 0.6, phase * 1.35 + Math.PI / 4, 'rgba(249, 115, 22, 0.45)', 1.5);
          drawSineWave(0.026, 0.45, phase * 0.7 - Math.PI / 3, 'rgba(236, 72, 153, 0.35)', 1.0);
        };

        draw();
      } catch (err) {
        console.warn('Audio Context initialization skipped or failed:', err);
      }
    };

    initAudio();

    return () => {
      active = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stream, isMuted]);

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-4">
      <canvas 
        ref={canvasRef} 
        width={320} 
        height={60} 
        className="w-80 h-14 opacity-95 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.35)] transition-all"
      />
      <div className="flex items-center gap-2 text-white/20 font-mono text-[9px] uppercase tracking-widest font-black">
        <Volume2 className="w-3 h-3 text-brand animate-pulse" />
        <span>Live Audio Golfvorm & Spectrum</span>
      </div>
    </div>
  );
};

const LIVE_POSITIVE_WORDS = [
  'leuk', 'geweldig', 'fijn', 'prachtig', 'fantastisch', 'goed', 'top', 'mooi', 
  'heerlijk', 'super', 'lief', 'blije', 'blij', 'verbazingwekkend', 'gezellig',
  'great', 'awesome', 'nice', 'enjoyed', 'excellent', 'love', 'happy', 'cool',
  'amazing', 'wonderful', 'perfect', 'good', 'friendly', 'vriendelijk', 'bedankt',
  'dank', 'dankje', 'dank u'
];

const renderHighlightedText = (text: string, positiveWords: string[] = []) => {
  if (!text) return "";
  const wordsToHighlight = positiveWords && positiveWords.length > 0 ? positiveWords : LIVE_POSITIVE_WORDS;

  const escapedWords = wordsToHighlight
    .map(word => word.trim())
    .filter(Boolean)
    .map(word => word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));

  if (escapedWords.length === 0) return text;

  escapedWords.sort((a, b) => b.length - a.length);

  try {
    const regex = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (index % 2 !== 0) {
        return (
          <mark 
            key={index} 
            className="bg-emerald-500/15 text-emerald-300 font-semibold px-1 rounded shadow-sm border border-emerald-500/25 inline-block mx-0.5 animate-pulse"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  } catch (e) {
    console.warn("Regex highlighting failed:", e);
    return text;
  }
};

export const VoiceFeedbackScreen: React.FC = () => {
  const { setStep, sessionId } = useStore();
  
  const [phase, setPhase] = useState<'ask' | 'recording' | 'ai_review' | 'thanks'>('ask');
  
  // FIX: Removed spokenHistory from React state for the hot path.
  // It is now ONLY stored in a ref to avoid stale closures in async speech handlers.
  // setSpokenHistoryDisplay is only used to trigger re-renders for the displayed text.
  const [spokenHistoryDisplay, setSpokenHistoryDisplay] = useState('');

  const [transcription, setTranscription] = useState('');
  const [rawTranscription, setRawTranscription] = useState('');
  const [interimOutput, setInterimOutput] = useState('');
  const [moderatedInterim, setModeratedInterim] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  
  const [languages] = useState([
    { code: 'nl-NL', label: 'Nederlands', flag: '🇳🇱' },
    { code: 'en-US', label: 'English', flag: '🇬🇧' },
    { code: 'de-DE', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr-FR', label: 'Français', flag: '🇫🇷' }
  ]);
  const [activeLangCode, setActiveLangCode] = useState('nl-NL');

  const [moderationAction, setModerationAction] = useState<'censor' | 'block' | 'warn'>('censor');
  const [customBlockedWords, setCustomBlockedWords] = useState<string[]>(['stom', 'slecht', 'waardeloos']);
  const [newWordInput, setNewWordInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [profanityMatches, setProfanityMatches] = useState<string[]>([]);

  const [aiPolishing, setAiPolishing] = useState(false);
  const [aiResult, setAiResult] = useState<ModerationResult | null>(null);

  const recognitionRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef<boolean>(false);

  // --- REFS for stale-closure-free access inside async speech handlers ---
  const phaseRef = useRef(phase);
  const isMutedRef = useRef(isMuted);
  const activeLangCodeRef = useRef(activeLangCode);
  // FIX: spokenHistory lives ONLY here; updated synchronously before any restart
  const spokenHistoryRef = useRef('');
  // FIX: micStream lives in a ref too so releaseMicStream always sees the latest stream
  const micStreamRef = useRef<MediaStream | null>(null);
  // FIX: moderation config refs so the onresult handler always has fresh values
  const customBlockedWordsRef = useRef(customBlockedWords);
  const moderationActionRef = useRef(moderationAction);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { activeLangCodeRef.current = activeLangCode; }, [activeLangCode]);
  useEffect(() => { customBlockedWordsRef.current = customBlockedWords; }, [customBlockedWords]);
  useEffect(() => { moderationActionRef.current = moderationAction; }, [moderationAction]);

  // Keep micStreamRef in sync with state for the visualizer (state) 
  // while also giving releaseMicStream a reliable ref
  useEffect(() => { micStreamRef.current = micStream; }, [micStream]);

  const runModerationFilter = useCallback((text: string, wordsList: string[], action: 'censor' | 'block' | 'warn') => {
    if (!text) return { censored: '', matches: [] };

    const completeBlacklist = [...DEFAULT_PROFANITY_LIST, ...wordsList];
    let censored = text;
    const matches: string[] = [];

    completeBlacklist.forEach(word => {
      if (!word || word.trim().length === 0) return;
      const escapedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');

      if (regex.test(censored)) {
        if (!matches.includes(word.toLowerCase())) {
          matches.push(word.toLowerCase());
        }
        if (action === 'censor') {
          censored = censored.replace(regex, (matched) => '*'.repeat(matched.length));
        }
      }
    });

    return { censored, matches };
  }, []);

  useEffect(() => {
    if (rawTranscription) {
      const { censored, matches } = runModerationFilter(rawTranscription, customBlockedWords, moderationAction);
      setTranscription(censored);
      setProfanityMatches(matches);
    } else {
      setTranscription('');
      setProfanityMatches([]);
    }

    if (interimOutput) {
      const { censored } = runModerationFilter(interimOutput, customBlockedWords, moderationAction);
      setModeratedInterim(censored);
    } else {
      setModeratedInterim('');
    }
  }, [rawTranscription, interimOutput, customBlockedWords, moderationAction, runModerationFilter]);

  const acquireMicStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setMicStream(stream);
      return stream;
    } catch (err: any) {
      console.warn('Microphone stream rejected:', err);
      setRecognitionError('Microfoon toegang is geweigerd. Wijzig dit in je browser instellingen.');
      return null;
    }
  };

  // FIX: Uses ref instead of stale state closure
  const releaseMicStream = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
      setMicStream(null);
    }
  };

  // FIX: startRecording is stable. All mutable values are read from refs, not closures.
  const startRecording = useCallback(async (existingStream?: MediaStream) => {
    setPhase('recording');
    setRecognitionError(null);
    setIsMuted(false);
    isManuallyStoppedRef.current = false;
    soundManager.play('SUCCESS', 0.4);

    // Reuse passed stream (e.g. on language change / unmute) or acquire a new one
    const stream = existingStream ?? await acquireMicStream();
    if (!stream) {
      setPhase('ask');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Browser SpeechRecognition not natively supported.');
      setTranscription('Speech recognition wordt niet optimaal ondersteund in deze browser, maar we slaan je feedback wel op!');
      return;
    }

    const startSpeechEngine = () => {
      if (phaseRef.current !== 'recording' || isMutedRef.current || isManuallyStoppedRef.current) {
        return;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {}
      }

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = activeLangCodeRef.current;

      rec.onresult = (event: any) => {
        // FIX: Only process results from the CURRENT session (since resultIndex),
        // then combine with committed history via the ref (never stale).
        let sessionFinal = '';
        let sessionInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            // FIX: Accumulate finals within this session run
            sessionFinal += (sessionFinal ? ' ' : '') + text;
          } else {
            sessionInterim += (sessionInterim ? ' ' : '') + text;
          }
        }

        // FIX: Also collect ALL finals from this session (not just new ones)
        // by scanning from 0 to build the full in-session final string
        let fullSessionFinal = '';
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const text = event.results[i][0].transcript;
            fullSessionFinal += (fullSessionFinal ? ' ' : '') + text;
          }
        }

        setInterimOutput(sessionInterim);

        // FIX: Combine committed history (ref, always fresh) + current session finals
        const currentFullRaw = [spokenHistoryRef.current, fullSessionFinal]
          .filter(Boolean)
          .join(' ');

        setRawTranscription(currentFullRaw);

        // Apply moderation inline using refs (always fresh values)
        const { censored, matches } = runModerationFilter(
          currentFullRaw,
          customBlockedWordsRef.current,
          moderationActionRef.current
        );
        setTranscription(censored);
        setProfanityMatches(matches);

        if (sessionInterim) {
          const { censored: censoredInterim } = runModerationFilter(
            sessionInterim,
            customBlockedWordsRef.current,
            moderationActionRef.current
          );
          setModeratedInterim(censoredInterim);
        } else {
          setModeratedInterim('');
        }
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error event:', event.error);
        
        if (event.error === 'not-allowed') {
          setRecognitionError('Microfoon toegang geweigerd');
          setPhase('ask');
          releaseMicStream();
        } else if (event.error === 'network') {
          setRecognitionError('Netwerkfout: Controleer internet verbinding');
        } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
          setRecognitionError(`Speech recognition error: ${event.error}`);
        }
      };

      rec.onend = () => {
        // FIX: Commit finals synchronously into the ref BEFORE scheduling restart.
        // This eliminates the race condition where the new engine reads a stale ref.
        const currentFullRaw = rawTranscriptionRef.current;
        if (currentFullRaw) {
          spokenHistoryRef.current = currentFullRaw;
          setSpokenHistoryDisplay(currentFullRaw); // triggers re-render if needed
        }

        setInterimOutput('');
        setModeratedInterim('');

        if (phaseRef.current === 'recording' && !isMutedRef.current && !isManuallyStoppedRef.current) {
          // FIX: No setTimeout needed; ref is already updated synchronously above
          startSpeechEngine();
        }
      };

      recognitionRef.current = rec;
      try {
        rec.start();
      } catch (err) {
        console.error('Failed to start SpeechRecognition engine:', err);
      }
    };

    startSpeechEngine();
  }, [runModerationFilter]);

  // FIX: Keep a ref of rawTranscription so onend can read its latest value synchronously
  const rawTranscriptionRef = useRef('');
  useEffect(() => {
    rawTranscriptionRef.current = rawTranscription;
  }, [rawTranscription]);

  const startFreshRecording = () => {
    // FIX: Reset the ref synchronously before starting
    spokenHistoryRef.current = '';
    setSpokenHistoryDisplay('');
    setRawTranscription('');
    rawTranscriptionRef.current = '';
    setTranscription('');
    setInterimOutput('');
    setModeratedInterim('');
    setProfanityMatches([]);
    setTimeLeft(30);
    startRecording();
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      isMutedRef.current = false;
      soundManager.play('SUCCESS', 0.2);
      isManuallyStoppedRef.current = false;
      // FIX: Reuse the existing stream — no new getUserMedia needed
      startRecording(micStreamRef.current ?? undefined);
    } else {
      setIsMuted(true);
      isMutedRef.current = true;
      isManuallyStoppedRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setInterimOutput('');
      setModeratedInterim('');
    }
  };

  const triggerSubmit = async () => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
    }
    releaseMicStream();

    if (!rawTranscription.trim()) {
      setStep('social');
      return;
    }

    setPhase('ai_review');
    setAiPolishing(true);
    soundManager.play('SUCCESS', 0.5);

    try {
      const moderationAnalysis = await moderateAndRefineSpeech(rawTranscription, customBlockedWords);
      setAiResult(moderationAnalysis);
    } catch (err) {
      console.error('Gemini Moderation API error:', err);
      setAiResult({
        refinedText: transcription || rawTranscription,
        toxic: profanityMatches.length > 0,
        blockedWordsDetected: profanityMatches,
        language: 'Nederlands',
        positiveSentimentWords: []
      });
    } finally {
      setAiPolishing(false);
    }
  };

  const finishReviewAndContinue = async () => {
    const finalFeedbackText = aiResult?.refinedText || transcription || rawTranscription;

    setPhase('thanks');
    soundManager.play('SUCCESS', 0.6);

    try {
      useStore.getState().setVoiceFeedback(finalFeedbackText, rawTranscription);
    } catch (e) {
      console.warn('Set voice feedback failed:', e);
    }

    try {
      saveSessionData({
        sessionId,
        voice_feedback: finalFeedbackText,
        voice_feedback_original: rawTranscription,
        voice_feedback_language: aiResult?.language || activeLangCode,
        voice_feedback_moderation_toxic: aiResult?.toxic || profanityMatches.length > 0,
        voice_feedback_timestamp: Date.now(),
        timestamp: Date.now(),
      });
      
      await triggerAutomaticGoogleSheetsSync();
    } catch (error: any) {
      console.warn('Lokale sessieopslag of Sheets-sync mislukt:', error);
    }
  };

  const addBlockedWord = () => {
    const word = newWordInput.trim().toLowerCase();
    if (word && !customBlockedWords.includes(word)) {
      setCustomBlockedWords(prev => [...prev, word]);
      setNewWordInput('');
      soundManager.play('SUCCESS', 0.1);
    }
  };

  const removeBlockedWord = (wordToRemove: string) => {
    setCustomBlockedWords(prev => prev.filter(w => w !== wordToRemove));
  };

  useEffect(() => {
    return () => {
      isManuallyStoppedRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (e) {}
      }
      releaseMicStream();
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phase === 'recording' && !isMuted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            triggerSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phase, isMuted, timeLeft]);

  useEffect(() => {
    if (phase === 'thanks') {
      const timeout = setTimeout(() => {
        setStep('social');
      }, 3500);
      return () => clearTimeout(timeout);
    }
  }, [phase, setStep]);

  const handleLanguageChange = (code: string) => {
    setActiveLangCode(code);
    activeLangCodeRef.current = code;
    soundManager.play('SUCCESS', 0.2);
    if (phase === 'recording') {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {}
      }
      // FIX: Pass existing stream to avoid re-requesting mic permission
      startRecording(micStreamRef.current ?? undefined);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 overflow-y-auto relative bg-[#030303] text-white">
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-brand/10 blur-[130px] rounded-full opacity-30 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-red-800/5 blur-[130px] rounded-full opacity-20" />
      
      <AnimatePresence mode="wait">
        {phase === 'ask' && (
          <motion.div
            key="ask"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="text-center relative z-10 max-w-3xl px-6 py-12"
          >
            <div className="w-20 h-20 bg-brand/10 rounded-full border border-brand/20 flex items-center justify-center mx-auto mb-10 shadow-[0_0_30px_rgba(255,80,80,0.15)] animate-pulse">
              <Mic className="text-brand w-9 h-9" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-display font-bold uppercase mb-8 tracking-tighter leading-none">
              Wil je nog <br /><span className="text-brand">extra feedback</span> geven?
            </h1>
            <p className="text-xl text-white/40 mb-12 max-w-xl mx-auto font-light leading-relaxed">
              Deel je mening via je stem. Praat voor 30 seconden in de microfoon. Dit helpt ons de ervaring van vanBeresteyn te verrijken!
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-xl mx-auto">
              <InteractiveButton 
                onClick={startFreshRecording}
                className="px-10 py-5 glass-red rounded-full group overflow-hidden relative min-w-[240px] shadow-[0_0_20px_rgba(255,80,80,0.1)]"
              >
                <div className="relative z-20 flex items-center justify-center gap-3">
                  <Mic className="w-5 h-5 group-hover:scale-110 transition-transform text-white" />
                  <span className="text-brand group-hover:text-white transition-colors font-display font-bold uppercase tracking-widest text-l">
                    {recognitionError ? 'Opnieuw proberen' : 'Feedback geven'}
                  </span>
                </div>
              </InteractiveButton>
              
              <InteractiveButton 
                onClick={() => setStep('social')}
                className="px-10 py-5 glass rounded-full hover:bg-white/10 transition-all font-display font-bold uppercase tracking-widest text-white/50 text-sm min-w-[240px]"
              >
                Nee, sla over
              </InteractiveButton>
            </div>

            {recognitionError && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-10 p-4 border border-red-500/20 bg-red-500/5 backdrop-blur-md rounded-2xl max-w-md mx-auto"
              >
                <div className="flex items-center gap-3 text-red-400 justify-center">
                  <AlertTriangle className="w-5 h-5 min-w-[20px]" />
                  <span className="font-mono text-xs uppercase tracking-wider">{recognitionError}</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === 'recording' && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-5xl px-6 py-8 relative z-10 flex flex-col items-center"
          >
            <div className="w-full flex flex-col md:flex-row justify-between items-center gap-6 mb-12 border-b border-white/5 pb-8">
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-brand/10 border border-brand/20 rounded-full flex items-center gap-2.5">
                  <span className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    isMuted ? "bg-amber-500 animate-pulse" : "bg-red-500 animate-ping"
                  )} />
                  <span className="font-mono text-[10px] tracking-widest uppercase font-bold text-white/80">
                    {isMuted ? 'Microfoon Gedempt' : 'Live Transcriptie Actief'}
                  </span>
                </div>
                
                {profanityMatches.length > 0 && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="px-4 py-2 bg-amber-500/10 border border-amber-500/25 rounded-full flex items-center gap-2"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-mono text-[9px] uppercase tracking-widest text-amber-400 font-bold">
                      {profanityMatches.length} Filter Treffer{profanityMatches.length > 1 ? 's' : ''}
                    </span>
                  </motion.div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-white/30" />
                <div className="flex bg-white/[0.03] border border-white/5 p-1 rounded-full">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase transition-all tracking-wide flex items-center gap-1.5",
                        activeLangCode === lang.code 
                          ? "bg-white/15 text-white shadow-md border border-white/10" 
                          : "text-white/40 hover:text-white hover:bg-white/[0.02]"
                      )}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.code.split('-')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-8 relative flex flex-col items-center">
              <div className="relative inline-block mb-3">
                {!isMuted && (
                  <>
                    <div
                      id="mic-pulse-ring-1"
                      className="absolute inset-0 rounded-full bg-brand/20 blur-md pointer-events-none transition-transform duration-75 ease-out"
                    />
                    <div
                      id="mic-pulse-ring-2"
                      className="absolute inset-0 rounded-full bg-brand/10 blur-xl pointer-events-none transition-all duration-75 ease-out"
                    />
                  </>
                )}
                <div 
                  id="mic-pulse-button"
                  className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all duration-75 ease-out relative z-10 shadow-xl",
                    isMuted ? "bg-white/5 border border-white/10" : "bg-brand"
                  )}
                >
                  {isMuted ? <MicOff className="text-white/30 w-10 h-10" /> : <Mic className="text-white w-10 h-10" />}
                </div>

                <div className="absolute -top-3 -right-3 text-brand font-mono font-bold text-lg bg-black/90 border border-brand/20 px-3.5 py-1.5 rounded-2xl shadow-2xl z-20 min-w-[50px] text-center">
                  {timeLeft}s
                </div>
              </div>

              <AudioVisualizer stream={micStream} isMuted={isMuted} />
            </div>

            <div className={cn(
              "glass w-full min-h-[220px] p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden group shadow-3xl bg-white/[0.01] border transition-all duration-500 flex flex-col justify-between",
              profanityMatches.length > 0 && moderationAction === 'warn' ? "border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.05)]" : "border-brand/15"
            )}>
              <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={isMuted ? { width: `${(timeLeft / 30) * 100}%` } : { width: "0%" }}
                  transition={isMuted ? { type: "tween" } : { duration: timeLeft, ease: "linear" }}
                  className={cn(
                    "h-full transition-all duration-300 shadow-[0_0_10px_rgba(255,80,80,0.4)]",
                    profanityMatches.length > 0 ? "bg-amber-500" : "bg-brand"
                  )}
                />
              </div>

              <div className="max-h-[260px] overflow-y-auto custom-scrollbar flex items-center justify-center py-6">
                <p className="text-2xl md:text-3xl text-white font-light text-center leading-relaxed">
                  {transcription
                    ? renderHighlightedText(transcription)
                    : <span className="opacity-20 italic font-mono text-lg uppercase tracking-widest">Spreek je gedachten in...</span>
                  }
                  {moderatedInterim && (
                    <span className="opacity-40 italic"> {renderHighlightedText(moderatedInterim)}</span>
                  )}
                </p>
              </div>

              {profanityMatches.length > 0 && (
                <div className="border-t border-white/5 mt-6 pt-4 flex flex-wrap gap-2.5 items-center justify-center">
                  <span className="text-[10px] text-white/30 font-mono uppercase tracking-widest">Gefilterd:</span>
                  {profanityMatches.map((matched, ix) => (
                    <span 
                      key={ix} 
                      className="px-2.5 py-1 text-[10px] font-mono uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md shadow-md animate-bounce"
                      style={{ animationDelay: `${ix * 100}ms` }}
                    >
                      {matched}
                    </span>
                  ))}
                  <div className="w-full text-center text-amber-500/50 text-[10px] font-mono uppercase tracking-wider mt-2">
                    {moderationAction === 'censor' && 'Wachtwoorden zijn automatisch gecensureerd met *'}
                    {moderationAction === 'block' && '⚠️ Submission geweigerd totdat gefilterde taal is opgeschoond'}
                    {moderationAction === 'warn' && '⚠️ Let op: Mogelijk aanstootgevende taal gedetecteerd'}
                  </div>
                </div>
              )}
            </div>

            <div className="w-full flex flex-col md:flex-row justify-between items-center gap-6 mt-10">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "p-3.5 border rounded-full transition-all duration-500 flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-widest font-bold cursor-pointer",
                  showFilters 
                    ? "bg-brand/10 border-brand/35 text-white shadow-lg shadow-brand/5" 
                    : "text-white/40 border-white/5 bg-white/[0.01] hover:text-white hover:bg-white/[0.03]"
                )}
              >
                <Sliders className="w-4 h-4 text-brand" />
                <span>Filters & Moderatie Instellen</span>
              </button>

              <div className="flex gap-4">
                <InteractiveButton 
                  onClick={toggleMute}
                  className={cn(
                    "px-8 py-4 glass rounded-full font-display font-medium uppercase tracking-widest text-xs flex items-center gap-3 border-white/5 transition-all duration-300",
                    isMuted ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500" : "bg-white/5 hover:bg-white/10 text-white/70"
                  )}
                >
                  {isMuted ? (
                    <>
                      <Play className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                      <span>Hervat</span>
                    </>
                  ) : (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>Demp</span>
                    </>
                  )}
                </InteractiveButton>

                <InteractiveButton 
                  onClick={triggerSubmit}
                  disabled={profanityMatches.length > 0 && moderationAction === 'block'}
                  className={cn(
                    "px-10 py-4 font-display font-bold uppercase tracking-widest text-xs flex items-center gap-3 rounded-full shadow-lg transition-all duration-500",
                    profanityMatches.length > 0 && moderationAction === 'block'
                      ? "opacity-30 cursor-not-allowed bg-white/5 border border-white/10 text-white/30"
                      : "glass-red text-brand shadow-brand/10"
                  )}
                >
                  <CheckCircle2 className="w-4 h-4" /> 
                  <span>Feedback Afronden</span>
                </InteractiveButton>
              </div>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="w-full glass bg-white/[0.01] border border-white/5 rounded-[2rem] p-6 overflow-hidden md:p-8 relative"
                >
                  <div className="absolute top-4 right-4">
                    <button 
                      onClick={() => setShowFilters(false)}
                      className="p-1.5 hover:bg-white/5 rounded-full text-white/40 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-sm font-mono uppercase tracking-widest text-white/50 mb-6 flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-brand" />
                    <span>Real-time Moderatie Dashboard</span>
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-xs uppercase tracking-widest text-white/30 font-bold mb-4 flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-brand" />
                        <span>Kies Moderatie Methode</span>
                      </h4>
                      <p className="text-xs text-white/40 mb-4 leading-relaxed font-light">
                        Selecteer hoe het systeem moet reageren als er verplichte of handmatige filters worden geraakt tijdens de opname.
                      </p>

                      <div className="flex flex-col gap-3">
                        {(['censor', 'block', 'warn'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => {
                              setModerationAction(mode);
                              soundManager.play('SUCCESS', 0.1);
                            }}
                            className={cn(
                              "p-4 border rounded-xl flex items-center justify-between text-left transition-all duration-300 cursor-pointer",
                              moderationAction === mode 
                                ? "bg-brand/10 border-brand/30 text-white shadow-md shadow-brand/5" 
                                : "hover:bg-white/[0.02] border-white/5 text-white/55"
                            )}
                          >
                            <div>
                              <p className="text-xs font-mono uppercase tracking-wider font-bold text-white">
                                {mode === 'censor' && 'Automatic Censor'}
                                {mode === 'block' && 'Block Submission'}
                                {mode === 'warn' && 'Display Warnings'}
                              </p>
                              <p className="text-[10px] text-white/40 mt-1">
                                {mode === 'censor' && 'Woord(en) worden direct vervangen door sterretjes (*).'}
                                {mode === 'block' && 'Blokkeert het afronden totdat er geen vieze woorden meer zijn.'}
                                {mode === 'warn' && 'Toont een subtiel waarschuwingsbericht op het scherm.'}
                              </p>
                            </div>
                            <div className={cn(
                              "w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-colors",
                              moderationAction === mode ? "border-brand bg-brand" : "border-white/20"
                            )}>
                              {moderationAction === mode && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs uppercase tracking-widest text-white/30 font-bold mb-4 flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5 text-brand" />
                        <span>Handmatig Geblokkeerde Woorden</span>
                      </h4>
                      <p className="text-xs text-white/40 mb-4 leading-relaxed font-light">
                        Voeg eigen, op maat gemaakte woorden of zinnen toe die direct moeten worden gematigd.
                      </p>

                      <div className="flex gap-2.5 mb-4">
                        <input
                          type="text"
                          value={newWordInput}
                          onChange={(e) => setNewWordInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addBlockedWord()}
                          placeholder="Bijv. slecht, waardeloos..."
                          className="flex-1 bg-white/[0.02] border border-white/5 text-white px-4 py-3 rounded-xl text-xs placeholder-white/25 focus:outline-none focus:border-brand/40 transition-colors font-mono"
                        />
                        <button
                          onClick={addBlockedWord}
                          className="bg-brand/10 border border-brand/20 text-brand px-4 rounded-xl flex items-center justify-center hover:bg-brand hover:text-white transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                        {customBlockedWords.length === 0 ? (
                          <span className="text-[10px] italic text-white/20 font-mono">Geen handmatige geblokkeerde woorden.</span>
                        ) : (
                          customBlockedWords.map((word) => (
                            <span 
                              key={word} 
                              className="px-2.5 py-1.5 text-[10px] font-mono uppercase bg-white/5 border border-white/5 rounded-lg flex items-center gap-1.5 hover:border-red-500/30 hover:text-red-400 cursor-pointer transition-all"
                              onClick={() => removeBlockedWord(word)}
                            >
                              <span>{word}</span>
                              <X className="w-3 h-3 opacity-60 hover:opacity-100 text-red-500 pointer-events-none" />
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {phase === 'ai_review' && (
          <motion.div
            key="ai_review"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl px-8 py-10 relative z-10"
          >
            {aiPolishing ? (
              <div className="text-center py-20 flex flex-col items-center">
                <div className="relative mb-10">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    className="w-24 h-24 border-2 border-brand/10 border-t-brand rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,80,80,0.1)]"
                  />
                  <BrainCircuit className="w-10 h-10 text-brand absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                
                <h2 className="text-xl md:text-3xl font-display font-black uppercase tracking-widest text-white mb-4 animate-pulse">
                  AI Verwerking & Moderatie
                </h2>
                <p className="text-sm font-mono uppercase text-white/35 tracking-widest">
                  Gemini polijst grammatica en test content veiligheid...
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-8 shadow-3xl bg-white/[0.01] rounded-[3rem] p-8 md:p-12 border border-brand/20 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden">
                  <motion.div 
                    animate={{ left: ['-100%', '100%'] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    className="absolute top-0 w-1/3 h-full bg-brand/40 shadow-[0_0_15px_#ff4d4d]"
                  />
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-6 gap-4">
                  <div>
                    <h2 className="text-3xl font-display font-medium uppercase tracking-tight text-white flex items-center gap-3">
                      <BrainCircuit className="w-8 h-8 text-brand" />
                      <span>AI Evaluatie Rapport</span>
                    </h2>
                    <p className="text-xs text-white/35 font-mono uppercase tracking-widest mt-1.5">
                      Gedetecteerde Taal: <span className="text-white font-bold">{aiResult?.language || 'NL'}</span>
                    </p>
                  </div>

                  {aiResult?.toxic ? (
                    <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center gap-2.5 shadow-md font-mono text-[10px] uppercase font-bold tracking-widest">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>⚠️ Gecensureerde Inhoud Gedetecteerd</span>
                    </div>
                  ) : (
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-2.5 shadow-md font-mono text-[10px] uppercase font-bold tracking-widest">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>✅ Veilig & Gecorrigeerd</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest font-bold">
                      Originele Opname
                    </span>
                    <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl min-h-[140px] text-white/50 text-sm leading-relaxed font-light italic">
                      "{renderHighlightedText(transcription || rawTranscription, aiResult?.positiveSentimentWords)}"
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <span className="text-[10px] font-mono text-brand uppercase tracking-widest font-black">
                      Gepolijste Feedback (Gemini AI)
                    </span>
                    <div className="bg-brand/5 border border-brand/20 p-6 rounded-2xl min-h-[140px] text-white text-sm leading-relaxed font-bold">
                      "{renderHighlightedText(aiResult?.refinedText || "", aiResult?.positiveSentimentWords)}"
                    </div>
                  </div>
                </div>

                {aiResult?.blockedWordsDetected && aiResult.blockedWordsDetected.length > 0 && (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl mt-2 flex items-start gap-3">
                    <AlertTriangle className="text-amber-500 w-5 h-5 min-w-[20px] mt-0.5" />
                    <div>
                      <p className="text-xs font-mono uppercase text-amber-400 font-bold tracking-wider">
                        Geblokkeerde Woorden Gevonden bij AI Audit
                      </p>
                      <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
                        De AI heeft de volgende risicovolle termen gemarkeerd: <span className="text-amber-300 font-mono font-bold uppercase">{aiResult.blockedWordsDetected.join(', ')}</span>. Deze zijn gewijzigd of gefilterd om acceptabel te blijven voor ons archief.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-end">
                  <InteractiveButton
                    onClick={() => {
                      spokenHistoryRef.current = '';
                      setSpokenHistoryDisplay('');
                      setRawTranscription('');
                      rawTranscriptionRef.current = '';
                      setTranscription('');
                      setTimeLeft(30);
                      startRecording();
                    }}
                    className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white/60 border border-white/5 rounded-full font-display font-medium text-xs uppercase tracking-widest flex items-center justify-center"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin-slow text-white/40" />
                    Opnieuw Inspreken
                  </InteractiveButton>

                  <InteractiveButton
                    onClick={finishReviewAndContinue}
                    className="px-10 py-4 glass-red font-display font-black text-xs uppercase tracking-widest rounded-full"
                  >
                    Bevestigen & Doorgaan
                  </InteractiveButton>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === 'thanks' && (
          <motion.div
            key="thanks"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center relative z-10 max-w-xl px-2"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(16,185,129,0.25)]"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-display font-bold uppercase mb-6 tracking-tight leading-none">
              Bedankt voor <br /><span className="text-emerald-500">jouw input!</span>
            </h1>
            <p className="text-xl text-white/45 font-light max-w-md mx-auto leading-relaxed">
              We hebben je gefilterde en door AI verfijnde spraakfeedback succesvol gearchiveerd in ons datanetwerk.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
