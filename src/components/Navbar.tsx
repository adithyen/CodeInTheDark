'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Terminal, Trophy, ShieldCheck, Radio } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [isActiveContest, setIsActiveContest] = useState(false);

  useEffect(() => {
    const checkContest = async () => {
      try {
        const res = await fetch('/api/contest');
        if (res.ok) {
          const data = await res.json();
          setIsActiveContest(data.contest?.isActive || false);
        }
      } catch {
        // Ignore
      }
    };
    checkContest();
    const interval = setInterval(checkContest, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#070b12]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10 transition-transform group-hover:scale-105">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold tracking-tight text-white">
                CODE IN THE DARK
              </span>
              <span className="rounded bg-white/10 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-emerald-400">
                11:11
              </span>
            </div>
            <p className="text-[11px] text-gray-400">Algorithmic Edition · Chapter 2</p>
          </div>
        </Link>

        {/* Live Contest Indicator & Navigation */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 font-mono text-xs text-gray-300">
            <span
              className={`h-2 w-2 rounded-full ${
                isActiveContest ? 'animate-ping bg-emerald-400' : 'bg-gray-500'
              }`}
            />
            <span>{isActiveContest ? 'Round Active (50m)' : 'Lobby Standby'}</span>
          </div>

          <nav className="flex items-center gap-1.5">
            <Link
              href="/register"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-all ${
                pathname.startsWith('/arena') || pathname === '/register'
                  ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              <span>Arena</span>
            </Link>

            <Link
              href="/leaderboard"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-all ${
                pathname === '/leaderboard'
                  ? 'border border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>Leaderboard</span>
            </Link>

            <Link
              href="/admin"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-all ${
                pathname === '/admin'
                  ? 'border border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
