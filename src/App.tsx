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
import { VbnOverlay } from './components/VbnOverlay';
import { soundManager } from './lib/sound';

// Screens
import { LandingScreen } from './screens/LandingScreen';
import { IntroVideoScreen } from './screens/IntroVideoScreen';
import { IntroductionScreen } from './screens/IntroductionScreen';
import { AgeSelectionScreen } from './screens/AgeSelectionScreen';
import { GenreSelectionScreen } from './screens/GenreSelectionScreen';
import { GenreConfirmationScreen } from './screens/GenreConfirmationScreen';
import { InstructionsScreen } from './screens/InstructionsScreen';
import { QuestionFlowScreen } from './screens/QuestionFlowScreen';
import { FeedbackThanksScreen } from './screens/FeedbackThanksScreen';
import { VoiceFeedbackScreen } from './screens/VoiceFeedbackScreen';
import { CommunityScreen } from './screens/CommunityScreen';
import { cn } from './lib/utils';
import { useGesture } from './components/GestureProvider';
import { CameraOff, ShieldAlert, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { VBWrappedScreen } from './screens/VBWrappedScreen';
import { GoogleSheetsIntegration } from './components/GoogleSheetsIntegration';

export default function App() {
  return (
    <GestureProvider>
      <AppInner />
    </GestureProvider>
  );
}

function StepRenderer({ step, error }: { step: string, error: string | null }) {
  switch (step) {
    case 'landing': return <LandingScreen />;
    case 'intro_video': return <IntroVideoScreen />;
    case 'intro': return <IntroductionScreen />;
    case 'age_selection': return <AgeSelectionScreen />;
    case 'genre': return <GenreSelectionScreen />;
    case 'genre_confirmed': return <GenreConfirmationScreen />;
    case 'instructions': return <InstructionsScreen />;
    case 'questions': return <QuestionFlowScreen />;
    case 'feedback_thanks': return <FeedbackThanksScreen />;
    case 'voice_feedback': return <VoiceFeedbackScreen />;
    case 'social': return <CommunityScreen />;
    case 'thankyou': return <VBWrappedScreen onClose={() => useStore.getState().reset()} />;
    default: return <LandingScreen />;
  }
}

function AppInner() {
  const { step } = useStore();
  const { error, isMouseFallback } = useGesture();

  return (
    <div className={cn(
      "relative min-h-screen font-sans selection:bg-brand/30 selection:text-white transition-all duration-300",
      (error || isMouseFallback) ? "cursor-default" : "cursor-none"
    )}>
      <CinematicBackground />
      <VbnOverlay />
      {(!error || isMouseFallback) && <FuturisticCursor />}

      <main className="relative z-10 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            <StepRenderer step={step} error={error} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Google Sheets Synchronizer */}
      <GoogleSheetsIntegration />

      {/* Global Sound Toggle */}
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
    </div>
  );
}


