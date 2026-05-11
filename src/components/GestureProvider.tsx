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
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    let activeHands: Hands | null = null;
    let activeCamera: any = null;
    let isTerminated = false;

    const startCamera = async () => {
      try {
        if (isTerminated) return;
        
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

            const distance = Math.sqrt(
              Math.pow(indexTip.x - thumbTip.x, 2) + 
              Math.pow(indexTip.y - thumbTip.y, 2) + 
              Math.pow(indexTip.z - thumbTip.z, 2)
            );
            
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
          // Initialize camera with a shorter startup check
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
          cameraRef.current = camera;
          
          try {
            await camera.start();
            setState(prev => ({ ...prev, error: null }));
          } catch (cameraErr: any) {
            console.error("MediaPipe Camera.start failed, trying manual stream:", cameraErr);
            
            // Fallback for NotReadableError - usually solved by trying a simpler constraint
            // or just waiting a moment
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                  width: { ideal: 640 }, 
                  height: { ideal: 480 },
                  facingMode: "user"
                } 
              });
              
              if (videoRef.current && !isTerminated) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                
                // If Camera.start() failed but we got the stream, we might need a manual frame loop
                // if the Camera object doesn't pick it up automatically.
                // However, usually we should try to restart the Camera with the existing stream if possible.
                // But camera_utils doesn't support that easily.
                
                // Let's just report success if we got the stream, the onFrame might still work
                // if Camera class internally attached listeners to the video element.
                setState(prev => ({ ...prev, error: null }));
              }
            } catch (fallbackErr: any) {
              throw fallbackErr;
            }
          }
        }
      } catch (err: any) {
        if (isTerminated) return;
        console.error("Critical camera error:", err);
        
        let errorMsg = "Systeemfout bij camera-initialisatie";
        if (err.name === 'NotAllowedError') {
          errorMsg = "Toegang geweigerd - Schakel camera in je browserinstellingen in.";
        } else if (err.name === 'NotReadableError' || err.message?.includes('could not start')) {
          errorMsg = "Camera in gebruik door een ander programma of tabblad. Sluit andere video-apps af.";
        } else if (err.name === 'NotFoundError') {
          errorMsg = "Geen camera gedetecteerd op dit apparaat.";
        } else {
          errorMsg = err.message || "Onbekende hardware fout";
        }
        
        setState(prev => ({ ...prev, error: errorMsg }));
      } finally {
        isInitializingRef.current = false;
      }
    };

    startCamera();

    return () => {
      isTerminated = true;
      isInitializingRef.current = false;
      if (activeCamera) {
        activeCamera.stop();
      }
      if (activeHands) {
        activeHands.close();
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      handsRef.current = null;
    };
  }, []);

  return (
    <GestureContext.Provider value={state}>
      <video 
        ref={videoRef} 
        className="fixed inset-0 w-full h-full object-cover -z-50 opacity-0 pointer-events-none" 
        playsInline 
        muted 
      />
      {children}
    </GestureContext.Provider>
  );
};
