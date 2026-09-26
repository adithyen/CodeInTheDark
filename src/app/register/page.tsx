'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, CheckCircle2, User, Phone, GraduationCap, Monitor, AlertCircle, Clock, Lock, Loader2, Compass } from 'lucide-react';
import { ContestSession } from '@/types';
import NauticalCompass from '@/components/NauticalCompass';
import { searchColleges } from '@/lib/colleges';

type GateStatus = 'loading' | 'not_open' | 'late_closed' | 'open' | 'active' | 'ended';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [terminalId, setTerminalId] = useState('');
  const [collegeSuggestions, setCollegeSuggestions] = useState<string[]>([]);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
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
        if (!s.allow_late_join) {
          setGateStatus('late_closed');
        } else {
          setGateStatus('active');
        }
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

  const handleCollegeChange = (val: string) => {
    setCollege(val);
    if (val.trim().length > 0) {
      const results = searchColleges(val, 8);
      setCollegeSuggestions(results);
      setShowCollegeDropdown(results.length > 0);
    } else {
      setCollegeSuggestions([]);
      setShowCollegeDropdown(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !college.trim()) {
      setError('Please provide your Name, Phone Number, and College.');
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
          phone: phone.trim(),
          college: college.trim(),
          terminalId: terminalId.trim() || `SEAT-${Math.floor(10 + Math.random() * 90)}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setError('This phone number is already registered for this session.');
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
              Assigned Seat: <span className="text-[#f3d38c] font-bold">{registeredParticipant.terminalId || 'AUTO-ASSIGNED'}</span>
              {registeredParticipant.college && (
                <> · College: <span className="text-[#d4af37] font-bold">{registeredParticipant.college}</span></>
              )}
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

  if (gateStatus === 'not_open' || gateStatus === 'ended') {
    return (
      <div className="relative flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-[#a68a56]/30 bg-[#090806]/90 p-8 backdrop-blur-2xl shadow-2xl shadow-black text-center space-y-5">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl border border-[#a68a56]/40 bg-[#1c160e] text-[#f3d38c] shadow-lg shadow-black">
            <Compass className="h-8 w-8 text-[#d4af37]" />
          </div>
          <div>
            <h1 className="font-cinzel text-2xl font-bold tracking-wide text-[#f3d38c]">
              Voyage Not Yet Started
            </h1>
            <p className="mt-2 font-nautical-mono text-xs text-[#a68a56] leading-relaxed">
              You will be able to board (register) for the voyage (contest) when the admin starts boarding.
            </p>
          </div>
          <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/70 p-3 font-nautical-mono text-xs text-[#a68a56] flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4af37]"></span>
            </span>
            <span>Awaiting admin boarding signal</span>
          </div>
          <div className="pt-1">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#a68a56]/30 bg-[#1c160e] px-5 py-2.5 font-cinzel text-xs font-bold tracking-wider text-[#f3d38c] hover:bg-[#2a2218] hover:border-[#d4af37] transition-all bouncy-btn"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (gateStatus === 'late_closed') {
    return (
      <div className="relative flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#090806]/95 p-8 backdrop-blur-2xl shadow-2xl shadow-black text-center space-y-5">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl border border-red-500/40 bg-red-950/30 text-red-400 shadow-lg shadow-black">
            <Lock className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <span className="inline-block rounded border border-red-500/40 bg-red-950/40 px-2.5 py-1 font-nautical-mono text-[10px] font-bold uppercase tracking-wider text-red-400">
              VOYAGE UNDERWAY · LATE ENTRY SEALED
            </span>
            <h1 className="mt-3 font-cinzel text-2xl font-bold tracking-wide text-[#f3d38c]">
              MUSTER PERIOD EXPIRED
            </h1>
            <p className="mt-2 font-nautical-mono text-xs text-[#a68a56] leading-relaxed">
              The contest challenge is currently underway and late join has been strictly locked by Admiralty commands.
            </p>
          </div>
          <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/70 p-3 font-nautical-mono text-xs text-[#a68a56]">
            <span className="animate-pulse text-[#d4af37]">⬤</span> Monitoring voyage frequency every 3s...
          </div>
          <div className="pt-1">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#a68a56]/30 bg-[#1c160e] px-5 py-2.5 font-cinzel text-xs font-bold tracking-wider text-[#f3d38c] hover:bg-[#2a2218] hover:border-[#d4af37] transition-all bouncy-btn"
            >
              Return to Home
            </Link>
          </div>
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

        {/* Late Entry Notice */}
        {gateStatus === 'active' && (
          <div className="mt-5 flex items-center justify-between rounded-xl border border-[#d4af37]/40 bg-[#1c160e]/90 px-4 py-2.5">
            <div className="flex items-center gap-2 font-nautical-mono text-xs text-[#f3d38c]">
              <Compass className="h-4 w-4 text-[#d4af37] animate-spin" />
              <span className="uppercase tracking-wider font-semibold">Late Entry Permitted</span>
            </div>
            <span className="font-nautical-mono text-[10px] font-bold text-emerald-400 border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 rounded">
              VOYAGE ACTIVE
            </span>
          </div>
        )}

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
          {/* 1. Full Name */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#f3d38c]">
              <User className="h-3.5 w-3.5 text-[#d4af37]" />
              Full Name
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

          {/* 2. Phone Number */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-[#f3d38c]">
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-[#d4af37]" />
                Phone Number
              </span>
              <span className="text-[10px] text-[#a68a56]">Admin Only · Strictly Confidential</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              required
              className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504]/80 px-3.5 py-2.5 text-sm text-[#ebe4d5] placeholder-[#a68a56]/40 transition-all focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50"
            />
          </div>

          {/* 3. College with Live Autocomplete Suggestions */}
          <div className="relative">
            <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-[#f3d38c]">
              <span className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-[#d4af37]" />
                College / Institution
              </span>
              <span className="text-[10px] text-[#a68a56]">KTU Affiliated</span>
            </label>
            <input
              type="text"
              value={college}
              onChange={(e) => handleCollegeChange(e.target.value)}
              onFocus={() => {
                if (college.trim().length > 0) {
                  const results = searchColleges(college, 8);
                  setCollegeSuggestions(results);
                  setShowCollegeDropdown(results.length > 0);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowCollegeDropdown(false), 250);
              }}
              placeholder="Start typing your college (e.g. Barton Hill, CET...)"
              required
              className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504]/80 px-3.5 py-2.5 text-sm text-[#ebe4d5] placeholder-[#a68a56]/40 transition-all focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50"
            />

            {/* Suggestions Dropdown */}
            {showCollegeDropdown && collegeSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-56 overflow-y-auto rounded-xl border border-[#d4af37]/40 bg-[#0c0906]/98 p-1.5 shadow-2xl shadow-black backdrop-blur-2xl">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#a68a56] border-b border-[#a68a56]/15 mb-1">
                  Matching Colleges ({collegeSuggestions.length})
                </div>
                {collegeSuggestions.map((col, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={() => {
                      setCollege(col);
                      setShowCollegeDropdown(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-nautical-mono text-xs text-[#ebe4d5] hover:bg-[#1c160e] hover:text-[#f3d38c] transition-colors"
                  >
                    <GraduationCap className="h-3 w-3 shrink-0 text-[#d4af37]" />
                    <span className="truncate">{col}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4. Seat Number (Optional) */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#f3d38c]">
              <Monitor className="h-3.5 w-3.5 text-[#d4af37]" />
              Seat Number <span className="text-[#a68a56]/60">(Optional)</span>
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
