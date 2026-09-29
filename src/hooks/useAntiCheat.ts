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
  disableStrikes?: boolean;
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
  disableStrikes = false,
  onViolation,
  onStrikeUpdate,
}: UseAntiCheatOptions) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return !!document.fullscreenElement;
    }
    return false;
  });
  const [strikes, setStrikes] = useState(disableStrikes ? 0 : initialStrikes);
  const [isLockedOut, setIsLockedOut] = useState(disableStrikes ? false : initialLockedOut);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [countdown, setCountdown] = useState(10);
  const [hudWarning, setHudWarning] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastKeyTimeRef = useRef<number>(Date.now());
  const keyBurstCountRef = useRef<number>(0);
  const hudTimerRef = useRef<NodeJS.Timeout | null>(null);
  const disableStrikesRef = useRef<boolean>(Boolean(disableStrikes));
  const isSuspendedRef = useRef<boolean>(false);
  const lastViolationTimeRef = useRef<number>(0);

  useEffect(() => {
    disableStrikesRef.current = Boolean(disableStrikes);
  }, [disableStrikes]);

  // Sync initial strikes when props update
  useEffect(() => {
    if (disableStrikes) {
      setStrikes(0);
      setIsLockedOut(false);
      return;
    }
    if (initialStrikes > strikes) {
      setStrikes(initialStrikes);
    }
    if (initialLockedOut) {
      setIsLockedOut(true);
    }
  }, [disableStrikes, initialStrikes, initialLockedOut, strikes]);

  // Dedicated self-clearing effect for HUD warning banner (5-7 seconds: 6000ms)
  useEffect(() => {
    if (!hudWarning) return;
    const timer = setTimeout(() => {
      setHudWarning(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [hudWarning]);

  // Display ephemeral HUD warning banner on blocked keystroke / action
  const showHudWarning = useCallback((message: string) => {
    setHudWarning(message);
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
      // Dual-tone alarm buzzer
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

  // Dispatch violation to backend with strict single-incident deduplication & cooldown
  const logViolation = useCallback(
    async (type: ViolationType, details: string) => {
      if (!enabled) return;

      // ── Testing Mode: Anti-cheat strikes completely bypassed ────────
      if (disableStrikes) {
        if (onViolation) onViolation(type, details);
        return;
      }

      if (isLockedOut) return;

      const now = Date.now();

      // ── STRICT DEDUPLICATION & COOLDOWN (3.5 seconds) ───────────────
      // Prevents 0 -> 2/3 or 1 -> 3 strikes from simultaneous fullscreenchange + blur + visibilitychange events!
      if (isSuspendedRef.current || (now - lastViolationTimeRef.current < 3500)) {
        return;
      }

      lastViolationTimeRef.current = now;
      isSuspendedRef.current = true;

      triggerAlarmSound();
      if (onViolation) onViolation(type, details);

      // 1. Optimistic strike update (Strictly EXACTLY +1 strike per incident)
      setStrikes(prev => {
        const nextStrikes = Math.min(prev + 1, maxStrikes);
        const nextLocked = nextStrikes >= maxStrikes;
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
        } catch {}

        // 2. Dispatch to backend with current updated strikes
        fetch('/api/violations', {
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
        }).then(async res => {
          if (res.ok) {
            const data = await res.json();
            setStrikes(data.strikes);
            setIsLockedOut(data.isLockedOut);
            if (onStrikeUpdate) {
              onStrikeUpdate(data.strikes, data.isLockedOut);
            }
          }
        }).catch(err => {
          console.error('Failed to log violation to server:', err);
        });

        return nextStrikes;
      });
    },
    [enabled, disableStrikes, isLockedOut, maxStrikes, participantId, participantName, rollNumber, terminalId, triggerAlarmSound, onViolation, onStrikeUpdate]
  );

  // Request Fullscreen & Engage Chrome Keyboard Lock API
  const requestFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }

      // Engage modern Keyboard Lock API (supported in Chromium browsers) - Bypassed in testing mode
      if (!disableStrikesRef.current && 'keyboard' in navigator && (navigator as any).keyboard?.lock) {
        try {
          await (navigator as any).keyboard.lock([
            'Escape',
            'F11',
            'F1',
            'F2',
            'F3',
            'F4',
            'F5',
            'F6',
            'F7',
            'F8',
            'F9',
            'F10',
            'F12',
            'Tab',
            'AltLeft',
            'AltRight',
            'MetaLeft',
            'MetaRight',
            'ContextMenu',
          ]);
        } catch {
          // Keyboard Lock permission fallback
        }
      }

      // Reset suspension lock once re-entered
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (active) {
        isSuspendedRef.current = false;
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
    const initialFs = !!document.fullscreenElement;
    setIsFullscreen(initialFs);

    // 1. Fullscreen Change Handler (Bypassed in testing mode)
    const onFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) {
        if (!disableStrikesRef.current) {
          setWarningModalOpen(true);
          setWarningMessage('Fullscreen presentation mode was exited. Arena is frozen. Re-enter fullscreen to continue.');
          setCountdown(10);
          logViolation('fullscreen_exit', 'Participant exited fullscreen mode');
        }
      } else {
        isSuspendedRef.current = false;
        setWarningModalOpen(false);
      }
    };

    // 2. Visibility & Tab Blur Handler (Bypassed in testing mode to allow Alt+Tab)
    const onVisibilityChange = () => {
      if (disableStrikesRef.current) return;
      if (document.hidden) {
        setWarningModalOpen(true);
        setWarningMessage('Tab switch or minimization detected. Switching windows or opening external apps is prohibited.');
        setCountdown(10);
        logViolation('tab_blur', 'Document visibility hidden (tab switched/minimized)');
      }
    };

    const onBlur = () => {
      if (disableStrikesRef.current) return;
      setWarningModalOpen(true);
      setWarningMessage('Window lost focus. External overlay tools, screen capture apps, or secondary monitors are prohibited.');
      setCountdown(10);
      logViolation('tab_blur', 'Window blur event (focus lost to external app/overlay)');
    };

    // 3. Mouse Leave Screen Boundary (Warn with HUD banner, no direct strike to avoid accidental edges)
    const onMouseLeave = (e: MouseEvent) => {
      if (disableStrikesRef.current) return;
      if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        showHudWarning('⚠️ Please keep your cursor within the active exam sanctuary.');
      }
    };

    // 4. Pre-emptive Keystroke Lockdown in Capture Phase
    const onKeyDown = (e: KeyboardEvent) => {
      // In Testing Mode (disableStrikes), allow full freedom: F11 fullscreen toggle, Alt+Tab, Escape, shortcuts, etc.
      if (disableStrikesRef.current) {
        return;
      }

      // 0. ABSOLUTE TYPING FREEZE: If NOT in fullscreen, block all keystrokes completely!
      if (!document.fullscreenElement) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showHudWarning('⛔ All typing is frozen. You must be in Fullscreen Presentation Mode to code.');
        return false;
      }

      // A. Trap F11 (Browser Fullscreen Toggle) - Warning only, NO STRIKE
      if (e.key === 'F11' || e.code === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showHudWarning('⚠️ F11 Fullscreen toggle is disabled. Presentation mode is locked.');
        return false;
      }

      // B. Trap Escape Key - Warning only, NO STRIKE
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showHudWarning('⚠️ Escape key is disabled. Presentation mode is locked.');
        return false;
      }

      // C. Trap All Function Keys F1 - F12 - Warning only, NO STRIKE!
      if (e.key.startsWith('F') && /^F([1-9]|1[0-2])$/.test(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showHudWarning(`⚠️ Function key ${e.key} is disabled in the Arena.`);
        return false;
      }

      // D. Trap Devtools & Browser Navigation Shortcuts - Pre-emptive Block
      if (
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'C', 'c', 'J', 'j', 'K', 'k', 'N', 'n', 'P', 'p', 'Delete', 'Escape'].includes(e.key)) ||
        (e.metaKey && e.altKey && ['I', 'i', 'C', 'c', 'J', 'j', 'K', 'k', 'U', 'u'].includes(e.key)) ||
        (e.ctrlKey && ['u', 'U', 'r', 'R', 'p', 'P', 't', 'T', 'n', 'N', 'w', 'W', 'q', 'Q', 'h', 'H', 'j', 'J', 's', 'S', 'o', 'O', 'g', 'G', 'f', 'F'].includes(e.key)) ||
        (e.altKey && ['ArrowLeft', 'ArrowRight', 'Home', 'F4'].includes(e.key)) ||
        (e.key === 'ContextMenu')
      ) {
        // Allow Ctrl+S solely for cloud save (handled elsewhere in arena), but block default browser save page!
        if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
          e.preventDefault();
          return;
        }
        // Allow Ctrl+Enter for preview confirmation (handled in arena)
        if (e.ctrlKey && e.key === 'Enter') {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showHudWarning(`⚠️ System shortcut (${e.ctrlKey ? 'Ctrl+' : e.altKey ? 'Alt+' : ''}${e.key}) is prohibited.`);
        return false;
      }

      // E. Trap Clipboard Shortcuts (Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A) - Allowed when disableStrikes is true
      if (!disableStrikesRef.current && (e.ctrlKey || e.metaKey) && ['c', 'C', 'v', 'V', 'x', 'X'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showHudWarning(`⚠️ Clipboard shortcut (Ctrl+${e.key.toUpperCase()}) is disabled.`);
        return false;
      }

      // F. Keystroke velocity anomaly detection (detect macro burst insertion) - Bypassed in testing mode
      if (!disableStrikesRef.current) {
        const now = Date.now();
        const delta = now - lastKeyTimeRef.current;
        lastKeyTimeRef.current = now;

        if (delta < 20) {
          keyBurstCountRef.current++;
          if (keyBurstCountRef.current > 45) {
            logViolation('keystroke_anomaly', 'Unnatural high-speed keystroke insertion detected (macro/tool burst)');
            keyBurstCountRef.current = 0;
          }
        } else {
          keyBurstCountRef.current = 0;
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (disableStrikesRef.current) return;
      if (!document.fullscreenElement || e.key === 'F11' || e.key === 'Escape' || (e.key.startsWith('F') && /^F([1-9]|1[0-2])$/.test(e.key))) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    // 5. Native Clipboard Event Traps (Allowed when disableStrikes is true)
    const onClipboard = (e: ClipboardEvent) => {
      if (disableStrikesRef.current) return;
      e.preventDefault();
      showHudWarning(`⚠️ Clipboard ${e.type} operation is prohibited.`);
    };

    // 6. Context Menu Trap (Allowed when disableStrikes is true)
    const onContextMenu = (e: MouseEvent) => {
      if (disableStrikesRef.current) return;
      e.preventDefault();
      showHudWarning('⚠️ Right-click context menu is disabled.');
    };

    // 7. Drag & Drop Injection Trap (Prevent dragging code/text into the arena)
    const onDragDrop = (e: DragEvent) => {
      if (disableStrikesRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      showHudWarning('⚠️ Drag and drop code insertion is prohibited.');
    };

    // 8. Devtools Dimension Inspector (Detect docked devtools panels)
    const checkDevToolsDimensions = () => {
      if (disableStrikesRef.current) return;
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
    
    // Drag and Drop Traps
    window.addEventListener('dragover', onDragDrop, { capture: true });
    window.addEventListener('dragenter', onDragDrop, { capture: true });
    window.addEventListener('drop', onDragDrop, { capture: true });

    // CAPTURE PHASE for keydown and keyup to intercept BEFORE editor or browser handles them!
    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    document.addEventListener('copy', onClipboard, { capture: true });
    document.addEventListener('cut', onClipboard, { capture: true });
    document.addEventListener('paste', onClipboard, { capture: true });
    document.addEventListener('contextmenu', onContextMenu, { capture: true });
    window.addEventListener('resize', checkDevToolsDimensions);

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
      window.removeEventListener('dragover', onDragDrop, { capture: true });
      window.removeEventListener('dragenter', onDragDrop, { capture: true });
      window.removeEventListener('drop', onDragDrop, { capture: true });
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('keyup', onKeyUp, { capture: true });
      document.removeEventListener('copy', onClipboard, { capture: true });
      document.removeEventListener('cut', onClipboard, { capture: true });
      document.removeEventListener('paste', onClipboard, { capture: true });
      document.removeEventListener('contextmenu', onContextMenu, { capture: true });
      window.removeEventListener('resize', checkDevToolsDimensions);
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    };
  }, [enabled, disableStrikes, logViolation, showHudWarning]);

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
    disableStrikes: Boolean(disableStrikes),
    warningModalOpen,
    warningMessage,
    countdown,
    hudWarning,
    requestFullscreen,
    dismissWarning: () => {
      isSuspendedRef.current = false;
      setWarningModalOpen(false);
    },
  };
}
