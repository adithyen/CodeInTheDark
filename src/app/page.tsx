'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Zap, EyeOff, Trophy, ArrowRight, Code2, Compass, Anchor, Star, Clock } from 'lucide-react';
import NauticalCompass from '@/components/NauticalCompass';

export default function HomePage() {
  return (
    <div className="relative flex-1 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-20">
        
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center">
          
          {/* Ornate Nautical Compass Emblem */}
          <div className="mb-6 relative">
            <NauticalCompass size={140} showRings={true} />
          </div>

          {/* Event Header Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#a68a56]/40 bg-[#1c160e]/80 px-4 py-1.5 font-nautical-mono text-xs font-semibold text-[#f3d38c] backdrop-blur-md shadow-lg shadow-black/80">
            <span className="h-2 w-2 rounded-full bg-[#d4af37] animate-ping" />
            <span className="tracking-[0.2em] uppercase">11:11 CHAPTER II · FLAGSHIP CODING ODYSSEY</span>
          </div>

          {/* Master Headline in Cinzel Typography */}
          <h1 className="mt-6 font-cinzel text-5xl font-black tracking-[0.12em] text-[#f3d38c] sm:text-7xl lg:text-8xl drop-shadow-[0_2px_15px_rgba(0,0,0,0.9)]">
            CODE IN THE{' '}
            <span className="bg-gradient-to-r from-[#d4af37] via-[#fce8be] to-[#a68a56] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(212,175,55,0.45)]">
              DARK
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl font-nautical-mono text-base text-[#ebe4d5]/90 sm:text-lg leading-relaxed">
            The ultimate test of algorithmic intuition. Navigate complex logic scenarios in{' '}
            <span className="font-bold text-[#f3d38c]">C</span>,{' '}
            <span className="font-bold text-[#f3d38c]">Python</span>, or{' '}
            <span className="font-bold text-[#f3d38c]">Java</span> under strict{' '}
            <span className="font-bold text-[#d4af37]">blind conditions</span>. No run button, no compiler feedback. Pure mental mastery.
          </p>

          {/* Primary Action Buttons (Emil Motion Tactile Physics) */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="group inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-8 py-4 font-cinzel text-sm font-bold tracking-wider text-[#050504] shadow-[0_4px_25px_rgba(212,175,55,0.35)] transition-all hover:brightness-110 active:scale-95 bouncy-btn"
            >
              <span>BOARD CONTEST VESSEL</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2.5 rounded-xl border border-[#a68a56]/40 bg-[#1c160e]/90 px-6 py-4 font-cinzel text-sm font-semibold tracking-wider text-[#f3d38c] backdrop-blur-md transition-all hover:bg-[#1c160e] hover:border-[#d4af37] active:scale-95 bouncy-btn shadow-lg shadow-black/60"
            >
              <Trophy className="h-4 w-4 text-[#d4af37]" />
              <span>STAGE LEADERBOARD</span>
            </Link>

            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-[#a68a56]/20 bg-[#090806]/80 px-6 py-4 font-cinzel text-sm font-semibold tracking-wider text-[#a68a56] backdrop-blur-md transition-all hover:bg-[#1c160e] hover:text-[#f3d38c] active:scale-95 bouncy-btn"
            >
              <Compass className="h-4 w-4 text-[#a68a56]" />
              <span>COMMAND DECK</span>
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid (Ancient Nautical Charters) */}
        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Card 1 */}
          <div className="rounded-2xl border border-[#a68a56]/25 bg-[#090806]/85 p-6 backdrop-blur-xl transition-all bouncy-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1c160e] border border-[#a68a56]/30 text-[#f3d38c] shadow-md shadow-black">
              <EyeOff className="h-6 w-6 text-[#d4af37]" />
            </div>
            <h3 className="mt-4 font-cinzel text-base font-bold text-[#f3d38c] tracking-wider">Blind Voyage</h3>
            <p className="mt-2 font-nautical-mono text-xs leading-relaxed text-[#ebe4d5]/75">
              Zero execution feedback. No console logs or run checks. You must mentally simulate your algorithm before locking your final code.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-[#a68a56]/25 bg-[#090806]/85 p-6 backdrop-blur-xl transition-all bouncy-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1c160e] border border-[#a68a56]/30 text-[#f3d38c] shadow-md shadow-black">
              <Anchor className="h-6 w-6 text-[#d4af37]" />
            </div>
            <h3 className="mt-4 font-cinzel text-base font-bold text-[#f3d38c] tracking-wider">Tri-Language Hull</h3>
            <p className="mt-2 font-nautical-mono text-xs leading-relaxed text-[#ebe4d5]/75">
              Tackle each challenge in <span className="text-[#f3d38c] font-semibold">C (GCC 14)</span>, <span className="text-[#f3d38c] font-semibold">Python 3.12</span>, or <span className="text-[#f3d38c] font-semibold">Java 17</span> with starter boilerplate templates.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-[#a68a56]/25 bg-[#090806]/85 p-6 backdrop-blur-xl transition-all bouncy-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1c160e] border border-[#a68a56]/30 text-[#f3d38c] shadow-md shadow-black">
              <Clock className="h-6 w-6 text-[#d4af37]" />
            </div>
            <h3 className="mt-4 font-cinzel text-base font-bold text-[#f3d38c] tracking-wider">Chronometer Bonus</h3>
            <p className="mt-2 font-nautical-mono text-xs leading-relaxed text-[#ebe4d5]/75">
              50-minute synchronized countdown. Early correct solutions earn up to a 25% speed bounty. Partial test cases award proportional points.
            </p>
          </div>

          {/* Card 4 */}
          <div className="rounded-2xl border border-[#a68a56]/25 bg-[#090806]/85 p-6 backdrop-blur-xl transition-all bouncy-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1c160e] border border-[#a68a56]/30 text-[#f3d38c] shadow-md shadow-black">
              <Shield className="h-6 w-6 text-[#d4af37]" />
            </div>
            <h3 className="mt-4 font-cinzel text-base font-bold text-[#f3d38c] tracking-wider">Ironclad Aegis</h3>
            <p className="mt-2 font-nautical-mono text-xs leading-relaxed text-[#ebe4d5]/75">
              Rigid presentation fullscreen lock, tab-blur telemetry, and keystroke traps. 3 strikes result in permanent lockout from the arena.
            </p>
          </div>
        </div>

        {/* Footer Coordinate Stamp */}
        <div className="mt-20 border-t border-[#a68a56]/15 pt-6 text-center font-nautical-mono text-xs text-[#a68a56]/70 flex flex-wrap items-center justify-center gap-6">
          <span>LAT 11° 11&apos; 00&quot; N · LONG 76° 57&apos; 00&quot; E</span>
          <span className="hidden sm:inline">·</span>
          <span>COMPUTER SOCIETY OF INDIA · EVENT CHAPTER II</span>
          <span className="hidden sm:inline">·</span>
          <span className="text-[#d4af37]">SUPABASE SECURED ARCHIVE</span>
        </div>
      </div>
    </div>
  );
}
