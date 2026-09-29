'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, CheckCircle2, User, Phone, GraduationCap, Monitor, AlertCircle, Clock, Lock, Loader2, Compass, Maximize2 } from 'lucide-react';
import { ContestSession } from '@/types';
import NauticalCompass from '@/components/NauticalCompass';
import { searchColleges, CollegeSearchResult } from '@/lib/colleges';

type GateStatus = 'loading' | 'not_open' | 'late_closed' | 'open' | 'active' | 'ended';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [terminalId, setTerminalId] = useState('');
  const [collegeSuggestions, setCollegeSuggestions] = useState<CollegeSearchResult[]>([]);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [session, setSession] = useState<ContestSession | null>(null);
  const [gateStatus, setGateStatus] = useState<GateStatus>('loading');
  const [countdown, setCountdown] = useState('');
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [registeredParticipant, setRegisteredParticipant] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Synchronize fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    handleFsChange();
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Wipe out stored participant details completely on mount/reload
  useEffect(() => {
    try {
      localStorage.removeItem('cid_participant');
      if (typeof document !== 'undefined') {
        document.cookie.split(';').forEach((c) => {
          document.cookie = c
            .replace(/^ +/, '')
            .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
        });
      }
    } catch {}

    // Reset all registration form fields & state
    setName('');
    setPhone('');
    setCollege('');
    setTerminalId('');
    setError('');
    setRegisteredParticipant(null);
  }, []);

  const handleLaunchArena = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {}
    router.push('/arena');
  }, [router]);

  const fetchContestState = useCallback(async () => {
    try {
      const res = await fetch('/api/contest');
      if (!res.ok) return;
      const data = await res.json();
      const s: ContestSession = data.session;
      const serverNow: number = data.serverTime;
      setServerTimeOffset(serverNow - Date.now());
      setSession(s);

      const isLive = s.phase === 'active' || s.phase === 'paused';

      // If participant just registered in this session and contest is live, immediately enter arena!
      if (isLive && registeredParticipant && registeredParticipant.id && (!registeredParticipant.sessionId || registeredParticipant.sessionId === s.id)) {
        handleLaunchArena();
        return;
      }

      // Gate status for registration form
      if (isLive) {
        setGateStatus(s.allow_late_join ? 'open' : 'late_closed');
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
  }, [registeredParticipant, handleLaunchArena]);

  // Poll every 3 seconds
  useEffect(() => {
    fetchContestState();
    const interval = setInterval(fetchContestState, 3000);
    return () => clearInterval(interval);
  }, [fetchContestState]);

  // Reactive redirect: whenever session or registeredParticipant changes, if contest is live, launch arena!
  useEffect(() => {
    const isLive = session?.phase === 'active' || session?.phase === 'paused';
    if (registeredParticipant && isLive && (!registeredParticipant.sessionId || registeredParticipant.sessionId === session?.id)) {
      handleLaunchArena();
    }
  }, [registeredParticipant, session?.phase, session?.id, handleLaunchArena]);

  // Live countdown ticker
  useEffect(() => {
    if (!session?.registration_ends_at || session?.phase !== 'registration') return;

    const tick = () => {
      const now = Date.now() + serverTimeOffset;
      const remaining = (session.registration_ends_at ?? 0) - now;
      if (remaining <= 0) {
        setCountdown('00:00');
        fetchContestState();
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session?.registration_ends_at, session?.phase, serverTimeOffset, fetchContestState]);

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

  // ── Active Launch Screen (Participant registered and contest live) ──
  if (registeredParticipant && (session?.phase === 'active' || session?.phase === 'paused')) {
    return (
      <div className="relative flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg rounded-2xl border border-emerald-500/50 bg-[#090806]/95 p-8 backdrop-blur-2xl shadow-2xl shadow-black text-center space-y-6">
          <div className="flex flex-col items-center">
            <NauticalCompass size={90} showRings={true} />
            <span className="mt-4 inline-block rounded-full bg-emerald-950/60 border border-emerald-500/50 px-4 py-1.5 font-nautical-mono text-xs font-bold tracking-widest uppercase text-emerald-400">
              ● CONTEST IN PROGRESS · ARENA ACTIVE ●
            </span>
            <h1 className="mt-3 font-cinzel text-2xl sm:text-3xl font-bold text-[#f3d38c] tracking-wide">
              Entering Blind Coding Arena
            </h1>
            <p className="mt-1.5 font-nautical-mono text-sm text-[#ebe4d5]/80">
              Participant: <span className="text-[#f3d38c] font-semibold">{registeredParticipant.name}</span>
              {registeredParticipant.college && (
                <> · College: <span className="text-[#ebe4d5] font-semibold">{registeredParticipant.college}</span></>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/40 bg-[#121810]/80 p-6 space-y-4 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
            <div className="flex items-center justify-center gap-2 font-nautical-mono text-xs uppercase tracking-wider text-emerald-300">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              <span>Transferring control to terminal...</span>
            </div>
            <button
              onClick={handleLaunchArena}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-[#d4af37] to-amber-400 py-3.5 font-cinzel text-sm font-black tracking-wider text-[#050504] hover:brightness-110 shadow-lg shadow-black bouncy-btn"
            >
              <ArrowRight className="h-5 w-5 stroke-[2.5]" /> ENTER ARENA NOW
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Waiting Lobby (Registered Participant waiting for challenge to start) ──
  if (registeredParticipant && gateStatus !== 'ended' && session?.phase !== 'active' && session?.phase !== 'paused') {
    return (
      <div className="relative flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-3xl rounded-3xl border border-[#d4af37]/40 bg-[#0c0906]/95 p-8 sm:p-12 backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.9)] text-center space-y-8">
          
          <div className="flex flex-col items-center">
            <NauticalCompass size={104} showRings={true} />
            <span className="mt-5 inline-block rounded-full bg-[#1c160e] border border-[#d4af37]/60 px-5 py-2 font-nautical-mono text-xs sm:text-sm font-bold tracking-widest uppercase text-[#f3d38c] shadow-lg">
              ✓ REGISTRATION CONFIRMED
            </span>
            <h1 className="mt-4 font-cinzel text-3xl sm:text-4xl font-black text-white tracking-wide">
              Welcome, {registeredParticipant.name}
            </h1>
            <div className="mt-3 font-nautical-mono text-base sm:text-lg text-[#ebe4d5] leading-relaxed">
              <span>Assigned Seat: <strong className="text-[#f3d38c] font-black text-lg sm:text-xl">{registeredParticipant.terminalId || 'AUTO-ASSIGNED'}</strong></span>
              {registeredParticipant.college && (
                <div className="mt-1 text-[#d4af37] font-semibold text-sm sm:text-base">{registeredParticipant.college}</div>
              )}
            </div>
          </div>

          {/* Chronometer Countdown Card */}
          <div className="rounded-2xl border border-[#d4af37]/50 bg-[#1c160e]/95 p-8 sm:p-10 space-y-4 shadow-inner">
            <div className="flex items-center justify-center gap-2 font-nautical-mono text-sm sm:text-base font-bold tracking-wider uppercase text-[#f3d38c]">
              <Clock className="h-4 w-4 animate-spin text-[#d4af37]" />
              <span>Contest Starts In</span>
            </div>
            <div className="font-nautical-mono text-6xl sm:text-7xl md:text-8xl font-black tabular-nums text-[#d4af37] tracking-widest drop-shadow-[0_0_35px_rgba(212,175,55,0.45)] py-2">
              {countdown || '--:--'}
            </div>
            <p className="text-xs sm:text-sm font-nautical-mono text-[#ebe4d5]/90 leading-relaxed max-w-xl mx-auto">
              {session?.auto_start_on_reg_close
                ? 'Your screen will automatically transition into the Coding Arena when the countdown reaches zero.'
                : 'Please stand by. The contest administrator will initiate the synchronized contest start shortly.'}
            </p>
          </div>

          {/* Fullscreen Trigger: Only visible when web browser is NOT in fullscreen mode */}
          {!isFullscreen && (
            <div className="pt-2">
              <button
                onClick={async () => {
                  try {
                    if (!document.fullscreenElement) {
                      await document.documentElement.requestFullscreen();
                    }
                  } catch {}
                }}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] py-4 font-cinzel text-sm sm:text-base font-black tracking-wider text-[#050504] hover:brightness-110 shadow-[0_0_25px_rgba(212,175,55,0.35)] transition-all bouncy-btn"
              >
                <Maximize2 className="h-5 w-5 stroke-[2.5]" /> ENTER FULLSCREEN MODE
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gateStatus === 'not_open' || gateStatus === 'ended') {
    return (
      <div className="relative flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg rounded-2xl border border-[#a68a56]/35 bg-[#090806]/95 p-8 sm:p-10 backdrop-blur-2xl shadow-2xl shadow-black text-center space-y-6">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl border border-[#a68a56]/40 bg-[#1c160e] text-[#f3d38c] shadow-lg shadow-black">
            <Compass className="h-8 w-8 text-[#d4af37]" />
          </div>
          <div>
            <h1 className="font-cinzel text-2xl font-bold tracking-wide text-[#f3d38c]">
              Registration Closed
            </h1>
            <p className="mt-2.5 font-nautical-mono text-sm text-[#ebe4d5]/75 leading-relaxed">
              Registration for this contest session is currently closed or not yet active. Please wait for the contest administrator to begin registration.
            </p>
          </div>
          <div className="rounded-xl border border-[#a68a56]/25 bg-[#050504]/70 p-3.5 font-nautical-mono text-xs text-[#a68a56] flex items-center justify-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4af37]"></span>
            </span>
            <span>Checking contest status automatically...</span>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#a68a56]/35 bg-[#1c160e] px-6 py-3 font-cinzel text-xs font-bold tracking-wider text-[#f3d38c] hover:bg-[#2a2218] hover:border-[#d4af37] transition-all bouncy-btn"
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
      <div className="relative flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg rounded-2xl border border-red-500/35 bg-[#090806]/95 p-8 sm:p-10 backdrop-blur-2xl shadow-2xl shadow-black text-center space-y-6">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl border border-red-500/40 bg-red-950/30 text-red-400 shadow-lg shadow-black">
            <Lock className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <span className="inline-block rounded border border-red-500/40 bg-red-950/40 px-3 py-1 font-nautical-mono text-xs font-bold uppercase tracking-wider text-red-300">
              CONTEST IN PROGRESS · REGISTRATION CLOSED
            </span>
            <h1 className="mt-3.5 font-cinzel text-2xl font-bold tracking-wide text-[#f3d38c]">
              Late Entry Not Permitted
            </h1>
            <p className="mt-2.5 font-nautical-mono text-sm text-[#ebe4d5]/75 leading-relaxed">
              The competition has already started and late entries are blocked for this contest session.
            </p>
          </div>
          <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/70 p-3.5 font-nautical-mono text-xs text-[#a68a56]">
            <span className="animate-pulse text-[#d4af37]">⬤</span> Listening for contest updates...
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#a68a56]/30 bg-[#1c160e] px-6 py-3 font-cinzel text-xs font-bold tracking-wider text-[#f3d38c] hover:bg-[#2a2218] hover:border-[#d4af37] transition-all bouncy-btn"
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
    <div className="relative flex flex-1 items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-xl rounded-2xl border border-[#a68a56]/35 bg-[#090806]/95 p-8 sm:p-10 backdrop-blur-2xl shadow-2xl shadow-black">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-[#a68a56]/20 pb-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#a68a56]/40 bg-[#1c160e] text-[#f3d38c] shadow-md shadow-black">
            <Compass className="h-7 w-7 text-[#d4af37]" />
          </div>
          <div>
            <h1 className="font-cinzel text-xl sm:text-2xl font-bold tracking-wider text-[#f3d38c]">
              CONTEST REGISTRATION
            </h1>
            <p className="font-nautical-mono text-xs sm:text-sm text-[#a68a56] mt-0.5">
              {session?.label ?? 'Code In The Dark · Blind Coding Arena'}
            </p>
          </div>
        </div>

        {/* Late Entry Notice */}
        {gateStatus === 'active' && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-[#d4af37]/40 bg-[#1c160e]/90 px-4 py-3">
            <div className="flex items-center gap-2.5 font-nautical-mono text-sm text-[#f3d38c]">
              <Compass className="h-4 w-4 text-[#d4af37] animate-spin" />
              <span className="uppercase tracking-wider font-semibold">Late Entry Permitted</span>
            </div>
            <span className="font-nautical-mono text-xs font-bold text-emerald-400 border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-1 rounded">
              CONTEST LIVE
            </span>
          </div>
        )}

        {/* Registration Window Countdown */}
        {gateStatus === 'open' && session?.registration_ends_at && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-[#d4af37]/35 bg-[#1c160e]/80 px-4 py-3">
            <div className="flex items-center gap-2.5 font-nautical-mono text-sm text-[#f3d38c]">
              <Clock className="h-4 w-4 text-[#d4af37]" />
              <span className="uppercase tracking-wider">Registration Closes In</span>
            </div>
            <span className="font-nautical-mono text-xl font-bold tabular-nums text-[#d4af37]">
              {countdown || '--:--'}
            </span>
          </div>
        )}

        {error && (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-red-500/40 bg-red-950/30 p-3.5 text-sm font-nautical-mono text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="mt-7 space-y-5 font-nautical-mono">
          {/* 1. Full Name */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#f3d38c]">
              <User className="h-4 w-4 text-[#d4af37]" />
              Full Name
            </label>
            <input
              type="text"
              name="participant_fullname"
              autoComplete="off"
              spellCheck="false"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Adithyan H"
              required
              className="w-full rounded-xl border border-[#a68a56]/35 bg-[#050504]/90 px-4 py-3 text-base text-[#ebe4d5] placeholder-[#a68a56]/45 transition-all focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50"
            />
          </div>

          {/* 2. Phone Number */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#f3d38c]">
              <Phone className="h-4 w-4 text-[#d4af37]" />
              Phone Number
            </label>
            <input
              type="tel"
              name="participant_phone"
              autoComplete="off"
              spellCheck="false"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              required
              className="w-full rounded-xl border border-[#a68a56]/35 bg-[#050504]/90 px-4 py-3 text-base text-[#ebe4d5] placeholder-[#a68a56]/45 transition-all focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50"
            />
          </div>

          {/* 3. College with Live Autocomplete Suggestions */}
          <div className="relative">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#f3d38c]">
              <GraduationCap className="h-4 w-4 text-[#d4af37]" />
              College / Institution
            </label>
            <input
              type="text"
              name="participant_college"
              autoComplete="off"
              spellCheck="false"
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
              placeholder="Search or enter your college (e.g. Sree Chitra Thirunal...)"
              required
              className="w-full rounded-xl border border-[#a68a56]/35 bg-[#050504]/90 px-4 py-3 text-base text-[#ebe4d5] placeholder-[#a68a56]/45 transition-all focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50"
            />

            {/* Suggestions Dropdown */}
            {showCollegeDropdown && collegeSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 max-h-60 overflow-y-auto rounded-xl border border-[#d4af37]/45 bg-[#0c0906]/98 p-2 shadow-2xl shadow-black backdrop-blur-2xl">
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#a68a56] border-b border-[#a68a56]/20 mb-1">
                  Matching Colleges ({collegeSuggestions.length})
                </div>
                {collegeSuggestions.map((col, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={() => {
                      setCollege(col.name);
                      setShowCollegeDropdown(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left font-nautical-mono text-sm text-[#ebe4d5] hover:bg-[#1c160e] hover:text-[#f3d38c] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <GraduationCap className="h-4 w-4 shrink-0 text-[#d4af37]" />
                      <span className="truncate">{col.name}</span>
                    </div>
                    {col.code && (
                      <span className="shrink-0 text-xs font-bold text-[#d4af37] bg-[#1c160e] px-2 py-0.5 rounded border border-[#d4af37]/35">
                        {col.code}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4. Seat / Terminal Number (Optional) */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#f3d38c]">
              <Monitor className="h-4 w-4 text-[#d4af37]" />
              Terminal / Seat Number <span className="text-[#a68a56]/70 text-xs font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              name="participant_seat"
              autoComplete="off"
              spellCheck="false"
              value={terminalId}
              onChange={(e) => setTerminalId(e.target.value)}
              placeholder="e.g. LAB-02-SEAT-14"
              className="w-full rounded-xl border border-[#a68a56]/35 bg-[#050504]/90 px-4 py-3 text-base text-[#ebe4d5] placeholder-[#a68a56]/45 transition-all focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] py-4 font-cinzel text-sm sm:text-base font-bold tracking-wider text-[#050504] shadow-[0_4px_24px_rgba(212,175,55,0.35)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 bouncy-btn cursor-pointer"
          >
            {loading ? (
              <><Loader2 className="h-5 w-5 animate-spin text-[#050504]" /><span>REGISTERING PARTICIPANT...</span></>
            ) : (
              <><span>ENTER CONTEST ARENA</span><ArrowRight className="h-5 w-5" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
