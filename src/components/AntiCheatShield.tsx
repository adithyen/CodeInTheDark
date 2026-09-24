'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AlertTriangle, ShieldAlert, Maximize2, Lock } from 'lucide-react';

interface AntiCheatShieldProps {
  participantId: string;
  participantName: string;
  rollNumber: string;
  terminalId: string;
  strikes: number;
  isLockedOut: boolean;
  onStrikeRecorded: (newStrikes: number, isLockedOut: boolean) => void;
  enabled?: boolean;
}

export default function AntiCheatShield({
  participantId,
  participantName,
  rollNumber,
  terminalId,
  strikes,
  isLockedOut,
  onStrikeRecorded,
  enabled = true,
}: AntiCheatShieldProps) {
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningReason, setWarningReason] = useState('');
  const [countdown, setCountdown] = useState(10);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Synthesize warning beep using Web Audio API
  const playAlertSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio autoplay restrictions fallback
    }
  }, []);

  // Report violation to backend
  const reportViolation = useCallback(
    async (type: 'fullscreen_exit' | 'tab_blur' | 'devtools_attempt' | 'clipboard_attempt', details: string) => {
      if (!enabled || isLockedOut) return;

      playAlertSound();
      try {
        const res = await fetch('/api/violations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId, type, details }),
        });
        const data = await res.json();
        if (data.success) {
          onStrikeRecorded(data.strikes, data.isLockedOut);
        }
      } catch (err) {
        console.error('Failed to report violation:', err);
      }
    },
    [enabled, isLockedOut, participantId, playAlertSound, onStrikeRecorded]
  );

  // Request fullscreen
  const requestFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setShowWarningModal(false);
      setIsFullscreen(true);
    } catch {
      // Ignore
    }
  }, []);

  // Listeners for Fullscreen, Tab Switch, DevTools, and Clipboard
  useEffect(() => {
    if (!enabled) return;

    // 1. Fullscreen Change Listener
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) {
        setShowWarningModal(true);
        setWarningReason('Fullscreen mode was exited. Code In The Dark requires full screen presentation.');
        setCountdown(10);
        reportViolation('fullscreen_exit', 'Participant exited fullscreen mode');
      } else {
        setShowWarningModal(false);
      }
    };

    // 2. Visibility & Focus Listener (Tab switch / Alt-Tab)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setShowWarningModal(true);
        setWarningReason('Tab switch or window blur detected. Leaving the arena is strictly prohibited.');
        setCountdown(10);
        reportViolation('tab_blur', 'Tab switch or window minimized');
      }
    };

    const handleWindowBlur = () => {
      setShowWarningModal(true);
      setWarningReason('Window lost focus. External applications are prohibited.');
      setCountdown(10);
      reportViolation('tab_blur', 'Window focus lost');
    };

    // 3. DevTools & Key Shortcut Shields
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12, Ctrl+Shift+I/C/J, Ctrl+U, Ctrl+S
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'C', 'c', 'J', 'j'].includes(e.key)) ||
        (e.ctrlKey && ['u', 'U', 's', 'S', 'p', 'P'].includes(e.key))
      ) {
        e.preventDefault();
        reportViolation('devtools_attempt', `Blocked devtools key combination: ${e.key}`);
      }
    };

    // 4. Clipboard Block inside Arena
    const handleCopyCutPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation('clipboard_attempt', `Clipboard ${e.type} blocked`);
    };

    // 5. Context Menu (Right Click) Block
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopyCutPaste);
    document.addEventListener('cut', handleCopyCutPaste);
    document.addEventListener('paste', handleCopyCutPaste);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopyCutPaste);
      document.removeEventListener('cut', handleCopyCutPaste);
      document.removeEventListener('paste', handleCopyCutPaste);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [enabled, reportViolation]);

  // Warning modal countdown timer
  useEffect(() => {
    if (!showWarningModal || isFullscreen) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [showWarningModal, isFullscreen]);

  return (
    <>
      {/* Dynamic Floating Watermark Matrix to Deter Smartphone Photos */}
      <div
        className="pointer-events-none fixed inset-0 z-40 select-none overflow-hidden opacity-[0.06] mix-blend-screen"
        aria-hidden="true"
      >
        <div className="grid h-full w-full grid-cols-3 grid-rows-4 gap-12 p-8 text-center">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div
              key={idx}
              className="flex -rotate-12 flex-col items-center justify-center font-mono text-xs text-white"
            >
              <span>{participantName}</span>
              <span>{rollNumber} · {terminalId}</span>
              <span>11:11 CODE IN THE DARK</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lockout Screen on Strike 3 */}
      {isLockedOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-6 backdrop-blur-xl">
          <div className="max-w-md rounded-2xl border border-red-500/50 bg-red-950/40 p-8 text-center shadow-2xl shadow-red-500/20">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-400">
              <Lock className="h-8 w-8" />
            </div>
            <h2 className="mb-2 font-mono text-2xl font-bold tracking-tight text-red-400">
              TERMINAL LOCKED OUT
            </h2>
            <p className="mb-4 text-sm text-gray-300">
              You have accumulated 3 anti-cheat strikes (fullscreen exit, tab switches, or prohibited shortcuts).
            </p>
            <div className="rounded-lg bg-black/50 p-3 font-mono text-xs text-red-300">
              Candidate: {participantName} ({rollNumber})<br />
              Status: Disqualification Pending Admin Review
            </div>
          </div>
        </div>
      )}

      {/* Warning Alert Modal on Fullscreen Exit or Tab Switch */}
      {showWarningModal && !isLockedOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-md">
          <div className="max-w-md rounded-2xl border border-amber-500/50 bg-[#121824] p-6 text-center shadow-2xl shadow-amber-500/20">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              <ShieldAlert className="h-7 w-7 animate-pulse" />
            </div>
            <h3 className="mb-1 font-mono text-xl font-bold text-amber-400">
              ANTI-CHEAT WARNING
            </h3>
            <p className="mb-3 text-sm text-gray-300">{warningReason}</p>
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-950/30 p-2.5 font-mono text-xs text-amber-200">
              Strikes: <span className="font-bold text-red-400">{strikes} / 3</span>
              {strikes >= 2 && ' · CRITICAL: Next strike locks your terminal!'}
            </div>
            <button
              onClick={requestFullscreen}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 font-mono text-sm font-semibold text-black shadow-lg shadow-emerald-500/25 transition-all hover:brightness-110 active:scale-95"
            >
              <Maximize2 className="h-4 w-4" />
              Re-Enter Fullscreen Arena
            </button>
          </div>
        </div>
      )}
    </>
  );
}
