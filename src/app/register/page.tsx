'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, CheckCircle2, User, Hash, Monitor, AlertCircle, Clock, Lock, Loader2, Compass } from 'lucide-react';
import { ContestSession } from '@/types';
import NauticalCompass from '@/components/NauticalCompass';

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
        setCountdown('00:00');
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
          setError('Roll number already registered for this session.');
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
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 font-nautical-mono text-sm text-[#a68a56]">
          <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
          <span className="tracking-widest uppercase">Synchronizing Navigational Chart...</span>
        </div>
      </div>
    );
  }

  // ── Waiting Lobby (Registered Participant waiting for challenge to start) ──
  if (registeredParticipant && gateStatus !== 'ended' && gateStatus !== 'active') {
    return (
      <div className="relative flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg rounded-2xl border border-[#a68a56]/40 bg-[#090806]/90 p-8 backdrop-blur-2xl shadow-2xl shadow-black text-center space-y-6">
          
          <div className="flex flex-col items-center">
            <NauticalCompass size={90} showRings={true} />
            <span className="mt-4 inline-block rounded-full bg-[#1c160e] border border-[#d4af37]/50 px-3.5 py-1 font-nautical-mono text-xs font-semibold tracking-widest uppercase text-[#f3d38c]">
              ★ VOYAGER REGISTRATION VERIFIED ★
            </span>
            <h1 className="mt-3 font-cinzel text-2xl font-bold text-white tracking-wide">
              Welcome Aboard, {registeredParticipant.name}
            </h1>
            <p className="mt-1 font-nautical-mono text-xs text-[#a68a56]">
              Assigned Seat: <span className="text-[#f3d38c] font-bold">{registeredParticipant.terminalId || 'AUTO-ASSIGNED'}</span> · Roll No: <span className="text-[#d4af37] font-bold">{registeredParticipant.rollNumber}</span>
            </p>
          </div>

          {/* Chronometer Countdown Card */}
          <div className="rounded-2xl border border-[#d4af37]/35 bg-[#1c160e]/90 p-6 space-y-2 shadow-inner">
            <div className="flex items-center justify-center gap-2 font-nautical-mono text-xs tracking-wider uppercase text-[#f3d38c]">
              <Clock className="h-4 w-4 animate-spin text-[#d4af37]" />
              <span>Challenge Commences In</span>
            </div>
            <div className="font-nautical-mono text-5xl font-black tabular-nums text-[#d4af37] tracking-widest drop-shadow-[0_0_20px_rgba(212,175,55,0.4)]">
              {countdown || '--:--'}
            </div>
            <p className="text-[11px] font-nautical-mono text-[#a68a56] leading-relaxed">
              {session?.auto_start_on_reg_close
                ? 'Your terminal will automatically launch into the Blind Coding Arena when the chronometer expires.'
                : 'Stand by for the Captain to trigger the synchronized voyage start.'}
            </p>
          </div>

          {/* Navigational Readiness Checklist */}
          <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/70 p-4 text-left font-nautical-mono text-xs space-y-2.5">
            <div className="flex items-center justify-between text-[#f3d38c]">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#d4af37]" /> Ironclad Fullscreen Lock</span>
              <span className="text-[10px] text-[#a68a56] tracking-wider uppercase">ARMED</span>
            </div>
            <div className="flex items-center justify-between text-[#f3d38c]">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#d4af37]" /> C, Python, Java Runpack</span>
              <span className="text-[10px] text-[#a68a56] tracking-wider uppercase">READY</span>
            </div>
            <div className="flex items-center justify-between text-[#f3d38c]">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#d4af37]" /> Supabase Encrypted Log</span>
              <span className="text-[10px] text-[#a68a56] tracking-wider uppercase">SYNCHRONIZED</span>
            </div>
          </div>

          <div className="pt-1">
            <button
              onClick={async () => {
                try {
                  if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                  }
                } catch {}
              }}
              className="w-full rounded-xl border border-[#a68a56]/30 bg-[#1c160e] py-3 font-cinzel text-xs font-bold tracking-wider text-[#f3d38c] hover:bg-[#2a2218] hover:border-[#d4af37] transition-all bouncy-btn"
            >
              PRE-ENGAGE FULLSCREEN (RECOMMENDED)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gateStatus === 'not_open') {
    return (
      <div className="relative flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-[#a68a56]/30 bg-[#090806]/90 p-8 backdrop-blur-2xl shadow-2xl shadow-black text-center space-y-5">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl border border-[#a68a56]/40 bg-[#1c160e] text-[#f3d38c] shadow-lg shadow-black">
            <Lock className="h-8 w-8 text-[#d4af37]" />
          </div>
          <div>
            <h1 className="font-cinzel text-2xl font-bold tracking-wide text-[#f3d38c]">
              REGISTRATION SEALED
            </h1>
            <p className="mt-2 font-nautical-mono text-xs text-[#a68a56] leading-relaxed">
              The Chapter II contest registration window is currently locked by the organizers. Stand by for the official commencement signal.
            </p>
          </div>
          <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/70 p-3 font-nautical-mono text-xs text-[#a68a56]">
            <span className="animate-pulse text-[#d4af37]">⬤</span> Monitoring voyage frequency every 3s...
          </div>
        </div>
      </div>
    );
  }

  if (gateStatus === 'ended') {
    return (
      <div className="relative flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-[#a68a56]/30 bg-[#090806]/90 p-8 backdrop-blur-2xl shadow-2xl shadow-black text-center space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl border border-[#a68a56]/40 bg-[#1c160e] text-[#a68a56]">
            <Shield className="h-8 w-8 text-[#a68a56]" />
          </div>
          <h1 className="font-cinzel text-2xl font-bold text-[#f3d38c]">VOYAGE CONCLUDED</h1>
          <p className="font-nautical-mono text-xs text-[#a68a56]">This contest session has dropped anchor. Inspect the official leaderboard for results.</p>
        </div>
      </div>
    );
  }

  // gateStatus === 'open' or 'active'
  return (
    <div className="relative flex flex-1 items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#a68a56]/35 bg-[#090806]/90 p-8 backdrop-blur-2xl shadow-2xl shadow-black">
        
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#a68a56]/20 pb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#a68a56]/40 bg-[#1c160e] text-[#f3d38c] shadow-md shadow-black">
            <Compass className="h-6 w-6 text-[#d4af37]" />
          </div>
          <div>
            <h1 className="font-cinzel text-lg font-bold tracking-wider text-[#f3d38c]">CREW REGISTRATION</h1>
            <p className="font-nautical-mono text-[11px] text-[#a68a56]">{session?.label ?? '11:11 Chapter II · Blind Coding'}</p>
          </div>
        </div>

        {/* Registration Window Countdown */}
        {gateStatus === 'open' && session?.registration_ends_at && (
          <div className="mt-5 flex items-center justify-between rounded-xl border border-[#d4af37]/35 bg-[#1c160e]/80 px-4 py-2.5">
            <div className="flex items-center gap-2 font-nautical-mono text-xs text-[#f3d38c]">
              <Clock className="h-4 w-4 text-[#d4af37]" />
              <span className="uppercase tracking-wider">Registration Closes In</span>
            </div>
            <span className="font-nautical-mono text-lg font-bold tabular-nums text-[#d4af37]">
              {countdown || '--:--'}
            </span>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/20 p-3 text-xs font-nautical-mono text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 font-nautical-mono">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#f3d38c]">
              <User className="h-3.5 w-3.5 text-[#d4af37]" />
              Full Name / Team Lead
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Hawkins"
              required
              className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504]/80 px-3.5 py-2.5 text-sm text-[#ebe4d5] placeholder-[#a68a56]/40 transition-all focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#f3d38c]">
              <Hash className="h-3.5 w-3.5 text-[#d4af37]" />
              Roll Number / Registration ID
            </label>
            <input
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. 21CS089 or CREW-TITAN"
              required
              className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504]/80 px-3.5 py-2.5 text-sm text-[#ebe4d5] placeholder-[#a68a56]/40 transition-all focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#f3d38c]">
              <Monitor className="h-3.5 w-3.5 text-[#d4af37]" />
              Assigned Seat / Terminal ID <span className="text-[#a68a56]/60">(Optional)</span>
            </label>
            <input
              type="text"
              value={terminalId}
              onChange={(e) => setTerminalId(e.target.value)}
              placeholder="e.g. LAB-02-SEAT-14"
              className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504]/80 px-3.5 py-2.5 text-sm text-[#ebe4d5] placeholder-[#a68a56]/40 transition-all focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50"
            />
          </div>

          {/* System Check Pill */}
          <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/60 p-3 text-[11px] text-[#a68a56] space-y-1.5">
            <div className="flex items-center gap-2 text-[#f3d38c]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#d4af37]" />
              <span>Fullscreen lock &amp; anti-cheat shield armed</span>
            </div>
            <div className="flex items-center gap-2 text-[#f3d38c]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#d4af37]" />
              <span>C, Python, Java compiler runpack primed</span>
            </div>
            <div className="flex items-center gap-2 text-[#f3d38c]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#d4af37]" />
              <span>Persistent Supabase PostgreSQL backend active</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] py-3.5 font-cinzel text-sm font-bold tracking-wider text-[#050504] shadow-[0_4px_20px_rgba(212,175,55,0.3)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 bouncy-btn"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin text-[#050504]" /><span>BOARDING VESSEL...</span></>
            ) : (
              <><span>EMBARK INTO BLIND VOID</span><ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
