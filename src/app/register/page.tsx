'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal, Shield, ArrowRight, CheckCircle2, User, Hash, Monitor, AlertCircle, Clock, Lock, Loader2 } from 'lucide-react';
import { ContestSession } from '@/types';

type GateStatus = 'loading' | 'not_open' | 'open' | 'active' | 'ended';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [terminalId, setTerminalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [session, setSession] = useState<ContestSession | null>(null);
  const [gateStatus, setGateStatus] = useState<GateStatus>('loading');
  const [countdown, setCountdown] = useState('');
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  const fetchContestState = useCallback(async () => {
    try {
      const res = await fetch('/api/contest');
      if (!res.ok) return;
      const data = await res.json();
      const s: ContestSession = data.session;
      const serverNow: number = data.serverTime;
      setServerTimeOffset(serverNow - Date.now());
      setSession(s);

      if (s.phase === 'active' || s.phase === 'paused') {
        setGateStatus('active');
      } else if (s.phase === 'registration') {
        setGateStatus('open');
      } else if (s.phase === 'ended' || s.phase === 'reveal') {
        setGateStatus('ended');
      } else {
        setGateStatus('not_open');
      }
    } catch {
      setGateStatus('not_open');
    }
  }, []);

  // Poll every 3 seconds
  useEffect(() => {
    fetchContestState();
    const interval = setInterval(fetchContestState, 3000);
    return () => clearInterval(interval);
  }, [fetchContestState]);

  const [registeredParticipant, setRegisteredParticipant] = useState<any>(null);

  // Check if already registered in this session and redirect if active
  useEffect(() => {
    const saved = localStorage.getItem('cid_participant');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.id && p.sessionId && session && p.sessionId === session.id) {
          setRegisteredParticipant(p);
          if (gateStatus === 'active') {
            router.push('/arena');
          }
        }
      } catch { /* ignore */ }
    }
  }, [session, gateStatus, router]);

  // Live countdown ticker
  useEffect(() => {
    if (!session?.registration_ends_at || gateStatus !== 'open') return;

    const tick = () => {
      const now = Date.now() + serverTimeOffset;
      const remaining = (session.registration_ends_at ?? 0) - now;
      if (remaining <= 0) {
        setCountdown('Closing...');
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session, gateStatus, serverTimeOffset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rollNumber.trim()) {
      setError('Please provide your full name and Roll Number / Team ID.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          rollNumber: rollNumber.trim().toUpperCase(),
          terminalId: terminalId.trim() || `SEAT-${Math.floor(10 + Math.random() * 90)}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Already registered — use existing participant info
          setError('Roll number already registered. If this is you, please wait for the contest to begin.');
        } else {
          setError(data.error || 'Registration failed');
        }
        setLoading(false);
        return;
      }

      const pData = {
        ...data.participant,
        sessionId: session?.id,
      };

      // Persist participant + session ID in localStorage
      localStorage.setItem('cid_participant', JSON.stringify(pData));
      setRegisteredParticipant(pData);

      // Attempt fullscreen
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch { /* arena will prompt */ }

      if (session?.phase === 'active' || session?.phase === 'paused') {
        router.push('/arena');
      }
    } catch {
      setError('Network connection failed. Please check your connection and try again.');
      setLoading(false);
    }
  };

  // ── Gate States ─────────────────────────────────────────────────────

  if (gateStatus === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3 font-mono text-sm text-gray-400">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
          <span>Checking contest status...</span>
        </div>
      </div>
    );
  }

  // ── Waiting Lobby (Registered Participant waiting for challenge to start) ──
  if (registeredParticipant && gateStatus !== 'ended' && gateStatus !== 'active') {
    return (
      <div className="relative flex flex-1 items-center justify-center p-4 sm:p-6 bg-grid-cyber">
        <div className="pointer-events-none absolute h-[400px] w-[600px] radial-glow-emerald" />
        <div className="w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-[#0c121d]/90 p-8 backdrop-blur-2xl shadow-2xl text-center space-y-6">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-mono text-xs font-semibold text-emerald-300 mb-2">
              Registration Confirmed
            </span>
            <h1 className="font-mono text-2xl font-bold text-white tracking-tight">
              Welcome, {registeredParticipant.name}
            </h1>
            <p className="mt-1 font-mono text-xs text-gray-400">
              Terminal: <span className="text-amber-400 font-bold">{registeredParticipant.terminalId || 'AUTO-ASSIGNED'}</span> · Roll No: <span className="text-cyan-400 font-bold">{registeredParticipant.rollNumber}</span>
            </p>
          </div>

          {/* Countdown card */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6 space-y-2">
            <div className="flex items-center justify-center gap-2 font-mono text-xs text-amber-300">
              <Clock className="h-4 w-4 animate-spin text-amber-400" />
              <span>Contest Starts In</span>
            </div>
            <div className="font-mono text-5xl font-black tabular-nums text-amber-400 tracking-wider">
              {countdown || '--:--'}
            </div>
            <p className="text-[11px] font-mono text-gray-400">
              {session?.auto_start_on_reg_close
                ? 'Arena will automatically unlock and launch when the timer expires.'
                : 'Waiting for the organizer to initiate the contest countdown.'}
            </p>
          </div>

          {/* Readiness Indicators */}
          <div className="rounded-xl border border-white/5 bg-black/40 p-4 text-left font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-emerald-300">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Anti-Cheat Lockdown</span>
              <span className="text-[10px] text-gray-500">ARMED</span>
            </div>
            <div className="flex items-center justify-between text-cyan-300">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-400" /> C / Python / Java Runpack</span>
              <span className="text-[10px] text-gray-500">READY</span>
            </div>
            <div className="flex items-center justify-between text-amber-300">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400" /> Database Persistence</span>
              <span className="text-[10px] text-gray-500">SUPABASE LIVE</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={async () => {
                try {
                  if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                  }
                } catch {}
              }}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 font-mono text-xs text-gray-300 hover:bg-white/10 transition-colors"
            >
              Enter Fullscreen Now (Recommended)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gateStatus === 'not_open') {
    return (
      <div className="relative flex flex-1 items-center justify-center p-4 bg-grid-cyber">
        <div className="pointer-events-none absolute h-[350px] w-[500px] radial-glow-emerald" />
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c121d]/85 p-8 backdrop-blur-2xl shadow-2xl text-center space-y-4">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
            <Lock className="h-7 w-7 text-amber-400" />
          </div>
          <h1 className="font-mono text-xl font-bold text-white">Registration Not Open</h1>
          <p className="text-sm text-gray-400">
            The contest organizer hasn&apos;t opened the registration window yet. Please wait for the announcement.
          </p>
          <div className="rounded-xl border border-white/5 bg-black/30 p-3 font-mono text-xs text-gray-400">
            <span className="animate-pulse">⬤</span> Checking every 3 seconds...
          </div>
        </div>
      </div>
    );
  }

  if (gateStatus === 'ended') {
    return (
      <div className="relative flex flex-1 items-center justify-center p-4 bg-grid-cyber">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c121d]/85 p-8 backdrop-blur-2xl shadow-2xl text-center space-y-4">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl border border-gray-500/30 bg-gray-500/10">
            <Shield className="h-7 w-7 text-gray-400" />
          </div>
          <h1 className="font-mono text-xl font-bold text-white">Contest Ended</h1>
          <p className="text-sm text-gray-400">This contest session has concluded. Check the leaderboard for results.</p>
        </div>
      </div>
    );
  }

  // gateStatus === 'open' or 'active'
  return (
    <div className="relative flex flex-1 items-center justify-center p-4 sm:p-6 bg-grid-cyber">
      <div className="pointer-events-none absolute h-[350px] w-[500px] radial-glow-emerald" />

      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c121d]/85 p-8 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Terminal className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-mono text-xl font-bold tracking-tight text-white">PARTICIPANT ONBOARDING</h1>
            <p className="text-xs text-gray-400">{session?.label ?? '11:11 Chapter 2 · Code In The Dark'}</p>
          </div>
        </div>

        {/* Registration Countdown */}
        {gateStatus === 'open' && session?.registration_ends_at && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-2.5">
            <div className="flex items-center gap-2 font-mono text-xs text-amber-300">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>Registration closes in</span>
            </div>
            <span className="font-mono text-lg font-bold tabular-nums text-amber-400">
              {countdown || '--:--'}
            </span>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 font-mono text-xs font-medium text-gray-300">
              <User className="h-3.5 w-3.5 text-emerald-400" />
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Johnson"
              required
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 font-mono text-sm text-white placeholder-gray-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 font-mono text-xs font-medium text-gray-300">
              <Hash className="h-3.5 w-3.5 text-cyan-400" />
              Roll Number / Registration ID / Team Name
            </label>
            <input
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. 21CS089 or TEAM-TITAN"
              required
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 font-mono text-sm text-white placeholder-gray-500 transition-all focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 font-mono text-xs font-medium text-gray-300">
              <Monitor className="h-3.5 w-3.5 text-amber-400" />
              Seat / Terminal ID <span className="text-gray-500">(Optional)</span>
            </label>
            <input
              type="text"
              value={terminalId}
              onChange={(e) => setTerminalId(e.target.value)}
              placeholder="e.g. LAB-02-SEAT-14"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 font-mono text-sm text-white placeholder-gray-500 transition-all focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>

          {/* System Check */}
          <div className="rounded-xl border border-white/5 bg-black/30 p-3 text-[11px] text-gray-400 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Fullscreen lock &amp; anti-cheat shield active</span>
            </div>
            <div className="flex items-center gap-2 text-cyan-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
              <span>C, Python, Java runtime ready</span>
            </div>
            <div className="flex items-center gap-2 text-amber-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
              <span>Persistent Supabase backend connected</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 font-mono text-sm font-bold text-black shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /><span>Initializing Terminal...</span></>
            ) : (
              <><span>Enter Blind Arena</span><ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
