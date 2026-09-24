'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal, Shield, ArrowRight, CheckCircle2, User, Hash, Monitor, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [terminalId, setTerminalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if already registered in local storage
  useEffect(() => {
    const saved = localStorage.getItem('cid_participant');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.id) {
          router.push('/arena');
        }
      } catch {
        // Ignore
      }
    }
  }, [router]);

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
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      // Persist in localStorage for local-first resilience
      localStorage.setItem('cid_participant', JSON.stringify(data.participant));
      router.push('/arena');
    } catch {
      setError('Network connection failed. Please check connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-1 items-center justify-center p-4 sm:p-6 bg-grid-cyber">
      {/* Background glow */}
      <div className="pointer-events-none absolute h-[350px] w-[500px] radial-glow-emerald" />

      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c121d]/85 p-8 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Terminal className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-mono text-xl font-bold tracking-tight text-white">
              PARTICIPANT ONBOARDING
            </h1>
            <p className="text-xs text-gray-400">11:11 Chapter 2 · Code In The Dark</p>
          </div>
        </div>

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

          {/* System Check Checklist */}
          <div className="rounded-xl border border-white/5 bg-black/30 p-3 text-[11px] text-gray-400 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Fullscreen lock & anti-cheat shield active</span>
            </div>
            <div className="flex items-center gap-2 text-cyan-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
              <span>C, Python, Java runtime ready</span>
            </div>
            <div className="flex items-center gap-2 text-amber-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
              <span>Offline-first local cache enabled</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 font-mono text-sm font-bold text-black shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <span>Initializing Terminal...</span>
            ) : (
              <>
                <span>Enter Blind Arena</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
