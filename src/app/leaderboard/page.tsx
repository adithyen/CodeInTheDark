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
        
        // Check reveal mode transition
        if (data.isRevealMode && !isRevealMode) {
          setIsRevealMode(true);
          setRevealedCount(0); // initialize reveal sequence
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

        // Check if contest just ended for audio buzzer
        if (cState && cState.isActive && cState.endTime) {
          const timeLeftMs = cState.endTime - Date.now();
          if (timeLeftMs <= 0 && !hasBuzzed) {
            setHasBuzzed(true);
            if (audioEnabled) {
              playContestBuzzer();
            }
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

  return (
    <div className={`relative flex min-h-screen flex-1 flex-col overflow-hidden bg-[#06090e] p-4 sm:p-6 lg:p-8 bg-grid-cyber ${isFullscreen ? 'p-6 lg:p-10' : ''}`}>
      {/* Background Radial Glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[550px] w-[1000px] -translate-x-1/2 radial-glow-emerald opacity-60" />

      {/* Global Live Flash Announcement Banner if active */}
      {contest?.announcement && (
        <div className="mx-auto mb-6 w-full max-w-7xl animate-pulse rounded-2xl border border-cyan-500/40 bg-cyan-950/60 p-4 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
              <Megaphone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Live Broadcast from Admin Control
              </div>
              <div className="font-mono text-sm font-semibold text-white">
                {contest.announcement}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/20 px-3 py-1 font-mono text-xs font-semibold text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            LIVE STAGE LEADERBOARD · 11:11 CHAPTER 2
          </div>
          <h1 className="mt-2 font-mono text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {contestTitle}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Real-time multi-question cumulative scores · Speed bonuses active
          </p>
        </div>

        {/* Status Indicators & Stage Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Contest Timer Widget */}
          {contest?.isActive && (
            <div className={`flex items-center gap-2 rounded-xl border px-3.5 py-1.5 font-mono text-xs ${
              isUnder5Min
                ? 'border-red-500/50 bg-red-950/40 text-red-300 animate-pulse'
                : 'border-amber-500/30 bg-amber-950/20 text-amber-300'
            }`}>
              <Clock className="h-4 w-4" />
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
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs transition-all cursor-pointer ${
              audioEnabled
                ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
                : 'border-white/10 bg-white/5 text-gray-400'
            }`}
            title="Toggle Stage Sound Effects & Buzzer"
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden sm:inline">{audioEnabled ? 'Sound On' : 'Muted'}</span>
          </button>

          {/* Fullscreen TV / Projector Mode Toggle */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            title="Toggle Projector Fullscreen Mode (Press F)"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit TV Mode' : 'Projector View (F)'}</span>
          </button>

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs text-gray-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Updated {lastUpdated || 'Live'}</span>
          </div>
        </div>
      </div>

      {/* Dramatic Stage Reveal Mode Controller Bar */}
      {isRevealMode && (
        <div className="mx-auto mt-6 w-full max-w-7xl rounded-2xl border-2 border-amber-400/40 bg-gradient-to-r from-amber-950/50 via-purple-950/40 to-[#0a0f19] p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-black shadow-lg shadow-amber-400/30">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>DRAMATIC STAGE REVEAL MODE ACTIVE</span>
                </div>
                <h3 className="font-mono text-base font-extrabold text-white">
                  {revealedCount >= leaderboard.length
                    ? '🎉 ALL RANKS UNVEILED — CONGRATULATIONS TO THE CHAMPIONS!'
                    : `Unmasking Leaderboard: ${revealedCount} of ${leaderboard.length} Candidates Revealed`}
                </h3>
              </div>
            </div>

            {/* Emcee Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleNextReveal}
                disabled={revealedCount >= leaderboard.length}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-2 font-mono text-xs font-bold text-black shadow-lg shadow-amber-400/20 hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
              >
                <Eye className="h-4 w-4" />
                <span>Next Reveal</span>
              </button>

              <button
                onClick={() => setAutoRevealActive(!autoRevealActive)}
                disabled={revealedCount >= leaderboard.length}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 font-mono text-xs font-semibold transition-all cursor-pointer ${
                  autoRevealActive
                    ? 'border-purple-400 bg-purple-950/40 text-purple-300'
                    : 'border-white/15 bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {autoRevealActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{autoRevealActive ? 'Pause Auto' : 'Auto Unmask (2.5s)'}</span>
              </button>

              <button
                onClick={() => {
                  setRevealedCount(leaderboard.length);
                  if (audioEnabled) playVictoryFanfare();
                  confetti({
                    particleCount: 200,
                    spread: 120,
                    origin: { y: 0.5 },
                    colors: ['#FFD700', '#FFA500', '#00E676', '#00B0FF'],
                  });
                }}
                className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-mono text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <FastForward className="h-3.5 w-3.5" />
                <span>Unmask All</span>
              </button>

              <button
                onClick={() => {
                  setRevealedCount(0);
                  setAutoRevealActive(false);
                }}
                className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 p-2 font-mono text-xs text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition-all cursor-pointer"
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
            {/* Rank 2 - Silver */}
            {top3[1] && isRankRevealed(1) && (
              <div className="order-2 sm:order-1 rounded-2xl border border-gray-400/30 bg-gradient-to-b from-gray-900/60 to-[#0c121d] p-6 backdrop-blur-xl transition-all hover:scale-[1.02] shadow-xl animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-400/20 text-gray-300 font-mono font-bold text-lg">
                    2
                  </div>
                  <Medal className="h-6 w-6 text-gray-300" />
                </div>
                <div className="mt-4">
                  <h3 className="font-mono text-lg font-bold text-white truncate">{top3[1].name}</h3>
                  <p className="font-mono text-xs text-gray-400">{top3[1].rollNumber} · {top3[1].terminalId}</p>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-extrabold text-white">{top3[1].totalScore}</span>
                  <span className="font-mono text-xs text-gray-400">PTS</span>
                </div>
                <div className="mt-2 font-mono text-xs text-emerald-400">
                  {top3[1].questionsSolved} full · {top3[1].partialSolved} partial
                </div>
              </div>
            )}

            {/* Rank 1 - Gold (Elevated Champion Spotlight) */}
            {top3[0] && isRankRevealed(0) && (
              <div className="order-1 sm:order-2 rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-amber-950/50 via-yellow-950/30 to-[#0c121d] p-6 sm:-mt-4 backdrop-blur-xl shadow-2xl shadow-amber-500/20 transition-all hover:scale-[1.03] animate-bounce-short ring-2 ring-amber-400/30">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-black font-mono font-extrabold text-xl shadow-lg shadow-amber-400/40">
                    1
                  </div>
                  <Trophy className="h-8 w-8 text-amber-400 animate-bounce" />
                </div>
                <div className="mt-4">
                  <div className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-amber-300 mb-1">
                    <Crown className="h-3 w-3" />
                    <span>GRAND CHAMPION</span>
                  </div>
                  <h3 className="font-mono text-xl font-extrabold text-white truncate">{top3[0].name}</h3>
                  <p className="font-mono text-xs text-amber-200/90">{top3[0].rollNumber} · {top3[0].terminalId}</p>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-mono text-4xl font-extrabold text-amber-400">{top3[0].totalScore}</span>
                  <span className="font-mono text-xs font-semibold text-amber-300">PTS</span>
                </div>
                <div className="mt-2 font-mono text-xs text-emerald-400">
                  {top3[0].questionsSolved} solved · {top3[0].partialSolved} partial
                </div>
              </div>
            )}

            {/* Rank 3 - Bronze */}
            {top3[2] && isRankRevealed(2) && (
              <div className="order-3 sm:order-3 rounded-2xl border border-amber-700/40 bg-gradient-to-b from-amber-950/20 to-[#0c121d] p-6 backdrop-blur-xl transition-all hover:scale-[1.02] shadow-xl animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-700/20 text-amber-500 font-mono font-bold text-lg">
                    3
                  </div>
                  <Medal className="h-6 w-6 text-amber-600" />
                </div>
                <div className="mt-4">
                  <h3 className="font-mono text-lg font-bold text-white truncate">{top3[2].name}</h3>
                  <p className="font-mono text-xs text-gray-400">{top3[2].rollNumber} · {top3[2].terminalId}</p>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-extrabold text-white">{top3[2].totalScore}</span>
                  <span className="font-mono text-xs text-gray-400">PTS</span>
                </div>
                <div className="mt-2 font-mono text-xs text-emerald-400">
                  {top3[2].questionsSolved} full · {top3[2].partialSolved} partial
                </div>
              </div>
            )}
          </div>
        )}

        {/* Complete Leaderboard Table */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f18]/90 backdrop-blur-xl shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-black/40 font-mono text-xs text-gray-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Rank</th>
                  <th className="py-4 px-6">Candidate</th>
                  <th className="py-4 px-6">Score</th>
                  <th className="py-4 px-6">Solved</th>
                  <th className="py-4 px-6">Per-Question Breakdown</th>
                  <th className="py-4 px-6">Strikes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] font-mono text-sm">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      Waiting for participants to join and submit solutions...
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((entry, idx) => {
                    const revealed = isRankRevealed(idx);

                    if (!revealed) {
                      // Shrouded confidential row for stage suspense
                      return (
                        <tr key={entry.participantId} className="bg-black/30 opacity-60">
                          <td className="py-4 px-6 font-bold text-gray-600">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs bg-white/5 text-gray-600">
                              #{idx + 1}
                            </span>
                          </td>
                          <td colSpan={5} className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <span className="h-2 w-2 rounded-full bg-amber-400/50 animate-ping" />
                              <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-gray-400 uppercase tracking-widest">
                                🔒 Rank #{idx + 1} Confidential — Shrouded for Stage Unveiling
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={entry.participantId}
                        className={`transition-colors hover:bg-white/[0.04] animate-fade-in ${
                          idx === 0
                            ? 'bg-amber-500/[0.06]'
                            : idx === 1
                            ? 'bg-gray-400/[0.03]'
                            : idx === 2
                            ? 'bg-amber-700/[0.03]'
                            : ''
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-4 px-6 font-bold">
                          <span
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs ${
                              idx === 0
                                ? 'bg-amber-400 text-black font-extrabold shadow-md shadow-amber-400/20'
                                : idx === 1
                                ? 'bg-gray-300 text-black font-bold'
                                : idx === 2
                                ? 'bg-amber-700 text-white font-bold'
                                : 'text-gray-400 bg-white/5'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                        </td>

                        {/* Candidate */}
                        <td className="py-4 px-6">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{entry.name}</span>
                            {idx === 0 && <Crown className="h-4 w-4 text-amber-400 inline" />}
                          </div>
                          <div className="text-xs text-gray-400">{entry.rollNumber} · {entry.terminalId}</div>
                        </td>

                        {/* Total Score */}
                        <td className="py-4 px-6">
                          <span className={`text-lg font-extrabold ${idx === 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {entry.totalScore}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">pts</span>
                        </td>

                        {/* Solved Ratio */}
                        <td className="py-4 px-6">
                          <span className="text-emerald-300 font-semibold">{entry.questionsSolved}</span>
                          <span className="text-gray-500"> / {totalQuestions}</span>
                          {entry.partialSolved > 0 && (
                            <span className="text-xs text-amber-400/80 ml-1.5">
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
                                className="flex items-center gap-1 rounded bg-black/50 border border-white/10 px-2 py-0.5 text-xs"
                                title={`Score: ${qData.score} | Passed: ${qData.passedRatio} | Language: ${qData.language}`}
                              >
                                <span className="text-gray-400 uppercase text-[10px]">{qData.language}</span>
                                <span className="font-semibold text-emerald-300">{qData.score}p</span>
                                <span className="text-[10px] text-gray-500">({qData.passedRatio})</span>
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
                            <span className="text-xs text-gray-500">0</span>
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
