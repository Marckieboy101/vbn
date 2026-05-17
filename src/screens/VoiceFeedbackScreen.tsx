import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { Mic, MicOff, CheckCircle2, BrainCircuit } from 'lucide-react';
import { InteractiveButton } from '../components/InteractiveButton';
import { soundManager } from '../lib/sound';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export const VoiceFeedbackScreen: React.FC = () => {
  const { setStep, sessionId } = useStore();
  const [phase, setPhase] = useState<'ask' | 'recording' | 'thanks'>('ask');
  const [transcription, setTranscription] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const startRecording = useCallback(() => {
    setPhase('recording');
    setRecognitionError(null);
    soundManager.play('SUCCESS', 0.4);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'nl-NL';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscription(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
          setRecognitionError('Microfoon toegang geweigerd');
          setPhase('ask');
        } else if (event.error === 'network') {
          setRecognitionError('Netwerkfout: Controleer je verbinding');
        } else if (event.error === 'aborted') {
          // Gracefully ignore aborted error as it often happens on stop()
          console.log('Recognition aborted');
        } else {
          setRecognitionError(`Fout: ${event.error}`);
        }
      };

      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start recognition:', err);
      }
    } else {
      console.warn('Speech Recognition API not supported in this browser.');
      setTranscription('Transcriptie wordt niet ondersteund in deze browser, maar we luisteren wel...');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }
    setPhase('thanks');
    soundManager.play('SUCCESS', 0.6);

    // Save transcription to Firestore
    if (transcription) {
      try {
        await setDoc(doc(db, 'sessions', sessionId), {
          voice_feedback: transcription,
          voice_feedback_timestamp: Date.now()
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}`);
      }
    }
  }, [sessionId, transcription]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phase === 'recording' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phase, timeLeft, stopRecording]);

  useEffect(() => {
    if (phase === 'thanks') {
      const timeout = setTimeout(() => {
        setStep('social');
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [phase, setStep]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand/10 blur-[120px] rounded-full opacity-30 animate-pulse" />
      
      <AnimatePresence mode="wait">
        {phase === 'ask' && (
          <motion.div
            key="ask"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center relative z-10 max-w-2xl px-6"
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold uppercase mb-8 tracking-tight leading-none">
              Wil je nog <br /><span className="text-brand">extra feedback</span> geven?
            </h1>
            <p className="text-xl text-white/40 mb-12 font-light leading-relaxed">
              Je kunt je mening via spraak delen. Dit helpt ons de ervaring nog verder te optimaliseren. We luisteren graag!
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <InteractiveButton 
                onClick={startRecording}
                className="px-12 py-5 glass-red rounded-full group overflow-hidden relative min-w-[240px]"
              >
                <div className="relative z-10 flex items-center justify-center gap-3">
                  <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-brand group-hover:text-white transition-colors font-display font-bold uppercase tracking-widest">
                    {recognitionError === 'Microfoon toegang geweigerd' ? 'Opnieuw proberen' : 'Ja, ik spreek in'}
                  </span>
                </div>
                <div className="absolute inset-0 bg-brand/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </InteractiveButton>
              <InteractiveButton 
                onClick={() => setStep('social')}
                className="px-12 py-5 glass rounded-full hover:bg-white/10 transition-all font-display font-bold uppercase tracking-widest text-white/40 min-w-[240px]"
              >
                Nee, sla over
              </InteractiveButton>
            </div>
            {recognitionError && recognitionError !== 'Microfoon toegang geweigerd' && (
              <p className="mt-8 text-red-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                {recognitionError}
              </p>
            )}
          </motion.div>
        )}

        {phase === 'recording' && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center relative z-10 w-full max-w-4xl px-6"
          >
            <div className="mb-12 relative inline-block">
              <motion.div 
                animate={{ 
                  scale: recognitionError ? 1 : [1, 1.15, 1], 
                  boxShadow: recognitionError 
                    ? "0 0 20px rgba(255,0,0,0.4)" 
                    : ["0 0 20px rgba(255,80,80,0.2)", "0 0 60px rgba(255,80,80,0.6)", "0 0 20px rgba(255,80,80,0.2)"] 
                }} 
                transition={{ repeat: Infinity, duration: 1.5 }}
                className={cn(
                  "w-28 h-28 rounded-full flex items-center justify-center mx-auto transition-colors duration-500",
                  recognitionError ? "bg-red-900/50 border border-red-500" : "bg-brand"
                )}
              >
                {recognitionError ? <MicOff className="text-red-500 w-12 h-12" /> : <Mic className="text-white w-12 h-12" />}
              </motion.div>
              <div className="absolute -top-4 -right-4 text-brand font-mono font-bold text-2xl bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-brand/20 shadow-xl">
                {timeLeft}s
              </div>
            </div>

            <h2 className={cn(
              "text-2xl font-display font-bold uppercase tracking-[0.3em] mb-12 animate-pulse",
              recognitionError ? "text-red-500" : "text-brand"
            )}>
              {recognitionError || "Microfoon Actief - Spreek nu"}
            </h2>

            <div className={cn(
              "glass min-h-[250px] p-10 rounded-[3rem] relative overflow-hidden group shadow-2xl backdrop-blur-xl bg-white/[0.02] border transition-colors duration-500",
              recognitionError ? "border-red-500/30" : "border-brand/20"
            )}>
              <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5">
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 30, ease: "linear" }}
                  className={cn(
                    "h-full shadow-[0_0_15px_rgba(255,80,80,0.5)]",
                    recognitionError ? "bg-red-500" : "bg-brand"
                  )}
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                {recognitionError && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-red-500/60">
                    <p className="text-xl font-mono uppercase tracking-[0.2em]">{recognitionError}</p>
                    <button 
                      onClick={startRecording}
                      className="text-[10px] font-bold uppercase tracking-[0.4em] border border-red-500/30 px-6 py-3 rounded-full hover:bg-red-500 hover:text-white transition-all"
                    >
                      Probeer opnieuw
                    </button>
                  </div>
                )}
                {!recognitionError && (
                  <p className="text-2xl md:text-4xl text-white font-light text-center leading-relaxed">
                    {transcription || <span className="opacity-20 italic font-mono text-xl uppercase tracking-widest">Transcriptie systeem wordt geladen...</span>}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-6 mt-12">
              <InteractiveButton 
                onClick={stopRecording}
                className="px-12 py-5 glass rounded-full hover:bg-white/10 transition-all font-display font-bold uppercase tracking-[0.2em] flex items-center gap-4 border-white/5 group"
              >
                <CheckCircle2 className="w-6 h-6 text-emerald-500" /> 
                <span>Feedback Afronden</span>
              </InteractiveButton>
            </div>
          </motion.div>
        )}

        {phase === 'thanks' && (
          <motion.div
            key="thanks"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center relative z-10"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-28 h-28 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_40px_rgba(16,185,129,0.2)]"
            >
              <CheckCircle2 className="w-14 h-14 text-emerald-500" />
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-display font-bold uppercase mb-6 tracking-tight">
              Bedankt voor <br /><span className="text-emerald-500">jouw input!</span>
            </h1>
            <p className="text-xl text-white/40 font-light max-w-md mx-auto">
              We hebben je feedback succesvol opgeslagen in ons archief.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 text-white/5 font-mono text-[9px] uppercase tracking-[0.6em] font-black">
        <BrainCircuit className="w-4 h-4 opacity-50" />
        <span>Audio AI Analyse Actief</span>
      </div>
    </div>
  );
};
