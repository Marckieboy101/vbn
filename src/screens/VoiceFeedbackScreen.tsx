import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import {
  Mic, MicOff, CheckCircle2, BrainCircuit, Globe,
  Settings, Sliders, Shield, AlertTriangle, RefreshCw,
  X, Plus, Play, Volume2, Keyboard, MessageSquare,
} from 'lucide-react';
import { InteractiveButton } from '../components/InteractiveButton';
import { soundManager } from '../lib/sound';
import { cn } from '../lib/utils';
import { saveSessionData } from '../lib/sessionStorage';
import { moderateAndRefineSpeech, ModerationResult } from '../services/geminiService';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_PROFANITY_LIST = [
  'kut','klootzak','godverdomme','godver','tyfus','tering','teringlijer','kanker',
  'lul','hoer','flikker','pleuris','homo','slet','mongool','pannenkoek','eikel',
  'rotzak','klerelijer','fuck','shit','bitch','asshole','bastard','cunt','dick',
  'pussy','whore','motherfucker','crap','wanker','bollocks','faggot',
];

const POSITIVE_WORDS = [
  'leuk','geweldig','fijn','prachtig','fantastisch','goed','top','mooi','heerlijk',
  'super','lief','blij','blije','verbazingwekkend','gezellig','great','awesome',
  'nice','enjoyed','excellent','love','happy','cool','amazing','wonderful','perfect',
  'friendly','vriendelijk','bedankt','dank','dankje','dank u',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function censorText(
  text: string,
  wordsList: string[],
  action: 'censor' | 'block' | 'warn',
): { out: string; matches: string[] } {
  if (!text) return { out: '', matches: [] };
  const list = [...DEFAULT_PROFANITY_LIST, ...wordsList];
  let out = text;
  const matches: string[] = [];
  for (const word of list) {
    if (!word.trim()) continue;
    const escaped = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'gi');
    if (re.test(out)) {
      if (!matches.includes(word.toLowerCase())) matches.push(word.toLowerCase());
      if (action === 'censor') out = out.replace(re, m => '*'.repeat(m.length));
    }
  }
  return { out, matches };
}

function HighlightedText({ text, words = POSITIVE_WORDS }: { text: string; words?: string[] }) {
  if (!text) return null;
  const escaped = words
    .map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
    .sort((a, b) => b.length - a.length);
  if (!escaped.length) return <>{text}</>;
  try {
    const re = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
    const parts = text.split(re);
    return (
      <>
        {parts.map((p, i) =>
          i % 2 !== 0
            ? <mark key={i} className="bg-emerald-500/15 text-emerald-300 font-semibold px-1 rounded border border-emerald-500/25 inline-block mx-0.5">{p}</mark>
            : p,
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}

// ─── Audio visualiser ─────────────────────────────────────────────────────────

const AudioVisualizer: React.FC<{ stream: MediaStream | null; active: boolean }> = ({ stream, active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef    = useRef<AudioContext | null>(null);
  const rafRef    = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;

    const resetDOM = () => {
      ['mic-pulse-ring-1','mic-pulse-ring-2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.transform = 'scale(1)'; el.style.opacity = ''; }
      });
      const btn = document.getElementById('mic-pulse-button');
      if (btn) { btn.style.transform = 'scale(1)'; btn.style.boxShadow = ''; }
    };

    if (!stream || !active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      resetDOM();
      return;
    }

    (async () => {
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        const ac = new AC();
        if (ac.state === 'suspended') await ac.resume();
        ctxRef.current = ac;
        const analyser = ac.createAnalyser();
        analyser.fftSize = 64;
        ac.createMediaStreamSource(stream).connect(analyser);
        if (!alive) { ac.close(); return; }

        const buf = new Uint8Array(analyser.frequencyBinCount);
        let phase = 0;

        const draw = () => {
          if (!alive || !canvasRef.current || !active) return;
          rafRef.current = requestAnimationFrame(draw);
          analyser.getByteFrequencyData(buf);

          const active_buckets = buf.filter(v => v > 10);
          const avg = buf.reduce((s, v) => s + v, 0) / (active_buckets.length || buf.length);
          const vol = Math.min(avg / 140, 1);

          const r1  = document.getElementById('mic-pulse-ring-1');
          const r2  = document.getElementById('mic-pulse-ring-2');
          const btn = document.getElementById('mic-pulse-button');
          if (r1)  { r1.style.transform  = `scale(${1 + vol * 0.75})`; r1.style.opacity = `${0.3 + vol * 0.6}`; }
          if (r2)  { r2.style.transform  = `scale(${1 + vol * 1.5})`;  r2.style.opacity = `${0.1 + vol * 0.4}`; }
          if (btn) { btn.style.transform = `scale(${1 + vol * 0.12})`; btn.style.boxShadow = `0 0 ${20 + vol * 60}px rgba(244,63,94,${0.15 + vol * 0.75})`; }

          const cv = canvasRef.current!;
          const cx = cv.getContext('2d')!;
          cx.clearRect(0, 0, cv.width, cv.height);
          const bw = (cv.width / buf.length) * 1.4;
          for (let i = 0, x = 0; i < buf.length; i++, x += bw) {
            const bh = Math.max(2, (buf[i] / 255) * cv.height * 0.5);
            const y  = cv.height / 2 - bh / 2;
            const g  = cx.createLinearGradient(0, y, 0, y + bh);
            g.addColorStop(0,   'rgba(244,63,94,0.04)');
            g.addColorStop(0.5, `rgba(244,63,94,${0.12 + vol * 0.28})`);
            g.addColorStop(1,   'rgba(244,63,94,0.04)');
            cx.fillStyle = g;
            cx.fillRect(x, y, bw - 2, bh);
          }
          phase += 0.06 + vol * 0.08;
          const wave = (freq: number, amp: number, off: number, color: string, lw: number) => {
            cx.beginPath(); cx.moveTo(0, cv.height / 2);
            for (let x = 0; x <= cv.width; x += 2) {
              cx.lineTo(x, cv.height / 2 + Math.sin(x * freq + off) * (14 + vol * 28) * amp * Math.sin((x / cv.width) * Math.PI));
            }
            cx.strokeStyle = color; cx.lineWidth = lw; cx.stroke();
          };
          wave(0.018, 0.9,  phase,              'rgba(244,63,94,0.95)', 2.5);
          wave(0.012, 0.6,  phase * 1.35 + 0.8, 'rgba(249,115,22,0.45)', 1.5);
          wave(0.026, 0.45, phase * 0.7 - 1.0,  'rgba(236,72,153,0.35)', 1.0);
        };
        draw();
      } catch { /* AudioContext init failed — visualiser disabled */ }
    })();

    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (ctxRef.current && ctxRef.current.state !== 'closed') ctxRef.current.close().catch(() => {});
    };
  }, [stream, active]);

  return (
    <div className="flex flex-col items-center gap-1.5 py-4">
      <canvas ref={canvasRef} width={320} height={60} className="w-80 h-14 opacity-95 drop-shadow-[0_0_12px_rgba(244,63,94,0.35)]" />
      <div className="flex items-center gap-2 text-white/20 font-mono text-[9px] uppercase tracking-widest font-black">
        <Volume2 className="w-3 h-3 text-brand animate-pulse" />
        <span>Live Audio Golfvorm & Spectrum</span>
      </div>
    </div>
  );
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase     = 'ask' | 'recording' | 'ai_review' | 'thanks';
type MicStatus = 'idle' | 'requesting' | 'listening' | 'paused' | 'error';
type InputMode = 'mic' | 'keyboard';

const MIC_RECORDING_SECONDS = 15;

// ─── Screen ───────────────────────────────────────────────────────────────────

export const VoiceFeedbackScreen: React.FC = () => {
  const { setStep, sessionId } = useStore();

  const [phase,     setPhase]     = useState<Phase>('ask');
  const [micStatus, setMicStatus] = useState<MicStatus>('idle');
  const [micError,  setMicError]  = useState<string | null>(null);

  // Which input method is active
  const [inputMode, setInputMode] = useState<InputMode>('mic');

  // Mic transcript
  const [committedText, setCommittedText] = useState('');   // censored finals
  const [interimText,   setInterimText]   = useState('');   // live hypothesis
  const [rawCommitted,  setRawCommitted]  = useState('');   // unfiltered finals

  // Live "I can hear you" feedback — separate from the transcript itself, so the
  // user sees an immediate reaction the moment they speak, even before (or if never)
  // the speech engine manages to resolve that audio into actual text.
  const [speechDetected, setSpeechDetected] = useState(false);
  const [recognitionStruggling, setRecognitionStruggling] = useState(false);

  // Keyboard transcript
  const [keyboardText, setKeyboardText] = useState('');

  // Moderation
  const [moderationAction, setModerationAction] = useState<'censor'|'block'|'warn'>('censor');
  const [customBlockedWords, setCustomBlockedWords] = useState(['stom','slecht','waardeloos']);
  const [newWordInput,   setNewWordInput]   = useState('');
  const [profanityMatches, setProfanityMatches] = useState<string[]>([]);
  const [showFilters,  setShowFilters] = useState(false);

  // Timer (only used in mic mode)
  const [timeLeft, setTimeLeft] = useState(MIC_RECORDING_SECONDS);

  // AI review
  const [aiPolishing, setAiPolishing] = useState(false);
  const [aiResult,    setAiResult]    = useState<ModerationResult | null>(null);

  const [activeLang, setActiveLang] = useState('nl-NL');
  const [isMuted,    setIsMuted]    = useState(false);
  const [micStream,  setMicStream]  = useState<MediaStream | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const LANGS = [
    { code: 'nl-NL', flag: '🇳🇱' },
    { code: 'en-US', flag: '🇬🇧' },
    { code: 'de-DE', flag: '🇩🇪' },
    { code: 'fr-FR', flag: '🇫🇷' },
  ];

  // Stable refs — speech event handlers read these, never state
  const phaseRef       = useRef(phase);
  const isMutedRef     = useRef(isMuted);
  const activeLangRef  = useRef(activeLang);
  const recognitionRef = useRef<any>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const restartRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef     = useRef(false);
  const netErrRef      = useRef(0);
  const notAllowedRetryRef = useRef(0);
  const committedRawRef = useRef('');
  const committedCensoredRef = useRef('');
  const interimRawRef = useRef('');
  const hadFatalErrorRef = useRef(false);
  const rawLenAtSpeechStartRef = useRef(0);
  const unresolvedSpeechSegmentsRef = useRef(0);

  useEffect(() => { phaseRef.current    = phase;     }, [phase]);
  useEffect(() => { isMutedRef.current  = isMuted;   }, [isMuted]);
  useEffect(() => { activeLangRef.current = activeLang; }, [activeLang]);

  // Browser / origin support check
  const support = useMemo(() => {
    const api   = !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
    const media = !!(navigator.mediaDevices?.getUserMedia);
    const https = window.isSecureContext;
    return { api, media, https, ok: api && media && https };
  }, []);

  // ── Mic stream ────────────────────────────────────────────────────────────

  const releaseMic = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setMicStream(null);
    }
  }, []);

  const acquireMic = useCallback(async (): Promise<MediaStream | null> => {
    if (!support.https) { setMicError('Vereist HTTPS of localhost.'); return null; }
    if (!support.api)   { setMicError('Gebruik Google Chrome of Edge voor spraakherkenning.'); return null; }
    if (!support.media) { setMicError('Microfoon-API niet beschikbaar. Gebruik HTTPS.'); return null; }
    setMicStatus('requesting');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = s;
      setMicStream(s);
      return s;
    } catch (err: any) {
      const n = err?.name ?? '';
      if (n === 'NotAllowedError' || n === 'PermissionDeniedError')
        setMicError('Microfoon geweigerd — klik het slotje in de adresbalk en sta toegang toe.');
      else if (n === 'NotFoundError')
        setMicError('Geen microfoon gevonden. Sluit een microfoon aan.');
      else if (n === 'NotReadableError')
        setMicError('Microfoon in gebruik door een andere app.');
      else
        setMicError('Microfoon kon niet worden geactiveerd. Vernieuw de pagina.');
      setMicStatus('error');
      return null;
    }
  }, [support]);

  // ── Speech engine ──────────────────────────────────────────────────────────

  const stopEngine = useCallback((manual = false) => {
    if (manual) stoppedRef.current = true;
    if (restartRef.current !== null) { clearTimeout(restartRef.current); restartRef.current = null; }
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.abort(); } catch { }
      recognitionRef.current = null;
    }
  }, []);

  // startEngine is defined with useCallback so it's stable, but the recursive
  // onend→restart path calls it via a closure captured at engine-creation time.
  const startEngine = useCallback((
    blockedWords: string[],
    modAction: 'censor'|'block'|'warn',
  ) => {
    if (phaseRef.current !== 'recording' || isMutedRef.current || stoppedRef.current) return;

    if (restartRef.current !== null) { clearTimeout(restartRef.current); restartRef.current = null; }
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.abort(); } catch { }
    }

    const API = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!API) return;

    const rec = new API();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = activeLangRef.current;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      netErrRef.current = 0;
      notAllowedRetryRef.current = 0;
      setMicStatus('listening');
    };

    // These fire the instant the engine detects actual voice in the audio stream —
    // well before (and sometimes instead of) a usable transcript comes back. Surfacing
    // them gives the user immediate proof their voice is being picked up, so the UI
    // never looks dead while they're talking.
    rec.onspeechstart = () => {
      setSpeechDetected(true);
      rawLenAtSpeechStartRef.current = committedRawRef.current.length;
    };
    rec.onspeechend = () => {
      setSpeechDetected(false);
      if (committedRawRef.current.length === rawLenAtSpeechStartRef.current) {
        unresolvedSpeechSegmentsRef.current += 1;
        if (unresolvedSpeechSegmentsRef.current >= 2) setRecognitionStruggling(true);
      }
    };

    const textBeforeRecognition = committedRawRef.current;

    rec.onresult = (event: any) => {
      let sessionFinals = '';
      let currentInterim = '';

      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          sessionFinals += (sessionFinals ? ' ' : '') + t.trim();
        } else {
          currentInterim += (currentInterim ? ' ' : '') + t.trim();
        }
      }

      if (sessionFinals) {
        const fullRaw = [textBeforeRecognition, sessionFinals].filter(Boolean).join(' ');
        const { out: censored, matches } = censorText(fullRaw, blockedWords, modAction);
        committedRawRef.current      = fullRaw;
        committedCensoredRef.current = censored;
        setRawCommitted(fullRaw);
        setCommittedText(censored);
        setProfanityMatches(matches);
        unresolvedSpeechSegmentsRef.current = 0;
        setRecognitionStruggling(false);
      }

      interimRawRef.current = currentInterim;
      const { out: censoredInterim } = censorText(currentInterim, blockedWords, modAction);
      setInterimText(censoredInterim);
    };

    rec.onerror = (event: any) => {
      const e = event.error as string;
      if (e === 'not-allowed') {
        // The mic stream itself is already live (getUserMedia succeeded), so this
        // is almost always a transient hiccup from the speech service — not a real
        // permission refusal. Retry a couple of times before surfacing an error.
        const micActuallyGranted = !!streamRef.current?.getTracks().some(t => t.readyState === 'live');
        if (micActuallyGranted && notAllowedRetryRef.current < 2 && !stoppedRef.current) {
          notAllowedRetryRef.current += 1;
          restartRef.current = setTimeout(() => {
            restartRef.current = null;
            if (phaseRef.current === 'recording' && !isMutedRef.current && !stoppedRef.current) {
              startEngine(blockedWords, modAction);
            }
          }, 400);
          return;
        }
        setMicError(
          micActuallyGranted
            ? 'Spraakherkenning kon niet starten, ook al is de microfoon toegestaan. Probeer opnieuw of gebruik typen.'
            : 'Microfoon geweigerd — klik het slotje in de adresbalk en sta toegang toe.',
        );
        setMicStatus('error'); stoppedRef.current = true; hadFatalErrorRef.current = true;
        setPhase('ask'); phaseRef.current = 'ask'; releaseMic();
      } else if (e === 'audio-capture') {
        setMicError('Microfoon niet bereikbaar — controleer de aansluiting.');
        setMicStatus('error'); stoppedRef.current = true; hadFatalErrorRef.current = true;
        setPhase('ask'); phaseRef.current = 'ask'; releaseMic();
      } else if (e === 'service-not-allowed') {
        setMicError('Spraakherkenning geblokkeerd — open via HTTPS of localhost.');
        setMicStatus('error'); stoppedRef.current = true; hadFatalErrorRef.current = true;
        setPhase('ask'); phaseRef.current = 'ask'; releaseMic();
      } else if (e === 'network') {
        netErrRef.current += 1;
        if (netErrRef.current >= 3) {
          setMicError('Geen verbinding met Google spraakservers. Probeer typen als alternatief.');
          setMicStatus('error');
          stoppedRef.current = true; hadFatalErrorRef.current = true;
        }
        // else: onend will fire and attempt silent restart
      }
      // 'no-speech' and 'aborted' are normal — handled silently by onend
    };

    rec.onend = () => {
      setSpeechDetected(false);

      if (phaseRef.current === 'recording' && !isMutedRef.current && !stoppedRef.current) {
        // Restart seamlessly after Chrome's no-speech timeout.
        restartRef.current = setTimeout(() => {
          restartRef.current = null;
          if (phaseRef.current === 'recording' && !isMutedRef.current && !stoppedRef.current) {
            startEngine(blockedWords, modAction);
          }
        }, 300);
      } else if (!hadFatalErrorRef.current) {
        // Don't override 'error' status that onerror already set.
        setMicStatus(isMutedRef.current ? 'paused' : 'idle');
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      console.error('SpeechRecognition.start() failed:', err);
      setMicError('Spraakherkenning kon niet starten. Vernieuw de pagina of gebruik typen.');
      setMicStatus('error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseMic]);

  // ── Recording controls ────────────────────────────────────────────────────

  const customBlockedWordsRef = useRef(customBlockedWords);
  const moderationActionRef   = useRef(moderationAction);
  useEffect(() => { customBlockedWordsRef.current = customBlockedWords; }, [customBlockedWords]);
  useEffect(() => { moderationActionRef.current   = moderationAction;   }, [moderationAction]);

  const startMicRecording = useCallback(async (existingStream?: MediaStream) => {
    stoppedRef.current      = false;
    netErrRef.current       = 0;
    notAllowedRetryRef.current = 0;
    hadFatalErrorRef.current = false;
    setMicError(null);
    setIsMuted(false); isMutedRef.current = false;
    setPhase('recording'); phaseRef.current = 'recording';
    soundManager.play('SUCCESS', 0.4);

    const stream = existingStream ?? await acquireMic();
    if (!stream) { setPhase('ask'); phaseRef.current = 'ask'; return; }

    startEngine(customBlockedWordsRef.current, moderationActionRef.current);
  }, [acquireMic, startEngine]);

  const startFreshMic = useCallback(() => {
    stopEngine(false);
    stoppedRef.current = false;
    releaseMic();
    committedRawRef.current      = '';
    committedCensoredRef.current = '';
    setCommittedText('');
    setRawCommitted('');
    setInterimText('');
    setProfanityMatches([]);
    setTimeLeft(MIC_RECORDING_SECONDS);
    interimRawRef.current = '';
    setSpeechDetected(false);
    setRecognitionStruggling(false);
    unresolvedSpeechSegmentsRef.current = 0;
    startMicRecording();
  }, [stopEngine, releaseMic, startMicRecording]);

  // Switch to keyboard mode: stop mic, carry over any spoken text
  const switchToKeyboard = useCallback(() => {
    stopEngine(true);
    releaseMic();
    setMicStatus('idle');
    setInterimText('');
    interimRawRef.current = '';
    setSpeechDetected(false);
    setRecognitionStruggling(false);
    // Carry over any spoken text into the textarea
    setKeyboardText(prev => prev || committedCensoredRef.current);
    setInputMode('keyboard');
    soundManager.play('SUCCESS', 0.2);
  }, [stopEngine, releaseMic]);

  // Switch to mic mode: carry typed text as committed baseline, then start mic
  const switchToMic = useCallback(() => {
    const typed = keyboardText.trim();
    committedRawRef.current      = typed;
    committedCensoredRef.current = typed;
    setRawCommitted(typed);
    setCommittedText(typed);
    setInputMode('mic');
    stoppedRef.current       = false;
    netErrRef.current        = 0;
    hadFatalErrorRef.current = false;
    setMicError(null);
    setPhase('recording'); phaseRef.current = 'recording';
    soundManager.play('SUCCESS', 0.2);
    acquireMic().then(stream => {
      if (!stream) return;
      startEngine(customBlockedWordsRef.current, moderationActionRef.current);
    });
  }, [acquireMic, startEngine, keyboardText]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false); isMutedRef.current = false;
      stoppedRef.current       = false;
      hadFatalErrorRef.current = false;
      soundManager.play('SUCCESS', 0.2);
      startEngine(customBlockedWordsRef.current, moderationActionRef.current);
    } else {
      setIsMuted(true); isMutedRef.current = true;
      stopEngine(true);
      setMicStatus('paused');
      setInterimText('');
      interimRawRef.current = '';
      setSpeechDetected(false);
    }
  }, [isMuted, stopEngine, startEngine]);

  // ── Submit ────────────────────────────────────────────────────────────────

  // Returns the best raw text to send to AI, depending on which input was used
  const getSubmitText = useCallback(() => {
    if (inputMode === 'keyboard') return keyboardText.trim();
    return [committedRawRef.current || rawCommitted, interimRawRef.current].filter(Boolean).join(' ').trim();
  }, [inputMode, keyboardText, rawCommitted]);

  const doSubmit = useCallback(async () => {
    stopEngine(true);
    releaseMic();
    setMicStatus('idle');

    const rawText = getSubmitText();
    if (!rawText) { setStep('social'); return; }

    setPhase('ai_review'); phaseRef.current = 'ai_review';
    setAiPolishing(true);
    soundManager.play('SUCCESS', 0.5);

    // Use unfiltered committed text for display in review
    const displayText = inputMode === 'keyboard' ? keyboardText.trim() : committedText;

    try {
      const result = await moderateAndRefineSpeech(rawText, customBlockedWords);
      setAiResult(result);
    } catch {
      setAiResult({
        refinedText: displayText || rawText,
        toxic: profanityMatches.length > 0,
        blockedWordsDetected: profanityMatches,
        language: 'Nederlands',
        positiveSentimentWords: [],
      });
    } finally {
      setAiPolishing(false);
    }
  }, [stopEngine, releaseMic, getSubmitText, inputMode, keyboardText, committedText, profanityMatches, customBlockedWords, setStep]);

  const doSubmitRef = useRef(doSubmit);
  useEffect(() => { doSubmitRef.current = doSubmit; });

  const finishAndContinue = useCallback(async () => {
    const rawText     = getSubmitText();
    const displayText = inputMode === 'keyboard' ? keyboardText.trim() : committedText;
    const final = aiResult?.refinedText || displayText || rawText;
    setPhase('thanks'); soundManager.play('SUCCESS', 0.6);
    try { useStore.getState().setVoiceFeedback(final, rawText); } catch { }
    try {
      saveSessionData({
        sessionId, voice_feedback: final, voice_feedback_original: rawText,
        voice_feedback_language: aiResult?.language || activeLang,
        voice_feedback_moderation_toxic: aiResult?.toxic || profanityMatches.length > 0,
        voice_feedback_timestamp: Date.now(), timestamp: Date.now(),
      });
    } catch { }
  }, [aiResult, getSubmitText, inputMode, keyboardText, committedText, sessionId, activeLang, profanityMatches]);

  // ── Timer (mic mode only) ─────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'recording' || isMuted || inputMode !== 'mic') return;
    const t = setInterval(() => setTimeLeft(p => (p <= 1 ? 0 : p - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, isMuted, inputMode]);

  useEffect(() => {
    if (timeLeft === 0 && phase === 'recording' && !isMuted && inputMode === 'mic') {
      doSubmitRef.current();
    }
  }, [timeLeft, phase, isMuted, inputMode]);

  // Profanity check on keyboard text (live)
  useEffect(() => {
    if (inputMode !== 'keyboard') return;
    const { matches } = censorText(keyboardText, customBlockedWords, moderationAction);
    setProfanityMatches(matches);
  }, [keyboardText, customBlockedWords, moderationAction, inputMode]);

  // Auto-focus textarea when entering keyboard mode
  useEffect(() => {
    if (inputMode === 'keyboard' && phase === 'recording') {
      const t = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [inputMode, phase]);

  // ── Navigation ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase === 'thanks') {
      const t = setTimeout(() => setStep('social'), 3500);
      return () => clearTimeout(t);
    }
  }, [phase, setStep]);

  // ── Cleanup ───────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => { stopEngine(true); releaseMic(); };
  }, [stopEngine, releaseMic]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const hasContent = inputMode === 'keyboard'
    ? keyboardText.trim().length > 0
    : (committedText.trim().length > 0 || interimText.trim().length > 0);

  const statusDot = useMemo(() => {
    if (isMuted) return { cls: 'bg-amber-500 animate-pulse', label: 'Microfoon Gedempt' };
    switch (micStatus) {
      case 'listening':  return speechDetected
        ? { cls: 'bg-emerald-500 animate-ping', label: 'Spraak Gedetecteerd' }
        : { cls: 'bg-red-500 animate-ping',   label: 'Aan het Luisteren' };
      case 'requesting': return { cls: 'bg-blue-400 animate-pulse', label: 'Microfoon Aanvragen...' };
      case 'error':      return { cls: 'bg-red-500',                label: 'Fout' };
      default:           return { cls: 'bg-white/30 animate-pulse', label: 'Starten...' };
    }
  }, [micStatus, isMuted, speechDetected]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 overflow-y-auto relative bg-[#030303] text-white">
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-brand/10 blur-[130px] rounded-full opacity-30 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-red-800/5 blur-[130px] rounded-full opacity-20" />

      <AnimatePresence mode="wait">

        {/* ── ASK ────────────────────────────────────────────────────────── */}
        {phase === 'ask' && (
          <motion.div key="ask"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
            className="text-center relative z-10 max-w-3xl px-6 py-12"
          >
            <div className="w-20 h-20 bg-brand/10 rounded-full border border-brand/20 flex items-center justify-center mx-auto mb-10 shadow-[0_0_30px_rgba(255,80,80,0.15)] animate-pulse">
              <Mic className="text-brand w-9 h-9" />
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold uppercase mb-8 tracking-tighter leading-none">
              Wil je nog <br /><span className="text-brand">extra feedback</span> geven?
            </h1>
            <p className="text-xl text-white/40 mb-12 max-w-xl mx-auto font-light leading-relaxed">
              Deel je mening via je stem of door te typen.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-xl mx-auto">
              <InteractiveButton onClick={startFreshMic}
                className="px-8 py-5 glass-red rounded-full group overflow-hidden relative min-w-[200px] shadow-[0_0_20px_rgba(255,80,80,0.1)]"
              >
                <div className="relative z-20 flex items-center justify-center gap-3">
                  <Mic className="w-5 h-5 group-hover:scale-110 transition-transform text-white" />
                  <span className="text-brand group-hover:text-white transition-colors font-display font-bold uppercase tracking-widest">
                    Spreken
                  </span>
                </div>
              </InteractiveButton>

              <InteractiveButton
                onClick={() => {
                  setKeyboardText('');
                  setPhase('recording'); phaseRef.current = 'recording';
                  setInputMode('keyboard');
                  setTimeLeft(MIC_RECORDING_SECONDS);
                  soundManager.play('SUCCESS', 0.4);
                }}
                className="px-8 py-5 glass border border-white/10 rounded-full group overflow-hidden relative min-w-[200px]"
              >
                <div className="relative z-20 flex items-center justify-center gap-3">
                  <Keyboard className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
                  <span className="text-white/60 group-hover:text-white transition-colors font-display font-bold uppercase tracking-widest">
                    Typen
                  </span>
                </div>
              </InteractiveButton>

              <InteractiveButton onClick={() => setStep('social')}
                className="px-8 py-5 glass rounded-full hover:bg-white/10 transition-all font-display font-bold uppercase tracking-widest text-white/30 text-sm min-w-[160px]"
              >
                Overslaan
              </InteractiveButton>
            </div>

            {(micError || !support.ok) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="mt-10 p-4 border border-red-500/20 bg-red-500/5 backdrop-blur-md rounded-2xl max-w-md mx-auto"
              >
                <div className="flex items-start gap-3 text-red-400">
                  <AlertTriangle className="w-5 h-5 min-w-[20px] mt-0.5" />
                  <span className="font-mono text-xs uppercase tracking-wider">
                    {micError || (!support.https ? 'Vereist HTTPS of localhost' : !support.api ? 'Gebruik Chrome of Edge voor microfoon' : 'Microfoon niet beschikbaar')}
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── RECORDING ──────────────────────────────────────────────────── */}
        {phase === 'recording' && (
          <motion.div key="recording"
            initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-5xl px-6 py-8 relative z-10 flex flex-col items-center"
          >
            {/* ── Top bar ── */}
            <div className="w-full flex flex-col md:flex-row justify-between items-center gap-6 mb-10 border-b border-white/5 pb-8">
              {/* Mode tabs */}
              <div className="flex bg-white/[0.03] border border-white/5 p-1 rounded-full">
                <button
                  onClick={() => inputMode !== 'mic' && switchToMic()}
                  className={cn(
                    'px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all',
                    inputMode === 'mic'
                      ? 'bg-brand text-white shadow-md'
                      : 'text-white/40 hover:text-white hover:bg-white/[0.05]',
                  )}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Microfoon</span>
                </button>
                <button
                  onClick={() => inputMode !== 'keyboard' && switchToKeyboard()}
                  className={cn(
                    'px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all',
                    inputMode === 'keyboard'
                      ? 'bg-white/20 text-white shadow-md border border-white/10'
                      : 'text-white/40 hover:text-white hover:bg-white/[0.05]',
                  )}
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Typen</span>
                </button>
              </div>

              <div className="flex items-center gap-4">
                {/* Mic status — only shown in mic mode */}
                {inputMode === 'mic' && (
                  <div className="px-4 py-2 bg-brand/10 border border-brand/20 rounded-full flex items-center gap-2.5">
                    <span className={cn('w-2.5 h-2.5 rounded-full', statusDot.cls)} />
                    <span className="font-mono text-[10px] tracking-widest uppercase font-bold text-white/80">{statusDot.label}</span>
                  </div>
                )}
                {inputMode === 'keyboard' && (
                  <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full flex items-center gap-2.5">
                    <MessageSquare className="w-3.5 h-3.5 text-white/50" />
                    <span className="font-mono text-[10px] tracking-widest uppercase font-bold text-white/50">Tekst Invoer</span>
                  </div>
                )}
                {profanityMatches.length > 0 && (
                  <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/25 rounded-full flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-mono text-[9px] uppercase tracking-widest text-amber-400 font-bold">
                      {profanityMatches.length} Filter Treffer{profanityMatches.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {/* Language picker — mic mode only */}
                {inputMode === 'mic' && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-white/30" />
                    <div className="flex bg-white/[0.03] border border-white/5 p-0.5 rounded-full">
                      {LANGS.map(l => (
                        <button key={l.code} onClick={() => {
                          setActiveLang(l.code); activeLangRef.current = l.code;
                          soundManager.play('SUCCESS', 0.2);
                          if (phaseRef.current === 'recording' && !stoppedRef.current) {
                            stopEngine(false); stoppedRef.current = false;
                            startEngine(customBlockedWordsRef.current, moderationActionRef.current);
                          }
                        }}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all flex items-center gap-1',
                            activeLang === l.code ? 'bg-white/15 text-white border border-white/10' : 'text-white/40 hover:text-white',
                          )}
                        >
                          <span>{l.flag}</span>
                          <span>{l.code.split('-')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Mic error banner ── */}
            {inputMode === 'mic' && micError && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="w-full mb-6 p-4 border border-amber-500/20 bg-amber-500/5 rounded-2xl flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-amber-400 min-w-[20px] mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-mono uppercase tracking-wider text-amber-400">{micError}</p>
                  <button onClick={switchToKeyboard} className="mt-2 text-[10px] font-mono uppercase tracking-wider text-white/50 hover:text-white underline underline-offset-2 transition-colors">
                    Schakel over naar typen →
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Mic mode UI ── */}
            {inputMode === 'mic' && (
              <>
                <div className="mb-8 relative flex flex-col items-center">
                  <div className="relative inline-block mb-3">
                    {micStatus === 'listening' && (
                      <>
                        <div id="mic-pulse-ring-1" className="absolute inset-0 rounded-full bg-brand/20 blur-md pointer-events-none transition-transform duration-75" />
                        <div id="mic-pulse-ring-2" className="absolute inset-0 rounded-full bg-brand/10 blur-xl pointer-events-none transition-all duration-75" />
                      </>
                    )}
                    <div id="mic-pulse-button"
                      className={cn(
                        'w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all duration-150 relative z-10 shadow-xl',
                        isMuted ? 'bg-white/5 border border-white/10' : 'bg-brand',
                      )}
                    >
                      {isMuted ? <MicOff className="text-white/30 w-10 h-10" /> : <Mic className="text-white w-10 h-10" />}
                    </div>
                    <div className="absolute -top-3 -right-3 text-brand font-mono font-bold text-lg bg-black/90 border border-brand/20 px-3.5 py-1.5 rounded-2xl shadow-2xl z-20 min-w-[50px] text-center">
                      {timeLeft}s
                    </div>
                  </div>
                  <AudioVisualizer stream={micStream} active={micStatus === 'listening'} />
                </div>

                {/* Mic transcript box */}
                <div className={cn(
                  'glass w-full min-h-[200px] p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden shadow-3xl bg-white/[0.01] border transition-all duration-500 flex flex-col',
                  profanityMatches.length > 0 && moderationAction === 'warn' ? 'border-amber-500/30' : 'border-brand/15',
                )}>
                  {/* Progress bar */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                    <div
                      className={cn('h-full', profanityMatches.length > 0 ? 'bg-amber-500' : 'bg-brand')}
                      style={{ width: `${(timeLeft / MIC_RECORDING_SECONDS) * 100}%`, transition: 'width 1s linear' }}
                    />
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center py-4 max-h-[240px] overflow-y-auto">
                    {hasContent ? (
                      <p className="text-2xl md:text-3xl font-light text-center leading-relaxed">
                        {committedText.trim() && (
                          <span className="text-white">
                            <HighlightedText text={committedText.trim()} />
                          </span>
                        )}
                        {interimText.trim() && (
                          <span className={cn('text-white/40 italic', committedText.trim() ? ' ml-1' : '')}>
                            {interimText.trim()}
                          </span>
                        )}
                      </p>
                    ) : (
                      <span className={cn(
                        'italic font-mono text-base uppercase tracking-widest transition-colors duration-300',
                        micStatus === 'listening' && speechDetected ? 'text-emerald-400 opacity-80 animate-pulse' : 'opacity-20',
                      )}>
                        {micStatus === 'listening'
                          ? (speechDetected ? 'Spraak gedetecteerd — aan het verwerken...' : 'Spreek je gedachten in...')
                          : micStatus === 'requesting' ? 'Microfoon aanvragen...' : 'Starten...'}
                      </span>
                    )}
                  </div>

                  {!hasContent && recognitionStruggling && (
                    <div className="border-t border-amber-500/10 mt-2 pt-4 flex items-start gap-3 justify-center text-center px-4">
                      <AlertTriangle className="w-4 h-4 text-amber-400 min-w-[16px] mt-0.5" />
                      <p className="text-xs text-amber-400/80 font-mono leading-relaxed max-w-sm">
                        We horen je spreken, maar kunnen het nog niet goed verstaan. Spreek wat dichter bij de microfoon, of{' '}
                        <button onClick={switchToKeyboard} className="underline underline-offset-2 hover:text-amber-300">schakel over naar typen</button>.
                      </p>
                    </div>
                  )}

                  {profanityMatches.length > 0 && (
                    <div className="border-t border-white/5 mt-4 pt-4 flex flex-wrap gap-2 items-center justify-center">
                      <span className="text-[10px] text-white/30 font-mono uppercase tracking-widest">Gefilterd:</span>
                      {profanityMatches.map((w, i) => (
                        <span key={i} className="px-2.5 py-1 text-[10px] font-mono uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md">{w}</span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Keyboard mode UI ── */}
            {inputMode === 'keyboard' && (
              <div className="w-full">
                <div className={cn(
                  'glass w-full rounded-[2.5rem] relative overflow-hidden shadow-3xl bg-white/[0.01] border transition-all duration-500',
                  profanityMatches.length > 0 && moderationAction === 'warn' ? 'border-amber-500/30' : 'border-white/10',
                )}>
                  <textarea
                    ref={textareaRef}
                    autoFocus
                    value={keyboardText}
                    onChange={e => setKeyboardText(e.target.value)}
                    placeholder="Typ hier je feedback..."
                    maxLength={1000}
                    rows={7}
                    className="w-full bg-transparent text-white text-xl md:text-2xl font-light leading-relaxed p-8 md:p-10 resize-none focus:outline-none placeholder:text-white/15 placeholder:italic placeholder:font-mono placeholder:text-base placeholder:uppercase placeholder:tracking-widest"
                  />
                  <div className="border-t border-white/5 px-8 py-3 flex items-center justify-between">
                    <div className="flex flex-wrap gap-2 items-center">
                      {profanityMatches.length > 0 && profanityMatches.map((w, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md">{w}</span>
                      ))}
                    </div>
                    <span className={cn(
                      'font-mono text-[11px] tabular-nums',
                      keyboardText.length > 900 ? 'text-amber-400' : 'text-white/20',
                    )}>
                      {keyboardText.length}/1000
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Bottom controls ── */}
            <div className="w-full flex flex-col md:flex-row justify-between items-center gap-6 mt-8">
              <button onClick={() => setShowFilters(p => !p)}
                className={cn(
                  'p-3.5 border rounded-full transition-all duration-500 flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-widest font-bold cursor-pointer',
                  showFilters ? 'bg-brand/10 border-brand/35 text-white' : 'text-white/40 border-white/5 bg-white/[0.01] hover:text-white hover:bg-white/[0.03]',
                )}
              >
                <Sliders className="w-4 h-4 text-brand" />
                <span>Filters & Moderatie</span>
              </button>

              <div className="flex gap-4 items-center">
                {inputMode === 'mic' && (
                  <InteractiveButton onClick={toggleMute}
                    className={cn(
                      'px-8 py-4 glass rounded-full font-display font-medium uppercase tracking-widest text-xs flex items-center gap-3 border-white/5 transition-all',
                      isMuted ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500' : 'bg-white/5 hover:bg-white/10 text-white/70',
                    )}
                  >
                    {isMuted
                      ? <><Play className="w-4 h-4 text-emerald-500 fill-emerald-500" /><span>Hervat</span></>
                      : <><MicOff className="w-4 h-4" /><span>Demp</span></>}
                  </InteractiveButton>
                )}

                <InteractiveButton onClick={doSubmit}
                  disabled={(profanityMatches.length > 0 && moderationAction === 'block') || !hasContent}
                  className={cn(
                    'px-10 py-4 font-display font-bold uppercase tracking-widest text-xs flex items-center gap-3 rounded-full shadow-lg transition-all duration-500',
                    (!hasContent || (profanityMatches.length > 0 && moderationAction === 'block'))
                      ? 'opacity-30 cursor-not-allowed bg-white/5 border border-white/10 text-white/30'
                      : 'glass-red text-brand shadow-brand/10',
                  )}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Feedback Afronden</span>
                </InteractiveButton>
              </div>
            </div>

            {/* ── Filters panel ── */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="w-full glass bg-white/[0.01] border border-white/5 rounded-[2rem] p-6 md:p-8 relative overflow-hidden"
                >
                  <button onClick={() => setShowFilters(false)} className="absolute top-4 right-4 p-1.5 hover:bg-white/5 rounded-full text-white/40 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                  <h3 className="text-sm font-mono uppercase tracking-widest text-white/50 mb-6 flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-brand" /><span>Moderatie Dashboard</span>
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-xs uppercase tracking-widest text-white/30 font-bold mb-4 flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-brand" /><span>Moderatie Methode</span>
                      </h4>
                      <div className="flex flex-col gap-3">
                        {(['censor','block','warn'] as const).map(mode => (
                          <button key={mode} onClick={() => { setModerationAction(mode); soundManager.play('SUCCESS', 0.1); }}
                            className={cn(
                              'p-4 border rounded-xl flex items-center justify-between text-left transition-all cursor-pointer',
                              moderationAction === mode ? 'bg-brand/10 border-brand/30 text-white' : 'hover:bg-white/[0.02] border-white/5 text-white/55',
                            )}
                          >
                            <div>
                              <p className="text-xs font-mono uppercase tracking-wider font-bold text-white">
                                {mode === 'censor' && 'Automatic Censor'}
                                {mode === 'block'  && 'Block Submission'}
                                {mode === 'warn'   && 'Display Warnings'}
                              </p>
                              <p className="text-[10px] text-white/40 mt-1">
                                {mode === 'censor' && 'Vervangt verboden woorden door sterretjes.'}
                                {mode === 'block'  && 'Blokkeert afronden tot taal is opgeschoond.'}
                                {mode === 'warn'   && 'Toont een waarschuwing.'}
                              </p>
                            </div>
                            <div className={cn('w-4 h-4 rounded-full border flex items-center justify-center', moderationAction === mode ? 'border-brand bg-brand' : 'border-white/20')}>
                              {moderationAction === mode && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase tracking-widest text-white/30 font-bold mb-4 flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5 text-brand" /><span>Geblokkeerde Woorden</span>
                      </h4>
                      <div className="flex gap-2.5 mb-4">
                        <input
                          type="text" value={newWordInput}
                          onChange={e => setNewWordInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const w = newWordInput.trim().toLowerCase();
                              if (w && !customBlockedWords.includes(w)) {
                                setCustomBlockedWords(p => [...p, w]);
                                setNewWordInput('');
                                soundManager.play('SUCCESS', 0.1);
                              }
                            }
                          }}
                          placeholder="Bijv. slecht, waardeloos..."
                          className="flex-1 bg-white/[0.02] border border-white/5 text-white px-4 py-3 rounded-xl text-xs placeholder-white/25 focus:outline-none focus:border-brand/40 font-mono"
                        />
                        <button
                          onClick={() => {
                            const w = newWordInput.trim().toLowerCase();
                            if (w && !customBlockedWords.includes(w)) {
                              setCustomBlockedWords(p => [...p, w]);
                              setNewWordInput('');
                              soundManager.play('SUCCESS', 0.1);
                            }
                          }}
                          className="bg-brand/10 border border-brand/20 text-brand px-4 rounded-xl flex items-center justify-center hover:bg-brand hover:text-white transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-1">
                        {customBlockedWords.length === 0
                          ? <span className="text-[10px] italic text-white/20 font-mono">Geen geblokkeerde woorden.</span>
                          : customBlockedWords.map(w => (
                            <span key={w} onClick={() => setCustomBlockedWords(p => p.filter(x => x !== w))}
                              className="px-2.5 py-1.5 text-[10px] font-mono uppercase bg-white/5 border border-white/5 rounded-lg flex items-center gap-1.5 hover:border-red-500/30 hover:text-red-400 cursor-pointer transition-all"
                            >
                              <span>{w}</span><X className="w-3 h-3 opacity-60 text-red-500 pointer-events-none" />
                            </span>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── AI REVIEW ──────────────────────────────────────────────────── */}
        {phase === 'ai_review' && (
          <motion.div key="ai_review"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl px-8 py-10 relative z-10"
          >
            {aiPolishing ? (
              <div className="text-center py-20 flex flex-col items-center">
                <div className="relative mb-10">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    className="w-24 h-24 border-2 border-brand/10 border-t-brand rounded-full shadow-[0_0_30px_rgba(255,80,80,0.1)]"
                  />
                  <BrainCircuit className="w-10 h-10 text-brand absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <h2 className="text-xl md:text-3xl font-display font-black uppercase tracking-widest text-white mb-4 animate-pulse">AI Verwerking</h2>
                <p className="text-sm font-mono uppercase text-white/35 tracking-widest">Gemini polijst grammatica en controleert content...</p>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-8 bg-white/[0.01] rounded-[3rem] p-8 md:p-12 border border-brand/20 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden">
                  <motion.div animate={{ left: ['-100%','100%'] }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    className="absolute top-0 w-1/3 h-full bg-brand/40 shadow-[0_0_15px_#ff4d4d]"
                  />
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-6 gap-4">
                  <div>
                    <h2 className="text-3xl font-display font-medium uppercase tracking-tight text-white flex items-center gap-3">
                      <BrainCircuit className="w-8 h-8 text-brand" /><span>AI Evaluatie Rapport</span>
                    </h2>
                    <p className="text-xs text-white/35 font-mono uppercase tracking-widest mt-1.5">
                      Taal: <span className="text-white font-bold">{aiResult?.language || 'NL'}</span>
                    </p>
                  </div>
                  {aiResult?.toxic
                    ? <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center gap-2.5 font-mono text-[10px] uppercase font-bold tracking-widest"><AlertTriangle className="w-4 h-4" /><span>⚠️ Gecensureerde Inhoud</span></div>
                    : <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-2.5 font-mono text-[10px] uppercase font-bold tracking-widest"><CheckCircle2 className="w-4 h-4" /><span>✅ Veilig & Gecorrigeerd</span></div>
                  }
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest font-bold">Originele Feedback</span>
                    <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl min-h-[120px] text-white/50 text-sm leading-relaxed font-light italic">
                      "<HighlightedText text={inputMode === 'keyboard' ? keyboardText : (committedText || rawCommitted)} words={aiResult?.positiveSentimentWords} />"
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[10px] font-mono text-brand uppercase tracking-widest font-black">Verbeterde feedback (Herschreven door AI)</span>
                    <div className="bg-brand/5 border border-brand/20 p-6 rounded-2xl min-h-[120px] text-white text-sm leading-relaxed font-bold">
                      "<HighlightedText text={aiResult?.refinedText || ''} words={aiResult?.positiveSentimentWords} />"
                    </div>
                  </div>
                </div>
                {(aiResult?.blockedWordsDetected?.length ?? 0) > 0 && (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="text-amber-500 w-5 h-5 min-w-[20px] mt-0.5" />
                    <div>
                      <p className="text-xs font-mono uppercase text-amber-400 font-bold tracking-wider">Geblokkeerde Woorden</p>
                      <p className="text-[11px] text-white/40 mt-1">Gemarkeerde termen: <span className="text-amber-300 font-mono font-bold uppercase">{aiResult!.blockedWordsDetected.join(', ')}</span></p>
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-end">
                  <InteractiveButton
                    onClick={() => {
                      committedRawRef.current = ''; committedCensoredRef.current = '';
                      setCommittedText(''); setRawCommitted(''); setInterimText('');
                      setKeyboardText(''); setTimeLeft(MIC_RECORDING_SECONDS);
                      interimRawRef.current = '';
                      setPhase('recording'); phaseRef.current = 'recording';
                      if (inputMode === 'mic') {
                        stoppedRef.current = false; netErrRef.current = 0; hadFatalErrorRef.current = false;
                        acquireMic().then(s => s && startEngine(customBlockedWordsRef.current, moderationActionRef.current));
                      }
                    }}
                    className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white/60 border border-white/5 rounded-full font-display font-medium text-xs uppercase tracking-widest flex items-center justify-center"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-2 text-white/40" />
                    Opnieuw
                  </InteractiveButton>
                  <InteractiveButton onClick={finishAndContinue}
                    className="px-10 py-4 glass-red font-display font-black text-xs uppercase tracking-widest rounded-full"
                  >
                    Bevestigen & Doorgaan
                  </InteractiveButton>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── THANKS ─────────────────────────────────────────────────────── */}
        {phase === 'thanks' && (
          <motion.div key="thanks"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center relative z-10 max-w-xl px-2"
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}
              className="w-24 h-24 bg-brand/10 border border-brand/30 rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(255,80,80,0.25)]"
            >
              <CheckCircle2 className="w-12 h-12 text-brand" />
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-display font-bold uppercase mb-6 tracking-tight leading-none">
              Bedankt voor <br /><span className="text-brand">jouw input!</span>
            </h1>
            <p className="text-xl text-white/45 font-light max-w-md mx-auto leading-relaxed">
              Je feedback is succesvol opgeslagen in ons datanetwerk.
            </p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
