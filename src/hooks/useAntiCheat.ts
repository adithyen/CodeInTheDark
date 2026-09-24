'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type ViolationType = 
  | 'fullscreen_exit'
  | 'tab_blur'
  | 'window_leave'
  | 'devtools_attempt'
  | 'clipboard_attempt'
  | 'keystroke_anomaly';

interface UseAntiCheatOptions {
  participantId: string;
  initialStrikes?: number;
  initialLockedOut?: boolean;
  maxStrikes?: number;
  enabled?: boolean;
  onViolation?: (type: ViolationType, details: string) => void;
  onStrikeUpdate?: (strikes: number, isLockedOut: boolean) => void;
}

export function useAntiCheat({
  participantId,
  initialStrikes = 0,
  initialLockedOut = false,
  maxStrikes = 3,
  enabled = true,
  onViolation,
  onStrikeUpdate,
}: UseAntiCheatOptions) {
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [strikes, setStrikes] = useState(initialStrikes);
  const [isLockedOut, setIsLockedOut] = useState(initialLockedOut);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [countdown, setCountdown] = useState(10);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastKeyTimeRef = useRef<number>(Date.now());
  const keyBurstCountRef = useRef<number>(0);

  // Synthesize alarm sound using Web Audio API
  const triggerAlarmSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      // Dual-tone buzzer
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(320, ctx.currentTime);
      osc2.frequency.setValueAtTime(640, ctx.currentTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.4);
      osc2.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  // Dispatch violation to backend
  const logViolation = useCallback(
    async (type: ViolationType, details: string) => {
      if (!enabled || isLockedOut) return;

      triggerAlarmSound();
      if (onViolation) onViolation(type, details);

      try {
        const res = await fetch('/api/violations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId, type, details }),
        });

        if (res.ok) {
          const data = await res.json();
          setStrikes(data.strikes);
          setIsLockedOut(data.isLockedOut);
          if (onStrikeUpdate) {
            onStrikeUpdate(data.strikes, data.isLockedOut);
          }
        }
      } catch (err) {
        console.error('Failed to log violation:', err);
      }
    },
    [enabled, isLockedOut, participantId, triggerAlarmSound, onViolation, onStrikeUpdate]
  );

  // Request Fullscreen
  const requestFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
      setWarningModalOpen(false);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // 1. Fullscreen Change Handler
    const onFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) {
        setWarningModalOpen(true);
        setWarningMessage('Fullscreen presentation mode was exited. Return immediately to avoid disqualification.');
        setCountdown(10);
        logViolation('fullscreen_exit', 'Participant exited fullscreen mode');
      } else {
        setWarningModalOpen(false);
      }
    };

    // 2. Visibility & Tab Blur Handler
    const onVisibilityChange = () => {
      if (document.hidden) {
        setWarningModalOpen(true);
        setWarningMessage('Tab switch or minimization detected. Switching windows is strictly forbidden.');
        setCountdown(10);
        logViolation('tab_blur', 'Document visibility hidden (tab switched)');
      }
    };

    const onBlur = () => {
      setWarningModalOpen(true);
      setWarningMessage('Window lost focus. External applications or secondary monitors are prohibited.');
      setCountdown(10);
      logViolation('tab_blur', 'Window blur event triggered');
    };

    // 3. Mouse Leave Boundary Detection
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        // Candidate cursor left screen (likely navigating to another monitor)
        logViolation('window_leave', 'Cursor left active screen boundary');
      }
    };

    // 4. Prohibited Shortcut Trap
    const onKeyDown = (e: KeyboardEvent) => {
      // Devtools shortcuts
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'C', 'c', 'J', 'j'].includes(e.key)) ||
        (e.metaKey && e.altKey && ['I', 'i', 'C', 'c', 'J', 'j'].includes(e.key)) ||
        (e.ctrlKey && ['u', 'U', 's', 'S', 'p', 'P'].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        logViolation('devtools_attempt', `Blocked devtools shortcut: ${e.key}`);
      }

      // Keystroke velocity anomaly detection (detect macro burst pasting)
      const now = Date.now();
      const delta = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (delta < 25) {
        keyBurstCountRef.current++;
        if (keyBurstCountRef.current > 40) {
          logViolation('keystroke_anomaly', 'Unnatural high-speed keystroke insertion detected (macro/tool burst)');
          keyBurstCountRef.current = 0;
        }
      } else {
        keyBurstCountRef.current = 0;
      }
    };

    // 5. Clipboard Trap
    const onClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      logViolation('clipboard_attempt', `Blocked ${e.type} operation`);
    };

    // 6. Context Menu Trap
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 7. Devtools Dimension Inspector
    const checkDevToolsDimensions = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        logViolation('devtools_attempt', 'Devtools panel dock detected via viewport delta');
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    document.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('copy', onClipboard);
    document.addEventListener('cut', onClipboard);
    document.addEventListener('paste', onClipboard);
    document.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('resize', checkDevToolsDimensions);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('copy', onClipboard);
      document.removeEventListener('cut', onClipboard);
      document.removeEventListener('paste', onClipboard);
      document.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('resize', checkDevToolsDimensions);
    };
  }, [enabled, logViolation]);

  // Countdown timer when warning modal is active
  useEffect(() => {
    if (!warningModalOpen || isFullscreen) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [warningModalOpen, isFullscreen]);

  return {
    isFullscreen,
    strikes,
    isLockedOut,
    warningModalOpen,
    warningMessage,
    countdown,
    requestFullscreen,
    dismissWarning: () => setWarningModalOpen(false),
  };
}
