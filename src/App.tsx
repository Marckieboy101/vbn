/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useStore } from './store';
import { GestureProvider } from './components/GestureProvider';
import { CinematicBackground } from './components/CinematicBackground';
import { FuturisticCursor } from './components/FuturisticCursor';

// Screens
import { LandingScreen } from './screens/LandingScreen';
import { IntroductionScreen } from './screens/IntroductionScreen';
import { GenreSelectionScreen } from './screens/GenreSelectionScreen';
import { GenreConfirmationScreen } from './screens/GenreConfirmationScreen';
import { InstructionsScreen } from './screens/InstructionsScreen';
import { QuestionFlowScreen } from './screens/QuestionFlowScreen';
import { CommunityScreen } from './screens/CommunityScreen';
import { ThankYouScreen } from './screens/ThankYouScreen';
import { AdminLogin } from './screens/AdminLogin';
import { AdminDashboard } from './screens/AdminDashboard';
import { cn } from './lib/utils';
import { useGesture } from './components/GestureProvider';
import { Settings, CameraOff, ShieldAlert, RotateCcw, Volume2, VolumeX } from 'lucide-react';

export default function App() {
  const { isAdmin, setStep } = useStore();

  // Keyboard shortcut for admin (Alt + A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'a') {
        setStep('admin_login' as any);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setStep]);

  return (
    <GestureProvider>
      <AppInner />
    </GestureProvider>
  );
}

function StepRenderer({ step, isAdmin, error }: { step: string, isAdmin: boolean, error: string | null }) {
  if (error && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center relative z-[200]">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass p-12 rounded-[3.5rem] border-brand/30 max-w-xl shadow-[0_0_100px_rgba(225,29,72,0.1)]"
        >
          <div className="w-24 h-24 bg-brand/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-brand/20">
            <CameraOff className="w-12 h-12 text-brand" />
          </div>
          <h2 className="text-4xl font-display font-bold uppercase mb-4">Signaal <span className="text-brand">Geblokkeerd</span></h2>
          <p className="text-white/60 mb-10 leading-relaxed">
            {error}
          </p>
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-5 glass-red rounded-2xl font-display font-bold uppercase tracking-widest flex items-center justify-center gap-3"
            >
              <RotateCcw className="w-5 h-5" /> Reeks Verversen
            </button>
            <div className="flex items-center justify-center gap-2 text-white/20 font-mono text-[10px] uppercase tracking-widest mt-4">
              <ShieldAlert className="w-3 h-3" /> Veilige omgeving vereist
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isAdmin) return <AdminDashboard />;
  
  switch (step) {
    case 'landing': return <LandingScreen />;
    case 'intro': return <IntroductionScreen />;
    case 'genre': return <GenreSelectionScreen />;
    case 'genre_confirmed': return <GenreConfirmationScreen />;
    case 'instructions': return <InstructionsScreen />;
    case 'questions': return <QuestionFlowScreen />;
    case 'social': return <CommunityScreen />;
    case 'thankyou': return <ThankYouScreen />;
    // @ts-ignore
    case 'admin_login': return <AdminLogin />;
    default: return <LandingScreen />;
  }
}

function AppInner() {
  const { step, isAdmin } = useStore();
  const { error } = useGesture();

  return (
    <div className="relative min-h-screen font-sans selection:bg-brand/30 selection:text-white cursor-none">
      <CinematicBackground />
      {!error && <FuturisticCursor />}

      <main className="relative z-10 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={isAdmin ? 'admin' : (error ? 'error' : step)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            <StepRenderer step={step} isAdmin={isAdmin} error={error} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Secret Admin Entry */}
      {!isAdmin && !error && step === 'landing' && (
        <button 
          onClick={() => useStore.getState().setStep('admin_login' as any)}
          className="fixed bottom-6 right-6 p-3 text-white/5 hover:text-white/20 transition-colors z-[100]"
          title="Beheerportaal"
        >
          <Settings className="w-5 h-5" />
        </button>
      )}

      {/* Global Sound Toggle */}
      {!isAdmin && !error && (
        <button 
          onClick={() => useStore.getState().toggleSound()}
          className="fixed top-8 right-8 z-[100] p-3 glass rounded-full border-white/5 hover:bg-white/10 transition-colors group"
          title={useStore.getState().soundEnabled ? "Dempen" : "Geluid inschakelen"}
        >
          {useStore.getState().soundEnabled ? (
            <Volume2 className="w-5 h-5 text-white/40 group-hover:text-brand transition-colors" />
          ) : (
            <VolumeX className="w-5 h-5 text-brand" />
          )}
        </button>
      )}
    </div>
  );
}


