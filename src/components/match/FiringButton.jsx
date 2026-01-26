import { useState, useEffect, useRef } from 'react';
import './FiringButton.css';

export function FiringButton({ mode, onStart, onStop, totalSeconds }) {
  const [isPressed, setIsPressed] = useState(false);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const handleStart = (e) => {
    e.preventDefault();
    if (!isPressed) {
      setIsPressed(true);
      startTimeRef.current = Date.now();
      onStart(mode);

      // Update live display
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setLiveSeconds((Date.now() - startTimeRef.current) / 1000);
        }
      }, 100);
    }
  };

  const handleEnd = (e) => {
    e.preventDefault();
    if (isPressed) {
      setIsPressed(false);
      setLiveSeconds(0);
      clearInterval(intervalRef.current);
      startTimeRef.current = null;
      onStop();
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const displaySeconds = isPressed ? totalSeconds + liveSeconds : totalSeconds;

  return (
    <div className="firing-container">
      <button
        className={`firing-button ${isPressed ? 'active' : ''} ${mode}`}
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
      >
        <span className="firing-icon">🎯</span>
        <span className="firing-label">
          {isPressed ? 'FIRING!' : 'HOLD TO FIRE'}
        </span>
      </button>
      <div className="firing-stats">
        <span className="firing-time">{displaySeconds.toFixed(1)}s</span>
        <span className="firing-mode">{mode.toUpperCase()} firing time</span>
      </div>
    </div>
  );
}
