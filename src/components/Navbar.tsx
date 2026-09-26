'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radio } from 'lucide-react';
import NauticalCompass from './NauticalCompass';

export default function Navbar() {
  const pathname = usePathname();
  const [isActiveContest, setIsActiveContest] = useState(false);
  const [contestPhase, setContestPhase] = useState<string>('setup');

  useEffect(() => {
    const checkContest = async () => {
      try {
        const res = await fetch('/api/contest');
        if (res.ok) {
          const data = await res.json();
          setIsActiveContest(data.contest?.isActive || false);
          setContestPhase(data.session?.phase || 'setup');
        }
      } catch { /* ignore */ }
    };
    checkContest();
    const interval = setInterval(checkContest, 10000);
    return () => clearInterval(interval);
  }, []);

  // Hide navbar on admin (orbit) and leaderboard — those pages are self-contained
  if (pathname?.startsWith('/orbit') || pathname === '/leaderboard') return null;

  return (
    <header className="sticky top-0 z-40 border-b border-[#a68a56]/20 bg-[#050504]/85 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#1c160e] border border-[#a68a56]/30 shadow-lg shadow-black/80 transition-transform group-hover:scale-105">
            <NauticalCompass size={32} showRings={false} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-cinzel text-base font-bold tracking-[0.18em] text-[#f3d38c] group-hover:text-[#fce8be] transition-colors">
                11<span className="text-[#fff2d6]">:11</span>
              </span>
              <span className="rounded border border-[#a68a56]/30 bg-[#1c160e]/80 px-1.5 py-0.5 font-nautical-mono text-[9px] font-semibold tracking-wider text-[#d4af37]">
                CHAPTER II
              </span>
            </div>
            <span className="font-nautical-mono text-[10px] tracking-widest text-[#a68a56] uppercase">
              Code In The Dark · Blind Arena
            </span>
          </div>
        </Link>

        {/* Contest status badge + Arena link */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-[#a68a56]/25 bg-[#090806]/80 px-3 py-1 font-nautical-mono text-xs">
            <span className={`h-2 w-2 rounded-full ${
              isActiveContest ? 'animate-ping bg-[#d4af37]'
              : contestPhase === 'registration' ? 'animate-pulse bg-amber-400'
              : contestPhase === 'reveal' ? 'animate-pulse bg-emerald-400'
              : 'bg-[#6b5535]'
            }`} />
            <span className="text-[11px] tracking-wider text-[#a68a56]">
              {isActiveContest ? 'VOYAGE ACTIVE'
                : contestPhase === 'registration' ? 'REGISTRATION OPEN'
                : contestPhase === 'reveal' ? 'STAGE REVEAL'
                : 'STANDBY'}
            </span>
          </div>

          <nav className="flex items-center gap-1.5 font-nautical-mono text-xs">
            <Link
              href="/register"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium uppercase tracking-wider transition-all bouncy-btn ${
                pathname?.startsWith('/arena') || pathname === '/register'
                  ? 'border border-[#d4af37]/60 bg-[#1c160e] text-[#f3d38c] shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                  : 'text-[#a68a56] hover:bg-[#1c160e]/50 hover:text-[#f3d38c]'
              }`}
            >
              <Radio className="h-3.5 w-3.5 text-[#d4af37]" />
              <span>Arena</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
