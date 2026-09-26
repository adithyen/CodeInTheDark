'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import Chapter2Monolith, { Chapter2SailingShip } from '@/components/Chapter2Monolith';

export default function HomePage() {
  return (
    <div className="relative h-screen max-h-screen w-full overflow-hidden flex flex-col justify-between bg-transparent">
      {/* Animated Sailing Caravel Ship on Celestial Orbit */}
      <Chapter2SailingShip />

      {/* ── Top Bar: CSI SCT SB Logo on Left, SCT Logo on Right ───────────────── */}
      <header className="relative z-20 w-full px-5 py-3 sm:px-8 sm:py-4 flex items-center justify-between select-none">
        {/* Top Left: CSI SCT SB Logo */}
        <div className="flex items-center">
          <div className="relative w-12 h-14 sm:w-14 sm:h-16 drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">
            <Image
              src="/csiLogo.png"
              alt="CSI SCT SB Logo"
              fill
              sizes="(max-width: 640px) 48px, 56px"
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Top Center: CSI SCT SB Presents Tagline — Absolute True Center */}
        <div className="hidden md:flex items-center gap-3 absolute left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="h-[1px] w-10 lg:w-16 bg-gradient-to-r from-transparent to-[#a68a56]/50" />
          <span className="font-serif text-[10px] sm:text-[11px] tracking-[0.35em] uppercase text-[#a68a56] whitespace-nowrap">
            CSI SCT SB Presents
          </span>
          <div className="h-[1px] w-10 lg:w-16 bg-gradient-to-l from-transparent to-[#a68a56]/50" />
        </div>

        {/* Top Right: SCT College of Engineering Logo */}
        <div className="flex items-center gap-2">
          <div className="relative w-32 h-10 sm:w-44 sm:h-13 drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">
            <Image
              src="/collegeLogo.png"
              alt="SCT College of Engineering"
              fill
              sizes="(max-width: 640px) 128px, 176px"
              className="object-contain"
              priority
            />
          </div>
        </div>
      </header>

      {/* ── Main Hero Centerpiece (Scaled & Positioned for Instant First Glance) ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 -mt-6 sm:-mt-10 md:-mt-12">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center">
          
          {/* Mobile Presenter Tag */}
          <div className="flex md:hidden items-center gap-2 mb-1">
            <div className="h-[1px] w-6 bg-gradient-to-r from-transparent to-[#a68a56]/50" />
            <span className="font-serif text-[9px] tracking-[0.25em] uppercase text-[#a68a56]">
              CSI SCT SB Presents
            </span>
            <div className="h-[1px] w-6 bg-gradient-to-l from-transparent to-[#a68a56]/50" />
          </div>

          {/* 11:11 Chapter 2 Monolith Towers (Scaled Down & Elevated) */}
          <div className="relative w-full flex items-center justify-center">
            <Chapter2Monolith />
          </div>

          {/* Chapter 2 Divider Strip */}
          <div className="mt-7 sm:mt-9 flex items-center justify-center">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="h-[1px] w-8 sm:w-20 bg-gradient-to-r from-transparent via-[#d4af37]/60 to-[#d4af37]" />
              <span className="font-serif text-[11px] sm:text-xs tracking-[0.32em] uppercase text-[#f3d38c] drop-shadow-[0_0_8px_rgba(243,211,140,0.5)]">
                Chapter 2
              </span>
              <div className="h-[1px] w-8 sm:w-20 bg-gradient-to-l from-transparent via-[#d4af37]/60 to-[#d4af37]" />
            </div>
          </div>

          {/* Master Headline: CODE IN THE DARK */}
          <div className="mt-3 sm:mt-4 flex flex-col items-center">
            <h1 className="font-cinzel text-4xl sm:text-6xl md:text-7xl font-black tracking-[0.11em] text-[#f3d38c] drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
              CODE IN THE{' '}
              <span className="bg-gradient-to-r from-[#d4af37] via-[#fce8be] to-[#a68a56] bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(212,175,55,0.5)]">
                DARK
              </span>
            </h1>

            <p className="mx-auto mt-2 max-w-xl font-nautical-mono text-xs sm:text-sm text-[#ebe4d5]/85 leading-relaxed">
              The ultimate test of algorithmic intuition. Navigate complex logic scenarios in{' '}
              <span className="font-bold text-[#f3d38c]">C</span>,{' '}
              <span className="font-bold text-[#f3d38c]">Python</span>, or{' '}
              <span className="font-bold text-[#f3d38c]">Java</span> under strict{' '}
              <span className="font-bold text-[#d4af37]">blind conditions</span>. No run button, no compiler feedback. Pure mental mastery.
            </p>
          </div>

          {/* Primary Action Button — Immediately Visible at First Glance */}
          <div className="mt-4 sm:mt-6 flex items-center justify-center">
            <Link
              href="/register"
              className="group inline-flex items-center gap-3 rounded-lg bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-8 py-3 sm:px-9 sm:py-3.5 font-cinzel text-xs sm:text-sm font-bold tracking-widest text-[#050504] shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all hover:brightness-110 active:scale-95 bouncy-btn"
            >
              <span>BOARD CONTEST VESSEL</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </main>

      {/* Subtle bottom spacing balance (no footer) */}
      <div className="h-2 sm:h-4 w-full pointer-events-none" />
    </div>
  );
}
