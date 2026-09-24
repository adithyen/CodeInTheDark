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
  participantName?: string;
  rollNumber?: string;
  terminalId?: string;
  initialStrikes?: number;
  initialLockedOut?: boolean;
  maxStrikes?: number;
  enabled?: boolean;
  onViolation?: (type: ViolationType, details: string) => void;
  onStrikeUpdate?: (strikes: number, isLockedOut: boolean) => void;
}

export function useAntiCheat({
  participantId,
  participantName = 'Participant',
  rollNumber = 'UNKNOWN',
  terminalId = 'NODE-1',
  initialStrikes = 0,
  initialLockedOut = false,
  maxStrikes = 3,
  enabled = true,
  onViolation,
  onStrikeUpdate,
}: UseAntiCheatOptions) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return !!document.fullscreenElement;
    }
    return false;
  });
  const [strikes, setStrikes] = useState(initialStrikes);
  const [isLockedOut, setIsLockedOut] = useState(initialLockedOut);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [countdown, setCountdown] = useState(10);
  const [hudWarning, setHudWarning] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastKeyTimeRef = useRef<number>(Date.now());
  const keyBurstCountRef = useRef<number>(0);
  const hudTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync initial strikes when props update
  useEffect(() => {
    if (initialStrikes > strikes) {
      setStrikes(initialStrikes);
    }
    if (initialLockedOut) {
      setIsLockedOut(true);
    }
  }, [initialStrikes, initialLockedOut, strikes]);

  // Display ephemeral HUD warning banner on blocked keystroke
  const showHudWarning = useCallback((message: string) => {
    setHudWarning(message);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => {
      setHudWarning(null);
    }, 2800);
  }, []);

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
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.45);
      osc2.stop(ctx.currentTime + 0.45);
    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  // Dispatch violation to backend with instant optimistic client update
  const logViolation = useCallback(
    async (type: ViolationType, details: string) => {
      if (!enabled || isLockedOut) return;

      triggerAlarmSound();
      if (onViolation) onViolation(type, details);

      // 1. Optimistic strike update (Instant UI feedback, zero network delay)
      const nextStrikes = Math.min(strikes + 1, maxStrikes);
      const nextLocked = nextStrikes >= maxStrikes;
      setStrikes(nextStrikes);
      setIsLockedOut(nextLocked);
      if (onStrikeUpdate) {
        onStrikeUpdate(nextStrikes, nextLocked);
      }

      // Persist in localStorage immediately
      try {
        const saved = localStorage.getItem('cid_participant');
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.strikes = nextStrikes;
          parsed.isLockedOut = nextLocked;
          localStorage.setItem('cid_participant', JSON.stringify(parsed));
        }
      } catch {
        // LocalStorage fallback
      }

      // 2. Dispatch to backend with full self-hydrating payload
      try {
        const res = await fetch('/api/violations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId,
            name: participantName,
            rollNumber,
            terminalId,
            type,
            details,
            currentStrikes: nextStrikes,
          }),
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
        console.error('Failed to log violation to server:', err);
      }
    },
    [enabled, isLockedOut, strikes, maxStrikes, participantId, participantName, rollNumber, terminalId, triggerAlarmSound, onViolation, onStrikeUpdate]
  );

  // Request Fullscreen & Engage Chrome Keyboard Lock API
  const requestFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }

      // Engage modern Keyboard Lock API (supported in Chromium browsers)
      if ('keyboard' in navigator && (navigator as any).keyboard?.lock) {
        try {
          await (navigator as any).keyboard.lock([
            'Escape',
            'F11',
            'F1',
            'F3',
            'F5',
            'F12',
            'Tab',
            'AltLeft',
            'AltRight',
          ]);
        } catch {
          // Keyboard Lock permission fallback
        }
      }

      // STRICT CHECK: Only mark fullscreen if document.fullscreenElement is actually present!
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (active) {
        setWarningModalOpen(false);
      }
    } catch (err) {
      console.warn('Fullscreen entry rejected or cancelled:', err);
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Check initial fullscreen status
    setIsFullscreen(!!document.fullscreenElement);

    // 1. Fullscreen Change Handler
    const onFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) {
        setWarningModalOpen(true);
        setWarningMessage('Fullscreen presentation mode was exited. Arena is frozen. Re-enter fullscreen to continue.');
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

    // 3. Mouse Leave Screen Boundary
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        logViolation('window_leave', 'Cursor left active screen boundary');
      }
    };

    // 4. Pre-emptive Keystroke Lockdown in Capture Phase
    const onKeyDown = (e: KeyboardEvent) => {
      // 0. ABSOLUTE TYPING FREEZE: If NOT in fullscreen, block all keystrokes completely!
      if (!document.fullscreenElement) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showHudWarning('⛔ All typing is frozen. You must be in Fullscreen Presentation Mode to code.');
        return false;
      }

      // A. Trap F11 (Browser Fullscreen Toggle)
      if (e.key === 'F11' || e.code === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showHudWarning('⚠️ F11 Fullscreen toggle is blocked. Presentation mode is locked.');
        return false;
      }

      // B. Trap Escape Key
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showHudWarning('⚠️ Escape key is blocked. Exiting fullscreen will trigger disqualification.');
        return false;
      }

      // C. Trap All Function Keys F1 - F12
      if (e.key.startsWith('F') && /^F([1-9]|1[0-2])$/.test(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showHudWarning(`⚠️ Function key ${e.key} is disabled in the Arena.`);
        logViolation('devtools_attempt', `Blocked function key: ${e.key}`);
        return false;
      }

      // D. Trap Devtools shortcuts (Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+R, Ctrl+T, Ctrl+W)
      if (
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'C', 'c', 'J', 'j', 'K', 'k'].includes(e.key)) ||
        (e.metaKey && e.altKey && ['I', 'i', 'C', 'c', 'J', 'j', 'K', 'k'].includes(e.key)) ||
        (e.ctrlKey && ['u', 'U', 'r', 'R', 'p', 'P', 't', 'T', 'n', 'N', 'w', 'W', 'q', 'Q', 'h', 'H'].includes(e.key)) ||
        (e.altKey && ['ArrowLeft', 'ArrowRight', 'Home'].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showHudWarning(`⚠️ System shortcut (${e.ctrlKey ? 'Ctrl+' : ''}${e.key}) is prohibited.`);
        logViolation('devtools_attempt', `Blocked browser shortcut attempt: ${e.key}`);
        return false;
      }

      // E. Trap Clipboard Shortcuts (Ctrl+C, Ctrl+V, Ctrl+X)
      if ((e.ctrlKey || e.metaKey) && ['c', 'C', 'v', 'V', 'x', 'X'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showHudWarning(`⚠️ Clipboard shortcut (Ctrl+${e.key.toUpperCase()}) is disabled.`);
        logViolation('clipboard_attempt', `Blocked clipboard key combination: Ctrl+${e.key.toUpperCase()}`);
        return false;
      }

      // F. Keystroke velocity anomaly detection (detect macro burst insertion)
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

    const onKeyUp = (e: KeyboardEvent) => {
      if (!document.fullscreenElement || e.key === 'F11' || e.key === 'Escape' || (e.key.startsWith('F') && /^F([1-9]|1[0-2])$/.test(e.key))) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    // 5. Native Clipboard Event Traps
    const onClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      showHudWarning(`⚠️ Clipboard ${e.type} operation is prohibited.`);
      logViolation('clipboard_attempt', `Blocked ${e.type} operation`);
    };

    // 6. Context Menu Trap
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showHudWarning('⚠️ Right-click context menu is disabled.');
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
    
    // CAPTURE PHASE for keydown and keyup to intercept BEFORE editor or browser handles them!
    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    document.addEventListener('copy', onClipboard, { capture: true });
    document.addEventListener('cut', onClipboard, { capture: true });
    document.addEventListener('paste', onClipboard, { capture: true });
    document.addEventListener('contextmenu', onContextMenu, { capture: true });
    // Continuous synchronization to guarantee isFullscreen is 100% accurate to document.fullscreenElement
    const syncInterval = setInterval(() => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
    }, 250);

    return () => {
      clearInterval(syncInterval);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('keyup', onKeyUp, { capture: true });
      document.removeEventListener('copy', onClipboard, { capture: true });
      document.removeEventListener('cut', onClipboard, { capture: true });
      document.removeEventListener('paste', onClipboard, { capture: true });
      document.removeEventListener('contextmenu', onContextMenu, { capture: true });
      window.removeEventListener('resize', checkDevToolsDimensions);
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    };
  }, [enabled, logViolation, showHudWarning]);

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
    hudWarning,
    requestFullscreen,
    dismissWarning: () => setWarningModalOpen(false),
  };
}
