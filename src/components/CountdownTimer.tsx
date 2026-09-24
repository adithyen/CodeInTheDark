'use client';

import React, { useEffect, useState } from 'react';
import { Clock, PauseCircle, AlertCircle } from 'lucide-react';

interface CountdownTimerProps {
  endTime: number | null;
  isPaused?: boolean;
  onExpire?: () => void;
  className?: string;
}

export default function CountdownTimer({
  endTime,
  isPaused = false,
  onExpire,
  className = '',
}: CountdownTimerProps) {
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);

  useEffect(() => {
    if (!endTime) {
      setTimeLeftMs(0);
      return;
    }

    const updateTimer = () => {
      if (isPaused) return;
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeftMs(remaining);

      if (remaining === 0 && onExpire) {
        onExpire();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTime, isPaused, onExpire]);

  const totalSeconds = Math.floor(timeLeftMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const isLowTime = minutes < 5 && endTime !== null;
  const isCritical = minutes < 1 && endTime !== null;

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-xl border px-3.5 py-1.5 font-mono text-sm backdrop-blur-md transition-all ${
        isPaused
          ? 'border-amber-500/40 bg-amber-950/20 text-amber-300'
          : isCritical
          ? 'animate-pulse border-red-500/60 bg-red-950/30 text-red-400 shadow-lg shadow-red-500/20'
          : isLowTime
          ? 'border-amber-500/50 bg-amber-950/20 text-amber-400'
          : 'border-cyan-500/30 bg-[#0c1420]/80 text-cyan-300'
      } ${className}`}
    >
      {isPaused ? (
        <PauseCircle className="h-4 w-4 animate-spin text-amber-400" />
      ) : isCritical ? (
        <AlertCircle className="h-4 w-4 text-red-400" />
      ) : (
        <Clock className="h-4 w-4 text-cyan-400" />
      )}

      <span className="font-bold tracking-wider">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>

      {isPaused && <span className="text-[11px] font-normal uppercase text-amber-400/80">(Paused)</span>}
    </div>
  );
}
