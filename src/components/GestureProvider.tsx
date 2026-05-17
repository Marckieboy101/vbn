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
  retry: () => void;
}

const GestureContext = createContext<GestureState>({ 
  x: 0.5, 
  y: 0.5, 
  isPinching: false, 
  isThumbUp: false, 
  isVisible: false,
  error: null,
  retry: () => {}
});

export const useGesture = () => useContext(GestureContext);

export const GestureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<Omit<GestureState, 'retry'>>({ 
    x: 0.5, 
    y: 0.5, 
    isPinching: false, 
    isThumbUp: false, 
    isVisible: false,
    error: null 
  });
  const [retryCount, setRetryCount] = useState(0);
  
  const retry = () => setRetryCount(prev => prev + 1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    
    // Explicitly reset error and visibility on mount/retry
    setState(prev => ({ ...prev, error: null, isVisible: false }));

    let activeHands: Hands | null = null;
    let activeCamera: any = null;
    let isTerminated = false;

    const startCamera = async (isRetry = false) => {
      try {
        if (isTerminated) return;
        
        // Small delay for initial start to let browser settle
        if (!isRetry) await new Promise(resolve => setTimeout(resolve, 500));

        // Thorough cleanup of existing state before starting a new instance
        if (activeCamera) {
          try { activeCamera.stop(); } catch (e) {}
          activeCamera = null;
        }
        if (activeHands) {
          try { activeHands.close(); } catch (e) {}
          activeHands = null;
        }

        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => {
            track.stop();
            console.log("Cleanup: Stopped existing track:", track.label);
          });
          videoRef.current.srcObject = null;
        }

        // Additional thorough cleanup of any "orphaned" media devices
        try {
          const streams = await navigator.mediaDevices.enumerateDevices();
          console.log("Detected devices:", streams.length);
        } catch (e) {
          console.warn("Device enumeration failed, proceeding anyway");
        }

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
            console.warn("MediaPipe Camera.start failed, attempting simplified fallback:", cameraErr);
            
            // Fallback strategy: try getUserMedia with minimal constraints
            try {
              // First try with some preferences
              const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                  facingMode: "user",
                  width: { ideal: 640 },
                  height: { ideal: 480 }
                } 
              }).catch(() => {
                // If that fails, try REALLY minimal
                console.log("Ideal constraints failed, trying absolute minimum");
                return navigator.mediaDevices.getUserMedia({ video: true });
              });
              
              if (videoRef.current && !isTerminated) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setState(prev => ({ ...prev, error: null }));
              }
            } catch (fallbackErr: any) {
              console.error("All camera fallback attempts failed:", fallbackErr);
              
              // If we haven't retried yet and it's a NotReadableError, try once more after a delay
              if (!isRetry && (fallbackErr.name === 'NotReadableError' || cameraErr.name === 'NotReadableError')) {
                console.log("NotReadableError detected, attempting single retry after 2s...");
                setTimeout(() => startCamera(true), 2000);
                return;
              }
              
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
          errorMsg = "De camera lijkt geblokkeerd of in gebruik door een ander tabblad/programma (zoals Teams of Zoom). Sluit andere video-apps en ververs de pagina.";
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
  }, [retryCount]);

  return (
    <GestureContext.Provider value={{ ...state, retry }}>
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
