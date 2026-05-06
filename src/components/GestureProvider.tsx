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

  const startCamera = async () => {
    try {
      // Test direct media access first for better error catching
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((results: Results) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          const indexTip = landmarks[8];
          const thumbTip = landmarks[4];
          const thumbMCP = landmarks[2];
          const thumbIP = landmarks[3];

          const x = 1 - indexTip.x;
          const y = indexTip.y;

          const dist = Math.sqrt(
            Math.pow(indexTip.x - thumbTip.x, 2) + Math.pow(indexTip.y - thumbTip.y, 2)
          );
          const isPinching = dist < 0.05;

          const isThumbUp = thumbTip.y < thumbIP.y && thumbTip.y < thumbMCP.y && 
                            thumbTip.y < landmarks[8].y && thumbTip.y < landmarks[12].y;

          setState(prev => ({ ...prev, x, y, isPinching, isThumbUp, isVisible: true, error: null }));
        } else {
          setState(prev => ({ ...prev, isVisible: false }));
        }
      });

      handsRef.current = hands;

      if (videoRef.current) {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });
        await camera.start();
        setState(prev => ({ ...prev, error: null }));
      }
    } catch (err) {
      console.error("Camera error:", err);
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.name : "Unknown permission error" 
      }));
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      handsRef.current?.close();
    };
  }, []);

  return (
    <GestureContext.Provider value={state}>
      <video ref={videoRef} className="hidden" playsInline muted />
      {children}
    </GestureContext.Provider>
  );
};
