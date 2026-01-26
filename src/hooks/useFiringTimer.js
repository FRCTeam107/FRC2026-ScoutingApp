import { useState, useRef, useCallback } from 'react';

export function useFiringTimer() {
  const [autoSeconds, setAutoSeconds] = useState(0);
  const [teleopSeconds, setTeleopSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const startTimeRef = useRef(null);
  const currentModeRef = useRef('auto');

  const startFiring = useCallback((mode) => {
    if (!isActive) {
      startTimeRef.current = Date.now();
      currentModeRef.current = mode;
      setIsActive(true);

      // Haptic feedback on press
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  }, [isActive]);

  const stopFiring = useCallback(() => {
    if (isActive && startTimeRef.current) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;

      if (currentModeRef.current === 'auto') {
        setAutoSeconds(prev => Math.round((prev + elapsed) * 100) / 100);
      } else {
        setTeleopSeconds(prev => Math.round((prev + elapsed) * 100) / 100);
      }

      startTimeRef.current = null;
      setIsActive(false);

      // Haptic feedback on release
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
  }, [isActive]);

  const reset = useCallback(() => {
    setAutoSeconds(0);
    setTeleopSeconds(0);
    setIsActive(false);
    startTimeRef.current = null;
  }, []);

  return {
    autoSeconds,
    teleopSeconds,
    isActive,
    startFiring,
    stopFiring,
    reset
  };
}
