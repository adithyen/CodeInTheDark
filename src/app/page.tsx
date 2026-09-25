'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trophy, Compass, ArrowRight, EyeOff, Anchor, Clock, Shield } from 'lucide-react';
import Chapter2Monolith, { Chapter2SailingShip } from '@/components/Chapter2Monolith';

export default function HomePage() {
  const trialPhases = [
    {
      act: 'TRIAL 01',
      num: '01',
      title: 'Blind Voyage',
      desc: 'Zero console execution. Simulate algorithms purely in your mind before committing.',
      icon: EyeOff,
    },
    {
      act: 'TRIAL 02',
      num: '02',
      title: 'Tri-Hull Matrix',
      desc: 'Command your choice of C (GCC 14), Python 3.12, or Java 17 with official starter hulls.',
      icon: Anchor,
    },
    {
      act: 'TRIAL 03',
      num: '03',
      title: '50m Chronometer',
      desc: '50-minute synchronous countdown. Early correct solutions earn up to a 25% speed bounty.',
      icon: Clock,
    },
    {
      act: 'TRIAL 04',
      num: '04',
      title: 'Ironclad Aegis',
      desc: 'Presentation fullscreen lock, tab-blur telemetry, and keystroke traps. 3 strikes lock you out.',
      icon: Shield,
    },
  ];

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Animated Sailing Caravel Ship on Celestial Orbit */}
      <Chapter2SailingShip />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-14">
        
        {/* Institutional Presenter Badge */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex flex-row items-center justify-center gap-4 sm:gap-6 py-1">
            <div className="relative w-11 h-13 sm:w-14 sm:h-16 drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]">
              <Image
                src="/csiLogo.png"
                alt="CSI SCT SB Logo"
                fill
                sizes="(max-width: 640px) 44px, 56px"
                className="object-contain"
                priority
              />
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]/70 shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
            <div className="relative w-36 h-11 sm:w-48 sm:h-14 drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]">
              <Image
                src="/collegeLogo.png"
                alt="SCT College of Engineering"
                fill
                sizes="(max-width: 640px) 144px, 192px"
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <div className="h-[1px] w-8 sm:w-16 bg-gradient-to-r from-transparent to-[#a68a56]/50" />
            <span className="font-serif text-[10px] sm:text-xs tracking-[0.35em] uppercase text-[#a68a56]">
              CSI SCT SB Presents
            </span>
            <div className="h-[1px] w-8 sm:w-16 bg-gradient-to-l from-transparent to-[#a68a56]/50" />
          </div>
        </div>

        {/* 11:11 Chapter 2 Monolith Towers & Suspension Bridge Centerpiece */}
        <div className="mt-2 relative w-full flex items-center justify-center">
          <Chapter2Monolith />
        </div>

        {/* Chapter 2 Divider Bar */}
        <div className="mt-4 flex items-center justify-center">
          <div className="flex items-center gap-4">
            <div className="h-[1px] w-12 sm:w-24 bg-gradient-to-r from-transparent via-[#d4af37]/60 to-[#d4af37]" />
            <span className="font-serif text-xs sm:text-sm tracking-[0.32em] uppercase text-[#f3d38c] drop-shadow-[0_0_8px_rgba(243,211,140,0.5)]">
              Chapter 2
            </span>
            <div className="h-[1px] w-12 sm:w-24 bg-gradient-to-l from-transparent via-[#d4af37]/60 to-[#d4af37]" />
          </div>
        </div>

        {/* Master Headline: CODE IN THE DARK */}
        <div className="mt-4 flex flex-col items-center text-center">
          <h1 className="font-cinzel text-5xl font-black tracking-[0.12em] text-[#f3d38c] sm:text-7xl lg:text-8xl drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
            CODE IN THE{' '}
            <span className="bg-gradient-to-r from-[#d4af37] via-[#fce8be] to-[#a68a56] bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(212,175,55,0.5)]">
              DARK
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl font-nautical-mono text-sm sm:text-base text-[#ebe4d5]/85 leading-relaxed">
            The ultimate test of algorithmic intuition. Navigate complex logic scenarios in{' '}
            <span className="font-bold text-[#f3d38c]">C</span>,{' '}
            <span className="font-bold text-[#f3d38c]">Python</span>, or{' '}
            <span className="font-bold text-[#f3d38c]">Java</span> under strict{' '}
            <span className="font-bold text-[#d4af37]">blind conditions</span>. No run button, no compiler feedback. Pure mental mastery.
          </p>
        </div>

        {/* The Authentic 11:11 Chapter 2 Act / Trial Block Cards */}
        <div className="mt-8 flex flex-row flex-wrap items-center justify-center gap-3 sm:gap-5">
          {trialPhases.map((phase) => (
            <div
              key={phase.num}
              className="group flex flex-col items-center bg-[#1c160e] border border-[#d4af37]/25 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.6)] hover:shadow-[0_0_22px_rgba(212,175,55,0.25)] hover:border-[#d4af37]/70 transition-all duration-300 hover:-translate-y-1.5 w-24 sm:w-28 text-center flex-shrink-0 cursor-default"
            >
              {/* Metallic Gold Header Strip */}
              <span className="w-full bg-[#d4af37]/60 text-[#050504] text-[9px] sm:text-[10px] font-mono font-bold tracking-widest py-1 uppercase">
                {phase.act}
              </span>
              {/* Huge Roman / Arabic Number */}
              <span className="text-2xl sm:text-3xl font-serif font-bold text-[#f3d38c]/90 py-2 sm:py-2.5 transition-colors group-hover:text-[#fff2d6]">
                {phase.num}
              </span>
            </div>
          ))}
        </div>

        {/* Primary Action Buttons (Emil Motion Tactile Physics) */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="group inline-flex items-center gap-3 rounded-lg bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-8 py-3.5 font-cinzel text-xs sm:text-sm font-bold tracking-widest text-[#050504] shadow-[0_0_20px_rgba(212,175,55,0.35)] transition-all hover:brightness-110 active:scale-95 bouncy-btn"
          >
            <span>BOARD CONTEST VESSEL</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/leaderboard"
            className="group inline-flex items-center gap-2.5 rounded-lg border border-[#d4af37]/40 bg-[#1c160e]/85 px-6 py-3.5 font-cinzel text-xs sm:text-sm font-semibold tracking-widest text-[#f3d38c] backdrop-blur-sm shadow-[0_0_15px_rgba(212,175,55,0.1)] transition-all hover:border-[#d4af37] hover:shadow-[0_0_20px_rgba(212,175,55,0.25)] active:scale-95 bouncy-btn"
          >
            <Trophy className="h-4 w-4 text-[#d4af37]" />
            <span>STAGE LEADERBOARD</span>
          </Link>

          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg border border-[#a68a56]/30 bg-[#090806]/85 px-6 py-3.5 font-cinzel text-xs sm:text-sm font-semibold tracking-widest text-[#a68a56] backdrop-blur-sm transition-all hover:border-[#a68a56] hover:text-[#f3d38c] active:scale-95 bouncy-btn"
          >
            <Compass className="h-4 w-4 text-[#a68a56]" />
            <span>COMMAND DECK</span>
          </Link>
        </div>

        {/* Feature Charters Grid */}
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {trialPhases.map((phase) => {
            const Icon = phase.icon;
            return (
              <div
                key={phase.title}
                className="rounded-xl border border-[#a68a56]/20 bg-[#090806]/85 p-5 backdrop-blur-xl transition-all bouncy-card hover:border-[#d4af37]/50 shadow-lg shadow-black/70"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1c160e] border border-[#a68a56]/30 text-[#f3d38c] shadow-md shadow-black">
                  <Icon className="h-5 w-5 text-[#d4af37]" />
                </div>
                <h3 className="mt-3 font-cinzel text-sm font-bold text-[#f3d38c] tracking-wider">
                  {phase.title}
                </h3>
                <p className="mt-1.5 font-nautical-mono text-xs leading-relaxed text-[#ebe4d5]/75">
                  {phase.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer Coordinate Stamp */}
        <div className="mt-16 border-t border-[#a68a56]/15 pt-6 text-center font-nautical-mono text-xs text-[#a68a56]/70 flex flex-wrap items-center justify-center gap-6">
          <span>LAT 11° 11&apos; 00&quot; N · LONG 76° 57&apos; 00&quot; E</span>
          <span className="hidden sm:inline">·</span>
          <span>COMPUTER SOCIETY OF INDIA · SCT SB CHAPTER II</span>
          <span className="hidden sm:inline">·</span>
          <span className="text-[#d4af37]">SUPABASE SECURED ARCHIVE</span>
        </div>
      </div>
    </div>
  );
}
