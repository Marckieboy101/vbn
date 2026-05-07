import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Hands, Results, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

interface GestureState {
  x: number;
  y: number;
  isPinching: boolean;
  isThumbUp: boolean;
  isVisible: boolean;
  error: string | null;
}

const GestureContext = createContext<GestureState>({ 
  x: 0.5, 
  y: 0.5, 
  isPinching: false, 
  isThumbUp: false, 
  isVisible: false,
  error: null 
});

export const useGesture = () => useContext(GestureContext);

export const GestureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GestureState>({ 
    x: 0.5, 
    y: 0.5, 
    isPinching: false, 
    isThumbUp: false, 
    isVisible: false,
    error: null 
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    let activeHands: Hands | null = null;
    let activeCamera: any = null;
    let isTerminated = false;

    const startCamera = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        if (isTerminated) return;
        
        // Ensure only one global Module object exists to avoid conflict
        // @ts-ignore
        window.Module = window.Module || {};
        // @ts-ignore
        if (!window.Module.arguments) window.Module.arguments = [];

        const hands = new Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        let isProcessing = false;
        let prevState = { isPinching: false };

        hands.onResults((results: Results) => {
          isProcessing = false;
          if (isTerminated) return;

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const indexTip = landmarks[8];
            const thumbTip = landmarks[4];
            const thumbMCP = landmarks[2];
            const thumbIP = landmarks[3];

            const x = 1 - indexTip.x;
            const y = indexTip.y;

            // Use hysteresis for more stable pinch detection
            const distance = Math.sqrt(
              Math.pow(indexTip.x - thumbTip.x, 2) + 
              Math.pow(indexTip.y - thumbTip.y, 2) + 
              Math.pow(indexTip.z - thumbTip.z, 2)
            );
            
            // 0.07 to trigger, 0.1 to release
            const isPinching = prevState.isPinching 
              ? distance < 0.1 
              : distance < 0.07;
            
            prevState.isPinching = isPinching;

            const isThumbUp = thumbTip.y < thumbIP.y && thumbTip.y < thumbMCP.y && 
                               thumbTip.y < landmarks[8].y && thumbTip.y < landmarks[12].y;

            setState(prev => ({ ...prev, x, y, isPinching, isThumbUp, isVisible: true, error: null }));
          } else {
            prevState.isPinching = false;
            setState(prev => ({ ...prev, isVisible: false }));
          }
        });

        activeHands = hands;
        handsRef.current = hands;

        if (videoRef.current) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (isTerminated || !activeHands) return;
              if (videoRef.current && videoRef.current.readyState >= 2 && !isProcessing) {
                try {
                  isProcessing = true;
                  await activeHands.send({ image: videoRef.current });
                } catch (e) {
                  isProcessing = false;
                  console.error("Hands send error:", e);
                }
              }
            },
            width: 640,
            height: 480,
          });
          activeCamera = camera;
          await camera.start();
          setState(prev => ({ ...prev, error: null }));
        }
      } catch (err) {
        if (isTerminated) return;
        console.error("Camera error:", err);
        setState(prev => ({ 
          ...prev, 
          error: err instanceof Error ? err.name : "Onbekende machtigingsfout" 
        }));
      }
    };

    startCamera();

    return () => {
      isTerminated = true;
      activeCamera?.stop();
      activeHands?.close();
      handsRef.current = null;
    };
  }, []);

  return (
    <GestureContext.Provider value={state}>
      <video ref={videoRef} className="hidden" playsInline muted />
      {children}
    </GestureContext.Provider>
  );
};
