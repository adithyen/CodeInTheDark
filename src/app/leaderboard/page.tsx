'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  Medal, 
  Flame, 
  ShieldAlert, 
  Sparkles, 
  Maximize, 
  Minimize, 
  RefreshCw, 
  CheckCircle2, 
  Clock,
  Volume2,
  VolumeX,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Crown,
  Megaphone,
  Eye,
  EyeOff
} from 'lucide-react';
import { LeaderboardEntry, ContestState } from '@/types';

// Web Audio API Synthesizers for Zero-Asset Reliability
function playAudioTone(freq1: number, freq2: number, duration: number, type: OscillatorType = 'sawtooth') {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;
    const ctx = new AudioCtxClass();
    if (ctx.state === 'suspended') ctx.resume();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = type;
    osc1.frequency.setValueAtTime(freq1, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(freq1 * 0.6, ctx.currentTime + duration);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(freq2, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(freq2 * 0.6, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + duration);
    osc2.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error('Audio tone error:', e);
  }
}

function playVictoryFanfare() {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;
    const ctx = new AudioCtxClass();
    if (ctx.state === 'suspended') ctx.resume();

    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
      gain.gain.setValueAtTime(0.28, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.6);
    });
  } catch (e) {}
}

function playContestBuzzer() {
  playAudioTone(220, 440, 1.6, 'sawtooth');
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [contest, setContest] = useState<ContestState | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(4);
  const [contestTitle, setContestTitle] = useState('11:11 Chapter 2 — Code In The Dark');
  const [isRevealMode, setIsRevealMode] = useState(false);
  const [contestPhase, setContestPhase] = useState<string>('setup');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Audio state
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [hasBuzzed, setHasBuzzed] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dramatic Stage Reveal Sequence State
  const [revealedCount, setRevealedCount] = useState(0);
  const [autoRevealActive, setAutoRevealActive] = useState(false);
  const autoRevealTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard shortcut F or P for Fullscreen Projector mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'f' || e.key === 'F' || e.key === 'p' || e.key === 'P') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const [lRes, cRes] = await Promise.all([
        fetch('/api/leaderboard'),
        fetch('/api/contest'),
      ]);

      if (lRes.ok) {
        const data = await lRes.json();
        setLeaderboard(data.leaderboard || []);
        setTotalQuestions(data.totalQuestions || 4);
        setContestTitle(data.contestTitle || '11:11 Chapter 2 — Code In The Dark');
        setContestPhase(data.phase || 'setup');
        
        if (data.isRevealMode && !isRevealMode) {
          setIsRevealMode(true);
          setRevealedCount(0);
        } else if (!data.isRevealMode && isRevealMode) {
          setIsRevealMode(false);
          setAutoRevealActive(false);
        }
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }

      if (cRes.ok) {
        const cData = await cRes.json();
        const cState: ContestState = cData.contest;
        setContest(cState);
        if (cState && cState.isActive && cState.endTime) {
          const timeLeftMs = cState.endTime - Date.now();
          if (timeLeftMs <= 0 && !hasBuzzed) {
            setHasBuzzed(true);
            if (audioEnabled) playContestBuzzer();
          }
        }
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [isRevealMode, hasBuzzed, audioEnabled]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 3500);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  // Auto-Reveal step logic
  useEffect(() => {
    if (autoRevealActive && isRevealMode) {
      autoRevealTimerRef.current = setInterval(() => {
        setRevealedCount((prev) => {
          const next = prev + 1;
          if (next >= leaderboard.length) {
            setAutoRevealActive(false);
            // Trigger Grand Champion celebration
            if (audioEnabled) playVictoryFanfare();
            confetti({
              particleCount: 180,
              spread: 100,
              origin: { y: 0.5 },
              colors: ['#FFD700', '#FFA500', '#00E676', '#00B0FF'],
            });
            return leaderboard.length;
          }
          return next;
        });
      }, 2500);
    } else {
      if (autoRevealTimerRef.current) clearInterval(autoRevealTimerRef.current);
    }
    return () => {
      if (autoRevealTimerRef.current) clearInterval(autoRevealTimerRef.current);
    };
  }, [autoRevealActive, isRevealMode, leaderboard.length, audioEnabled]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Reveal mode helpers
  // Rank index 0 = 1st, 1 = 2nd, ..., N-1 = last
  // If revealedCount = 1, rank N-1 is revealed.
  // When revealedCount = N, rank 0 (Champion) is revealed.
  const isRankRevealed = (rankIndex: number) => {
    if (!isRevealMode) return true;
    const N = leaderboard.length;
    return revealedCount >= (N - rankIndex);
  };

  const handleNextReveal = () => {
    setRevealedCount((prev) => {
      const next = Math.min(leaderboard.length, prev + 1);
      if (next === leaderboard.length) {
        if (audioEnabled) playVictoryFanfare();
        confetti({
          particleCount: 200,
          spread: 110,
          origin: { y: 0.5 },
          colors: ['#FFD700', '#FFA500', '#00E676', '#00B0FF', '#E040FB'],
        });
      }
      return next;
    });
  };

  const top3 = leaderboard.slice(0, 3);

  // Contest Remaining Time Calculation
  const remainingSeconds = contest?.isActive && contest.endTime
    ? Math.max(0, Math.floor((contest.endTime - Date.now()) / 1000))
    : 0;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isUnder5Min = remainingSeconds > 0 && remainingSeconds <= 300;

  // Gate: if contest is fully ended (phase=ended, not reveal), show "no contest" screen
  if (!loading && contestPhase === 'ended' && !isRevealMode) {
    return (
      <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-[#050504] p-6 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#d4af37]/5 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 max-w-md space-y-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1c160e] border border-[#a68a56]/30 mx-auto">
            <Trophy className="h-10 w-10 text-[#d4af37]" />
          </div>
          <h1 className="font-cinzel text-3xl font-extrabold text-[#ebe4d5]">Contest Concluded</h1>
          <p className="font-nautical-mono text-sm text-[#a68a56]">
            The voyage has ended. No active contest is running at this moment.
          </p>
          <p className="font-nautical-mono text-xs text-[#6b5535]">
            Results were revealed on stage. Contact the Admiralty for archived records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex min-h-screen flex-1 flex-col overflow-hidden bg-[#050504] p-4 sm:p-6 lg:p-8 bg-grid-cyber ${isFullscreen ? 'p-6 lg:p-10' : ''}`}>
      {/* Background Radial Glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[550px] w-[1000px] -translate-x-1/2 radial-glow-gold opacity-50" />

      {/* Global Live Flash Announcement Banner if active */}
      {contest?.announcement && (
        <div className="mx-auto mb-6 w-full max-w-7xl animate-pulse rounded-2xl border border-[#d4af37]/40 bg-[#1c160e]/90 p-4 shadow-[0_0_30px_rgba(212,175,55,0.2)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d4af37]/20 text-[#d4af37]">
              <Megaphone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-cinzel text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">
                Grand Decree · Admiralty Command
              </div>
              <div className="font-nautical-mono text-sm font-semibold text-[#f3d38c]">
                {contest.announcement}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 border-b border-[#a68a56]/20 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#1c160e]/80 px-3 py-1 font-cinzel text-xs font-semibold text-[#f3d38c]">
            <Sparkles className="h-3.5 w-3.5 text-[#d4af37]" />
            ADMIRALTY STAGE ROSTER · 11:11 CHAPTER 2
          </div>
          <h1 className="mt-2 font-cinzel text-3xl font-extrabold tracking-wider text-[#ebe4d5] sm:text-4xl">
            <span className="bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] bg-clip-text text-transparent">
              {contestTitle}
            </span>
          </h1>
          <p className="mt-1 font-nautical-mono text-xs text-[#a68a56]">
            Real-time multi-question cumulative scores · Chrono-speed bonuses active
          </p>
        </div>

        {/* Status Indicators & Stage Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Contest Timer Widget */}
          {contest?.isActive && (
            <div className={`flex items-center gap-2 rounded-xl border px-3.5 py-1.5 font-nautical-mono text-xs ${
              isUnder5Min
                ? 'border-red-500/50 bg-red-950/40 text-red-300 animate-pulse'
                : 'border-[#d4af37]/40 bg-[#1c160e] text-[#f3d38c]'
            }`}>
              <Clock className="h-4 w-4 text-[#d4af37]" />
              <span>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => {
              setAudioEnabled(!audioEnabled);
              if (!audioEnabled) {
                playAudioTone(440, 880, 0.2, 'sine');
              }
            }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-cinzel text-xs transition-all cursor-pointer bouncy-btn ${
              audioEnabled
                ? 'border-[#d4af37]/40 bg-[#1c160e] text-[#f3d38c]'
                : 'border-[#a68a56]/20 bg-[#050504]/50 text-[#a68a56]'
            }`}
            title="Toggle Stage Chimes & Fanfare"
          >
            {audioEnabled ? <Volume2 className="h-4 w-4 text-[#d4af37]" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden sm:inline">{audioEnabled ? 'Chimes Active' : 'Muted'}</span>
          </button>

          {/* Fullscreen TV / Projector Mode Toggle */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-3 py-1.5 font-cinzel text-xs text-[#f3d38c] hover:border-[#d4af37] transition-all cursor-pointer bouncy-btn"
            title="Toggle Projector Fullscreen Mode (Press F)"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit TV Mode' : 'Projector View (F)'}</span>
          </button>

          <div className="flex items-center gap-2 rounded-xl border border-[#a68a56]/20 bg-[#050504]/60 px-3 py-1.5 font-nautical-mono text-xs text-[#a68a56]">
            <span className="h-2 w-2 rounded-full bg-[#d4af37] animate-ping" />
            <span>Updated {lastUpdated || 'Live'}</span>
          </div>
        </div>
      </div>

      {/* Dramatic Stage Reveal Mode Controller Bar */}
      {isRevealMode && (
        <div className="mx-auto mt-6 w-full max-w-7xl rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#1c160e] via-[#0e0b07] to-[#1c160e] p-4 sm:p-5 shadow-[0_0_40px_rgba(212,175,55,0.15)] backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#d4af37] to-[#f3d38c] text-[#050504] shadow-lg shadow-[#d4af37]/30">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 font-cinzel text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>DRAMATIC STAGE UNVEILING PROTOCOL</span>
                </div>
                <h3 className="font-cinzel text-base font-extrabold text-[#ebe4d5]">
                  {revealedCount >= leaderboard.length
                    ? '⚔️ ALL SEALS UNVEILED — SALUTE TO THE GRAND CHAMPIONS!'
                    : `Unmasking Admiralty Roster: ${revealedCount} of ${leaderboard.length} Navigators Revealed`}
                </h3>
              </div>
            </div>

            {/* Emcee Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleNextReveal}
                disabled={revealedCount >= leaderboard.length}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-4 py-2 font-cinzel text-xs font-bold text-[#050504] shadow-lg shadow-[#d4af37]/25 hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all cursor-pointer bouncy-btn"
              >
                <Eye className="h-4 w-4" />
                <span>Next Reveal</span>
              </button>

              <button
                onClick={() => setAutoRevealActive(!autoRevealActive)}
                disabled={revealedCount >= leaderboard.length}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 font-cinzel text-xs font-semibold transition-all cursor-pointer bouncy-btn ${
                  autoRevealActive
                    ? 'border-[#d4af37] bg-[#1c160e] text-[#f3d38c]'
                    : 'border-[#a68a56]/30 bg-[#050504]/50 text-[#a68a56] hover:text-[#ebe4d5]'
                }`}
              >
                {autoRevealActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{autoRevealActive ? 'Halt Sequence' : 'Auto Unmask (2.5s)'}</span>
              </button>

              <button
                onClick={() => {
                  setRevealedCount(leaderboard.length);
                  if (audioEnabled) playVictoryFanfare();
                  confetti({
                    particleCount: 200,
                    spread: 120,
                    origin: { y: 0.5 },
                    colors: ['#D4AF37', '#F3D38C', '#A68A56', '#FFFFFF', '#EBE4D5'],
                  });
                }}
                className="flex items-center gap-1 rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-3 py-2 font-cinzel text-xs text-[#a68a56] hover:text-[#f3d38c] hover:border-[#d4af37] transition-all cursor-pointer bouncy-btn"
              >
                <FastForward className="h-3.5 w-3.5" />
                <span>Unmask All</span>
              </button>

              <button
                onClick={() => {
                  setRevealedCount(0);
                  setAutoRevealActive(false);
                }}
                className="flex items-center gap-1 rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 p-2 font-cinzel text-xs text-[#a68a56] hover:text-red-400 hover:border-red-500/40 transition-all cursor-pointer bouncy-btn"
                title="Reset Stage Reveal"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Leaderboard Body */}
      <div className="mx-auto mt-8 w-full max-w-7xl flex-1">
        {/* Podium Top 3 Cards (Rendered when not in reveal mode OR when top 3 are unmasked) */}
        {leaderboard.length > 0 && (!isRevealMode || isRankRevealed(0) || isRankRevealed(1) || isRankRevealed(2)) && (
          <div className="mb-10 grid gap-4 sm:grid-cols-3">
            {/* Rank 2 - Brass / Silver */}
            {top3[1] && isRankRevealed(1) && (
              <div className="order-2 sm:order-1 rounded-2xl border border-[#a68a56]/40 bg-gradient-to-b from-[#1c160e]/90 to-[#0e0b07] p-6 backdrop-blur-xl transition-all hover:scale-[1.02] shadow-[0_0_25px_rgba(0,0,0,0.8)] animate-fade-in bouncy-card">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#a68a56]/20 border border-[#a68a56]/40 text-[#ebe4d5] font-cinzel-dec font-bold text-lg">
                    II
                  </div>
                  <Medal className="h-6 w-6 text-[#a68a56]" />
                </div>
                <div className="mt-4">
                  <h3 className="font-cinzel text-lg font-bold text-[#ebe4d5] truncate">{top3[1].name}</h3>
                  <p className="font-nautical-mono text-xs text-[#a68a56]">{top3[1].rollNumber} · {top3[1].terminalId}</p>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-nautical-mono text-3xl font-extrabold text-[#f3d38c]">{top3[1].totalScore}</span>
                  <span className="font-cinzel text-xs text-[#a68a56]">PTS</span>
                </div>
                <div className="mt-2 font-nautical-mono text-xs text-[#d4af37]">
                  {top3[1].questionsSolved} solved · {top3[1].partialSolved} partial
                </div>
              </div>
            )}

            {/* Rank 1 - Gold (Elevated Champion Spotlight) */}
            {top3[0] && isRankRevealed(0) && (
              <div className="order-1 sm:order-2 rounded-2xl border-2 border-[#d4af37] bg-gradient-to-b from-[#1c160e] via-[#15100a] to-[#0e0b07] p-6 sm:-mt-4 backdrop-blur-xl shadow-[0_0_35px_rgba(212,175,55,0.25)] transition-all hover:scale-[1.03] animate-bounce-short ring-2 ring-[#d4af37]/30 bouncy-card">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#d4af37] to-[#f3d38c] text-[#050504] font-cinzel-dec font-extrabold text-2xl shadow-lg shadow-[#d4af37]/40">
                    I
                  </div>
                  <Trophy className="h-8 w-8 text-[#d4af37] animate-bounce" />
                </div>
                <div className="mt-4">
                  <div className="inline-flex items-center gap-1 font-cinzel text-[10px] font-bold uppercase tracking-widest text-[#f3d38c] mb-1">
                    <Crown className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span>GRAND ADMIRAL · CHAMPION</span>
                  </div>
                  <h3 className="font-cinzel text-xl font-extrabold text-[#ebe4d5] truncate">{top3[0].name}</h3>
                  <p className="font-nautical-mono text-xs text-[#f3d38c]/80">{top3[0].rollNumber} · {top3[0].terminalId}</p>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-nautical-mono text-4xl font-extrabold text-[#d4af37]">{top3[0].totalScore}</span>
                  <span className="font-cinzel text-xs font-semibold text-[#f3d38c]">PTS</span>
                </div>
                <div className="mt-2 font-nautical-mono text-xs text-[#f3d38c]">
                  {top3[0].questionsSolved} solved · {top3[0].partialSolved} partial
                </div>
              </div>
            )}

            {/* Rank 3 - Bronze */}
            {top3[2] && isRankRevealed(2) && (
              <div className="order-3 sm:order-3 rounded-2xl border border-[#8c6738]/50 bg-gradient-to-b from-[#1c160e]/80 to-[#0e0b07] p-6 backdrop-blur-xl transition-all hover:scale-[1.02] shadow-[0_0_25px_rgba(0,0,0,0.8)] animate-fade-in bouncy-card">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8c6738]/20 border border-[#8c6738]/40 text-[#f3d38c] font-cinzel-dec font-bold text-lg">
                    III
                  </div>
                  <Medal className="h-6 w-6 text-[#8c6738]" />
                </div>
                <div className="mt-4">
                  <h3 className="font-cinzel text-lg font-bold text-[#ebe4d5] truncate">{top3[2].name}</h3>
                  <p className="font-nautical-mono text-xs text-[#a68a56]">{top3[2].rollNumber} · {top3[2].terminalId}</p>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-nautical-mono text-3xl font-extrabold text-[#f3d38c]">{top3[2].totalScore}</span>
                  <span className="font-cinzel text-xs text-[#a68a56]">PTS</span>
                </div>
                <div className="mt-2 font-nautical-mono text-xs text-[#d4af37]">
                  {top3[2].questionsSolved} solved · {top3[2].partialSolved} partial
                </div>
              </div>
            )}
          </div>
        )}

        {/* Complete Leaderboard Table */}
        <div className="overflow-hidden rounded-2xl border border-[#a68a56]/25 bg-[#090704]/90 backdrop-blur-xl shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#a68a56]/20 bg-[#140f0a] font-cinzel text-xs text-[#d4af37] uppercase tracking-wider">
                  <th className="py-4 px-6">Rank</th>
                  <th className="py-4 px-6">Navigator</th>
                  <th className="py-4 px-6">Bounty Score</th>
                  <th className="py-4 px-6">Scrolls Solved</th>
                  <th className="py-4 px-6">Trial Breakdown</th>
                  <th className="py-4 px-6">Penalties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#a68a56]/15 font-nautical-mono text-sm">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#a68a56]">
                      Waiting for participants to join and submit solutions...
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((entry, idx) => {
                    const revealed = isRankRevealed(idx);

                    if (!revealed) {
                      // Shrouded confidential row for stage suspense
                      return (
                        <tr key={entry.participantId} className="bg-[#050504]/60 opacity-60">
                          <td className="py-4 px-6 font-bold text-[#a68a56]">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs bg-[#1c160e] text-[#a68a56] font-cinzel">
                              #{idx + 1}
                            </span>
                          </td>
                          <td colSpan={5} className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <span className="h-2 w-2 rounded-full bg-[#d4af37] animate-ping" />
                              <span className="rounded-lg border border-[#a68a56]/20 bg-[#1c160e]/50 px-3 py-1 font-cinzel text-xs text-[#a68a56] uppercase tracking-widest">
                                🔒 Rank #{idx + 1} Shrouded in Deep Mist — Awaiting Stage Revelation
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={entry.participantId}
                        className={`transition-colors hover:bg-[#1c160e]/40 animate-fade-in ${
                          idx === 0
                            ? 'bg-[#d4af37]/[0.08]'
                            : idx === 1
                            ? 'bg-[#a68a56]/[0.06]'
                            : idx === 2
                            ? 'bg-[#8c6738]/[0.06]'
                            : ''
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-4 px-6 font-bold">
                          <span
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-cinzel ${
                              idx === 0
                                ? 'bg-[#d4af37] text-[#050504] font-extrabold shadow-md shadow-[#d4af37]/30'
                                : idx === 1
                                ? 'bg-[#a68a56] text-[#050504] font-bold'
                                : idx === 2
                                ? 'bg-[#8c6738] text-[#ebe4d5] font-bold'
                                : 'text-[#a68a56] bg-[#1c160e]/60 border border-[#a68a56]/20'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                        </td>

                        {/* Candidate */}
                        <td className="py-4 px-6">
                          <div className="font-bold text-[#ebe4d5] flex items-center gap-2 font-cinzel">
                            <span>{entry.name}</span>
                            {idx === 0 && <Crown className="h-4 w-4 text-[#d4af37] inline" />}
                          </div>
                          <div className="text-xs text-[#a68a56] font-nautical-mono">{entry.rollNumber} · {entry.terminalId}</div>
                        </td>

                        {/* Total Score */}
                        <td className="py-4 px-6">
                          <span className={`text-lg font-extrabold ${idx === 0 ? 'text-[#d4af37]' : 'text-[#f3d38c]'}`}>
                            {entry.totalScore}
                          </span>
                          <span className="text-xs text-[#a68a56] ml-1">pts</span>
                        </td>

                        {/* Solved Ratio */}
                        <td className="py-4 px-6">
                          <span className="text-[#f3d38c] font-semibold">{entry.questionsSolved}</span>
                          <span className="text-[#a68a56]"> / {totalQuestions}</span>
                          {entry.partialSolved > 0 && (
                            <span className="text-xs text-[#d4af37] ml-1.5">
                              (+{entry.partialSolved} partial)
                            </span>
                          )}
                        </td>

                        {/* Per-Question Capsules */}
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(entry.perQuestionScores).map(([qId, qData]) => (
                              <div
                                key={qId}
                                className="flex items-center gap-1 rounded bg-[#050504] border border-[#a68a56]/20 px-2 py-0.5 text-xs"
                                title={`Score: ${qData.score} | Passed: ${qData.passedRatio} | Language: ${qData.language}`}
                              >
                                <span className="text-[#a68a56] uppercase text-[10px]">{qData.language}</span>
                                <span className="font-semibold text-[#f3d38c]">{qData.score}p</span>
                                <span className="text-[10px] text-[#a68a56]">({qData.passedRatio})</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Strikes */}
                        <td className="py-4 px-6">
                          {entry.strikes > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded bg-red-950/40 border border-red-500/30 px-2 py-0.5 text-xs text-red-400 font-bold">
                              <ShieldAlert className="h-3.5 w-3.5" />
                              {entry.strikes}
                            </span>
                          ) : (
                            <span className="text-xs text-[#a68a56]">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
