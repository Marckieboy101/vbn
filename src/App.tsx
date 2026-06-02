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
import { soundManager } from './lib/sound';

// Screens
import { LandingScreen } from './screens/LandingScreen';
import { IntroductionScreen } from './screens/IntroductionScreen';
import { GenreSelectionScreen } from './screens/GenreSelectionScreen';
import { GenreConfirmationScreen } from './screens/GenreConfirmationScreen';
import { InstructionsScreen } from './screens/InstructionsScreen';
import { QuestionFlowScreen } from './screens/QuestionFlowScreen';
import { FeedbackThanksScreen } from './screens/FeedbackThanksScreen';
import { VoiceFeedbackScreen } from './screens/VoiceFeedbackScreen';
import { CommunityScreen } from './screens/CommunityScreen';
import { AdminLogin } from './screens/AdminLogin';
import { AdminDashboard } from './screens/AdminDashboard';
import { cn } from './lib/utils';
import { useGesture } from './components/GestureProvider';
import { Settings, CameraOff, ShieldAlert, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { VBWrappedScreen } from './screens/VBWrappedScreen';

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
  if (isAdmin) return <AdminDashboard />;
  
  switch (step) {
    case 'landing': return <LandingScreen />;
    case 'intro': return <IntroductionScreen />;
    case 'genre': return <GenreSelectionScreen />;
    case 'genre_confirmed': return <GenreConfirmationScreen />;
    case 'instructions': return <InstructionsScreen />;
    case 'questions': return <QuestionFlowScreen />;
    case 'feedback_thanks': return <FeedbackThanksScreen />;
    case 'voice_feedback': return <VoiceFeedbackScreen />;
    case 'social': return <CommunityScreen />;
    case 'thankyou': return <VBWrappedScreen onClose={() => useStore.getState().reset()} />;
    // @ts-ignore
    case 'admin_login': return <AdminLogin />;
    default: return <LandingScreen />;
  }
}

function AppInner() {
  const { step, isAdmin } = useStore();
  const { error, isMouseFallback } = useGesture();

  return (
    <div className={cn(
      "relative min-h-screen font-sans selection:bg-brand/30 selection:text-white transition-all duration-300",
      (error || isMouseFallback) ? "cursor-default" : "cursor-none"
    )}>
      <CinematicBackground />
      {(!error || isMouseFallback) && <FuturisticCursor />}

      <main className="relative z-10 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={isAdmin ? 'admin' : step}
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
      {!isAdmin && step === 'landing' && (
        <button 
          onClick={() => useStore.getState().setStep('admin_login' as any)}
          className="fixed bottom-6 right-6 p-3 text-white/5 hover:text-white/20 transition-colors z-[100]"
          title="Beheerportaal"
        >
          <Settings className="w-5 h-5" />
        </button>
      )}

      {/* Global Sound Toggle */}
      {!isAdmin && (
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


