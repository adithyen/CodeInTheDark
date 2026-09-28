'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  Medal, 
  Sparkles, 
  Clock,
  RotateCcw,
  Crown,
  Megaphone,
  GraduationCap
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
  const [contestTitle, setContestTitle] = useState('11:11 Chapter 2 — Code In The Dark');
  const [isRevealMode, setIsRevealMode] = useState(false);
  const [contestPhase, setContestPhase] = useState<string>('setup');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Audio alert state
  const [hasBuzzed, setHasBuzzed] = useState(false);

  // Automated Reveal Sequence State:
  // 0 = Initial (All positions masked in mist)
  // 1 = 1st Place Revealed (@ 1.5s)
  // 2 = 2nd Place Revealed (@ 3.0s)
  // 3 = 3rd Place Revealed (@ 4.5s)
  // 4 = Complete: All positions (1st to last) available for all participants (@ 6.0s)
  const [revealStage, setRevealStage] = useState(4);
  const [revealTrigger, setRevealTrigger] = useState(0);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const [lRes, cRes] = await Promise.all([
        fetch('/api/leaderboard'),
        fetch('/api/contest'),
      ]);

      if (lRes.ok) {
        const data = await lRes.json();
        setLeaderboard(data.leaderboard || []);
        setContestTitle(data.contestTitle || '11:11 Chapter 2 — Code In The Dark');
        setContestPhase(data.phase || 'setup');
        
        if (data.isRevealMode && !isRevealMode) {
          setIsRevealMode(true);
        } else if (!data.isRevealMode && isRevealMode) {
          setIsRevealMode(false);
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
            playContestBuzzer();
          }
        }
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [isRevealMode, hasBuzzed]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 3500);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  // Automated Timed Reveal Sequence:
  // 1.5s for 1st position
  // 3.0s (1.5 * 2) for 2nd position
  // 4.5s (1.5 * 3) for 3rd position
  // 6.0s ((1.5 * 3 = 4.5) + 1.5 = 6.0) for 1st to last all available!
  useEffect(() => {
    if (!isRevealMode) {
      setRevealStage(4);
      return;
    }

    const alreadySeen = typeof window !== 'undefined' && sessionStorage.getItem('cid_reveal_done') === 'true';
    if (alreadySeen) {
      setRevealStage(4);
      return;
    }

    // Begin timed auto-reveal from stage 0
    setRevealStage(0);

    // t = 1.5s -> 1st position revealed
    const t1 = setTimeout(() => {
      setRevealStage(1);
      playVictoryFanfare();
    }, 1500);

    // t = 3.0s -> 2nd position revealed
    const t2 = setTimeout(() => {
      setRevealStage(2);
      playAudioTone(587.33, 880, 0.4, 'triangle');
    }, 3000);

    // t = 4.5s -> 3rd position revealed
    const t3 = setTimeout(() => {
      setRevealStage(3);
      playAudioTone(523.25, 783.99, 0.4, 'triangle');
    }, 4500);

    // t = 6.0s -> All positions from 1st to last available!
    const t4 = setTimeout(() => {
      setRevealStage(4);
      playVictoryFanfare();
      confetti({
        particleCount: 220,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#00E676', '#00B0FF', '#E040FB'],
      });
      try {
        sessionStorage.setItem('cid_reveal_done', 'true');
      } catch (e) {}
    }, 6000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isRevealMode, revealTrigger]);

  const restartReveal = () => {
    try {
      sessionStorage.removeItem('cid_reveal_done');
    } catch (e) {}
    setRevealTrigger((prev) => prev + 1);
  };

  // Rank check:
  // rankIndex 0 = 1st, 1 = 2nd, 2 = 3rd, >= 3 = rest
  const isRankRevealed = (rankIndex: number): boolean => {
    if (!isRevealMode || revealStage >= 4) return true;
    if (rankIndex === 0) return revealStage >= 1;
    if (rankIndex === 1) return revealStage >= 2;
    if (rankIndex === 2) return revealStage >= 3;
    return false;
  };

  const top3 = leaderboard.slice(0, 3);

  // Contest Remaining Time Calculation
  const remainingSeconds = contest?.isActive && contest.endTime
    ? Math.max(0, Math.floor((contest.endTime - Date.now()) / 1000))
    : 0;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isUnder5Min = remainingSeconds > 0 && remainingSeconds <= 300;

  // Gate: if contest is fully ended, not reveal mode, and no leaderboard data
  if (!loading && contestPhase === 'ended' && !isRevealMode && leaderboard.length === 0) {
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
            The contest has concluded. Final standings will be revealed shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-[#050504] p-4 sm:p-6 lg:p-8 bg-grid-cyber">
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
              <div className="font-cinzel text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                Official Contest Announcement
              </div>
              <div className="font-nautical-mono text-sm sm:text-base font-semibold text-[#f3d38c]">
                {contest.announcement}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 border-b border-[#a68a56]/20 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#1c160e]/80 px-3.5 py-1 font-cinzel text-xs font-semibold text-[#f3d38c]">
            <Sparkles className="h-3.5 w-3.5 text-[#d4af37]" />
            CONTEST LEADERBOARD · 11:11 CHAPTER 2
          </div>
          <h1 className="mt-2.5 font-cinzel text-3xl font-extrabold tracking-wider text-[#ebe4d5] sm:text-4xl">
            <span className="bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] bg-clip-text text-transparent">
              {contestTitle}
            </span>
          </h1>
          <p className="mt-1.5 font-nautical-mono text-xs sm:text-sm text-[#a68a56]">
            Official participant standings and final scores
          </p>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Contest Timer Widget */}
          {contest?.isActive && (
            <div className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-nautical-mono text-xs sm:text-sm ${
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

          <div className="flex items-center gap-2 rounded-xl border border-[#a68a56]/20 bg-[#050504]/60 px-3.5 py-2 font-nautical-mono text-xs sm:text-sm text-[#a68a56]">
            <span className="h-2 w-2 rounded-full bg-[#d4af37] animate-ping" />
            <span>Updated {lastUpdated || 'Live'}</span>
          </div>
        </div>
      </div>

      {/* Automated Stage Reveal Banner during sequence */}
      {isRevealMode && revealStage < 4 && (
        <div className="mx-auto mt-6 w-full max-w-7xl rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#1c160e] via-[#0e0b07] to-[#1c160e] p-5 shadow-[0_0_35px_rgba(212,175,55,0.18)] backdrop-blur-xl animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#d4af37] to-[#f3d38c] text-[#050504] shadow-md shadow-[#d4af37]/30">
                <Crown className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 font-cinzel text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                  <Sparkles className="h-3.5 w-3.5 text-[#d4af37] animate-spin" />
                  <span>Official Leaderboard Reveal</span>
                </div>
                <h3 className="font-cinzel text-base sm:text-lg font-extrabold text-[#ebe4d5]">
                  {revealStage === 0 && 'Unveiling 1st Place Champion...'}
                  {revealStage === 1 && '🥇 1st Place Revealed — Unveiling 2nd Place...'}
                  {revealStage === 2 && '🥈 2nd Place Revealed — Unveiling 3rd Place...'}
                  {revealStage === 3 && '🥉 3rd Place Revealed — Revealing Full Leaderboard...'}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 font-nautical-mono text-xs sm:text-sm text-[#d4af37]">
              <span className="h-2 w-2 rounded-full bg-[#d4af37] animate-ping" />
              <span>Live Reveal in Progress</span>
            </div>
          </div>
        </div>
      )}

      {/* Completed Reveal Indicator with replay option */}
      {isRevealMode && revealStage >= 4 && (
        <div className="mx-auto mt-6 w-full max-w-7xl rounded-2xl border border-[#d4af37]/30 bg-[#1c160e]/80 p-4 shadow-[0_0_20px_rgba(212,175,55,0.1)] backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-5 w-5 text-[#d4af37]" />
            <span className="font-cinzel text-sm sm:text-base font-bold text-[#ebe4d5]">
              Official Leaderboard · All Standings Revealed
            </span>
          </div>
          <button
            onClick={restartReveal}
            className="flex items-center gap-1.5 rounded-lg border border-[#a68a56]/30 bg-[#050504]/50 px-3.5 py-1.5 font-cinzel text-xs font-semibold text-[#a68a56] hover:text-[#f3d38c] hover:border-[#d4af37] transition-all cursor-pointer bouncy-btn"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Replay Reveal</span>
          </button>
        </div>
      )}

      {/* Main Leaderboard Body */}
      <div className="mx-auto mt-8 w-full max-w-7xl flex-1">
        {/* Podium Top 3 Cards (Rendered when revealed) */}
        {leaderboard.length > 0 && (!isRevealMode || isRankRevealed(0) || isRankRevealed(1) || isRankRevealed(2)) && (
          <div className="mb-10 grid gap-4 sm:grid-cols-3">
            {/* Rank 2 - Silver */}
            {top3[1] && isRankRevealed(1) && (
              <div className="order-2 sm:order-1 rounded-2xl border border-[#a68a56]/40 bg-gradient-to-b from-[#1c160e]/90 to-[#0e0b07] p-6 sm:p-7 backdrop-blur-xl transition-all hover:scale-[1.02] shadow-[0_0_25px_rgba(0,0,0,0.8)] animate-fade-in bouncy-card">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#a68a56]/20 border border-[#a68a56]/40 text-[#ebe4d5] font-cinzel font-bold text-sm">
                    2ND
                  </div>
                  <Medal className="h-7 w-7 text-[#a68a56]" />
                </div>
                <div className="mt-4 space-y-1">
                  <div className="font-cinzel text-xs font-semibold text-[#a68a56] uppercase tracking-wider">
                    2nd Place
                  </div>
                  <h3 className="font-cinzel text-xl font-bold text-[#ebe4d5] truncate">{top3[1].name}</h3>
                  <p className="font-nautical-mono text-xs sm:text-sm text-[#f3d38c] truncate flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-[#d4af37] shrink-0" />
                    <span className="truncate">{top3[1].college || 'College'}</span>
                  </p>
                </div>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-nautical-mono text-3xl sm:text-4xl font-extrabold text-[#f3d38c]">{top3[1].totalScore}</span>
                  <span className="font-cinzel text-xs font-bold text-[#a68a56]">PTS</span>
                </div>
              </div>
            )}

            {/* Rank 1 - Gold (Elevated Champion Spotlight) */}
            {top3[0] && isRankRevealed(0) && (
              <div className="order-1 sm:order-2 rounded-2xl border-2 border-[#d4af37] bg-gradient-to-b from-[#1c160e] via-[#15100a] to-[#0e0b07] p-6 sm:p-8 sm:-mt-4 backdrop-blur-xl shadow-[0_0_35px_rgba(212,175,55,0.25)] transition-all hover:scale-[1.03] animate-bounce-short ring-2 ring-[#d4af37]/30 bouncy-card">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#d4af37] to-[#f3d38c] text-[#050504] font-cinzel font-black text-base shadow-lg shadow-[#d4af37]/40">
                    1ST
                  </div>
                  <Trophy className="h-9 w-9 text-[#d4af37] animate-bounce" />
                </div>
                <div className="mt-4 space-y-1">
                  <div className="inline-flex items-center gap-1.5 font-cinzel text-xs font-bold uppercase tracking-widest text-[#f3d38c] mb-1">
                    <Crown className="h-4 w-4 text-[#d4af37]" />
                    <span>1ST PLACE · CHAMPION</span>
                  </div>
                  <h3 className="font-cinzel text-2xl font-black text-[#ebe4d5] truncate">{top3[0].name}</h3>
                  <p className="font-nautical-mono text-xs sm:text-sm text-[#f3d38c] truncate flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-[#d4af37] shrink-0" />
                    <span className="truncate">{top3[0].college || 'College'}</span>
                  </p>
                </div>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-nautical-mono text-4xl sm:text-5xl font-black text-[#d4af37]">{top3[0].totalScore}</span>
                  <span className="font-cinzel text-sm font-bold text-[#f3d38c]">PTS</span>
                </div>
              </div>
            )}

            {/* Rank 3 - Bronze */}
            {top3[2] && isRankRevealed(2) && (
              <div className="order-3 sm:order-3 rounded-2xl border border-[#8c6738]/50 bg-gradient-to-b from-[#1c160e]/80 to-[#0e0b07] p-6 sm:p-7 backdrop-blur-xl transition-all hover:scale-[1.02] shadow-[0_0_25px_rgba(0,0,0,0.8)] animate-fade-in bouncy-card">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8c6738]/20 border border-[#8c6738]/40 text-[#f3d38c] font-cinzel font-bold text-sm">
                    3RD
                  </div>
                  <Medal className="h-7 w-7 text-[#8c6738]" />
                </div>
                <div className="mt-4 space-y-1">
                  <div className="font-cinzel text-xs font-semibold text-[#8c6738] uppercase tracking-wider">
                    3rd Place
                  </div>
                  <h3 className="font-cinzel text-xl font-bold text-[#ebe4d5] truncate">{top3[2].name}</h3>
                  <p className="font-nautical-mono text-xs sm:text-sm text-[#f3d38c] truncate flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-[#d4af37] shrink-0" />
                    <span className="truncate">{top3[2].college || 'College'}</span>
                  </p>
                </div>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-nautical-mono text-3xl sm:text-4xl font-extrabold text-[#f3d38c]">{top3[2].totalScore}</span>
                  <span className="font-cinzel text-xs font-bold text-[#a68a56]">PTS</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clean Participant Leaderboard Table: Rank, Participant (Name & College), Score */}
        <div className="overflow-hidden rounded-2xl border border-[#a68a56]/25 bg-[#090704]/90 backdrop-blur-xl shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#a68a56]/20 bg-[#140f0a] font-cinzel text-xs sm:text-sm text-[#d4af37] uppercase tracking-wider">
                  <th className="py-4 px-6 w-24">Rank</th>
                  <th className="py-4 px-6">Participant</th>
                  <th className="py-4 px-6 text-right w-44">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#a68a56]/15 font-nautical-mono text-sm">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-[#a68a56]">
                      Waiting for participants to join and submit solutions...
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((entry, idx) => {
                    const revealed = isRankRevealed(idx);

                    if (!revealed) {
                      // Shrouded confidential row for suspense
                      return (
                        <tr key={entry.participantId} className="bg-[#050504]/60 opacity-60">
                          <td className="py-4 px-6 font-bold text-[#a68a56]">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs bg-[#1c160e] text-[#a68a56] font-cinzel font-bold">
                              #{idx + 1}
                            </span>
                          </td>
                          <td colSpan={2} className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <span className="h-2 w-2 rounded-full bg-[#d4af37] animate-ping" />
                              <span className="rounded-lg border border-[#a68a56]/20 bg-[#1c160e]/50 px-3 py-1 font-cinzel text-xs text-[#a68a56] uppercase tracking-widest">
                                🔒 Rank #{idx + 1} Hidden — Awaiting Reveal
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
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-cinzel ${
                              idx === 0
                                ? 'bg-[#d4af37] text-[#050504] font-black shadow-md shadow-[#d4af37]/30'
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

                        {/* Participant (Name & College) */}
                        <td className="py-4 px-6">
                          <div className="font-bold text-base text-[#ebe4d5] flex items-center gap-2 font-cinzel">
                            <span>{entry.name}</span>
                            {idx === 0 && <Crown className="h-4 w-4 text-[#d4af37] inline" />}
                          </div>
                          <div className="text-xs sm:text-sm text-[#f3d38c] font-nautical-mono flex items-center gap-1.5 mt-0.5">
                            <GraduationCap className="h-4 w-4 text-[#a68a56] shrink-0" />
                            <span>{entry.college || 'KTU Engineering College'}</span>
                          </div>
                        </td>

                        {/* Total Score */}
                        <td className="py-4 px-6 text-right">
                          <span className={`text-2xl font-black ${idx === 0 ? 'text-[#d4af37]' : 'text-[#f3d38c]'}`}>
                            {entry.totalScore}
                          </span>
                          <span className="text-xs text-[#a68a56] ml-1.5 font-cinzel font-semibold">PTS</span>
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

