'use client';

import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Medal, Flame, ShieldAlert, Sparkles, Maximize, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { LeaderboardEntry } from '@/types';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(4);
  const [contestTitle, setContestTitle] = useState('11:11 Chapter 2 — Code In The Dark');
  const [isRevealMode, setIsRevealMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setTotalQuestions(data.totalQuestions || 4);
        setContestTitle(data.contestTitle || '11:11 Chapter 2 — Code In The Dark');
        
        // Trigger celebratory confetti on reveal mode activation
        if (data.isRevealMode && !isRevealMode) {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#00E676', '#00B0FF', '#FFB300', '#FF5252'],
          });
        }
        setIsRevealMode(data.isRevealMode || false);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [isRevealMode]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 4000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const top3 = leaderboard.slice(0, 3);
  const restOfBoard = leaderboard.slice(3);

  return (
    <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-[#06090e] p-4 sm:p-6 lg:p-8 bg-grid-cyber">
      {/* Background Lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 radial-glow-emerald" />

      {/* Header Bar */}
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between border-b border-white/[0.08] pb-6">
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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3.5 py-1.5 font-mono text-xs text-gray-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Updated {lastUpdated || 'Live'}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-all"
            title="Toggle Stage Fullscreen"
          >
            <Maximize className="h-4 w-4" />
            <span className="hidden sm:inline">Projector View</span>
          </button>
        </div>
      </div>

      <div className="mx-auto mt-8 w-full max-w-7xl flex-1">
        {/* Podium Top 3 Cards (If participants exist) */}
        {leaderboard.length > 0 && (
          <div className="mb-10 grid gap-4 sm:grid-cols-3">
            {/* Rank 2 - Silver */}
            {top3[1] && (
              <div className="order-2 sm:order-1 rounded-2xl border border-gray-400/30 bg-gradient-to-b from-gray-900/60 to-[#0c121d] p-6 backdrop-blur-xl transition-all hover:scale-[1.02] shadow-xl">
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

            {/* Rank 1 - Gold (Elevated) */}
            {top3[0] && (
              <div className="order-1 sm:order-2 rounded-2xl border-2 border-amber-400/50 bg-gradient-to-b from-amber-950/40 via-yellow-950/20 to-[#0c121d] p-6 sm:-mt-4 backdrop-blur-xl shadow-2xl shadow-amber-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-black font-mono font-extrabold text-xl shadow-lg shadow-amber-400/30">
                    1
                  </div>
                  <Trophy className="h-8 w-8 text-amber-400 animate-bounce" />
                </div>
                <div className="mt-4">
                  <h3 className="font-mono text-xl font-extrabold text-white truncate">{top3[0].name}</h3>
                  <p className="font-mono text-xs text-amber-200/80">{top3[0].rollNumber} · {top3[0].terminalId}</p>
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
            {top3[2] && (
              <div className="order-3 sm:order-3 rounded-2xl border border-amber-700/40 bg-gradient-to-b from-amber-950/20 to-[#0c121d] p-6 backdrop-blur-xl transition-all hover:scale-[1.02] shadow-xl">
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
                    const isPodium = idx < 3;
                    return (
                      <tr
                        key={entry.participantId}
                        className={`transition-colors hover:bg-white/[0.04] ${
                          idx === 0
                            ? 'bg-amber-500/[0.04]'
                            : idx === 1
                            ? 'bg-gray-400/[0.02]'
                            : idx === 2
                            ? 'bg-amber-700/[0.02]'
                            : ''
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-4 px-6 font-bold">
                          <span
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs ${
                              idx === 0
                                ? 'bg-amber-400 text-black font-extrabold'
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
                          <div className="font-bold text-white">{entry.name}</div>
                          <div className="text-xs text-gray-400">{entry.rollNumber} · {entry.terminalId}</div>
                        </td>

                        {/* Total Score */}
                        <td className="py-4 px-6">
                          <span className="text-lg font-extrabold text-emerald-400">
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
