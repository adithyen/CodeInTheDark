'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Clock, PauseCircle, AlertTriangle } from 'lucide-react';

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
  const hasExpiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  // Keep callback ref fresh without retriggering effects
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    if (!endTime) {
      setTimeLeftMs(0);
      hasExpiredRef.current = false;
      return;
    }

    // Reset expire guard whenever endTime changes
    hasExpiredRef.current = false;

    const tick = () => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeftMs(remaining);

      if (remaining === 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpireRef.current?.();
      }
    };

    tick(); // immediate first render
    const interval = setInterval(tick, 500); // 500ms for smoother display
    return () => clearInterval(interval);
  }, [endTime]); // ← intentionally omit isPaused and onExpire from deps

  // When paused, calculate remaining at pause time (don't run down)
  const displayMs = isPaused ? timeLeftMs : timeLeftMs;

  const totalSeconds = Math.floor(displayMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const isLowTime = !isPaused && totalSeconds > 0 && totalSeconds < 300;
  const isCritical = !isPaused && totalSeconds > 0 && totalSeconds < 60;

  const timeStr = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-xl border px-3.5 py-1.5 font-nautical-mono text-sm backdrop-blur-md transition-all shadow-md ${
        !endTime
          ? 'border-[#a68a56]/30 bg-[#0c0906] text-[#6b5535]'
          : isPaused
          ? 'border-[#a68a56]/50 bg-[#1c160e]/90 text-[#f3d38c]'
          : isCritical
          ? 'animate-pulse border-red-500/70 bg-red-950/40 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
          : isLowTime
          ? 'border-amber-500/60 bg-amber-950/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
          : 'border-[#d4af37]/40 bg-[#1c160e]/85 text-[#f3d38c] shadow-[0_0_15px_rgba(212,175,55,0.15)]'
      } ${className}`}
      title="Synchronized Voyage Chronometer"
    >
      {!endTime ? (
        <Clock className="h-4 w-4 text-[#6b5535]" />
      ) : isPaused ? (
        <PauseCircle className="h-4 w-4 text-[#d4af37]" />
      ) : isCritical ? (
        <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse" />
      ) : (
        <Clock className="h-4 w-4 text-[#d4af37]" />
      )}

      <span className="font-bold tracking-widest tabular-nums text-base">
        {endTime ? timeStr : '--:--'}
      </span>

      {isPaused && (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#a68a56]">
          [ANCHORED]
        </span>
      )}
    </div>
  );
}
