'use client';

import React from 'react';
import Link from 'next/link';
import { Terminal, Shield, Zap, EyeOff, Trophy, ArrowRight, Code2, AlertOctagon, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative flex-1 overflow-hidden bg-grid-cyber">
      {/* Ambient Radial Lights */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 radial-glow-emerald" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[400px] w-[500px] radial-glow-cyan" />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        {/* Event Header Pill */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-4 py-1.5 font-mono text-xs font-semibold text-emerald-400 backdrop-blur-md shadow-lg shadow-emerald-500/10">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            11:11 CHAPTER 2 · FLAGSHIP CODING COMPETITION
          </div>

          {/* Master Headline */}
          <h1 className="mt-6 font-mono text-5xl font-extrabold tracking-tight text-white sm:text-7xl lg:text-8xl">
            CODE IN THE <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-200 bg-clip-text text-transparent">DARK</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300 sm:text-xl">
            The ultimate test of programming mastery. Solve real-world algorithmic challenges in{' '}
            <span className="font-semibold text-white">C</span>,{' '}
            <span className="font-semibold text-white">Python</span>, or{' '}
            <span className="font-semibold text-white">Java</span> with{' '}
            <span className="font-semibold text-emerald-400">zero execution feedback</span>. No run button, no compiler output.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 font-mono text-sm font-bold text-black shadow-xl shadow-emerald-500/20 transition-all hover:brightness-110 active:scale-95"
            >
              <span>Enter Participant Arena</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/20 px-6 py-4 font-mono text-sm font-semibold text-cyan-300 backdrop-blur-md transition-all hover:bg-cyan-900/30 hover:border-cyan-400 active:scale-95"
            >
              <Trophy className="h-4 w-4 text-cyan-400" />
              <span>Live Stage Leaderboard</span>
            </Link>

            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-4 font-mono text-sm font-semibold text-gray-300 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white active:scale-95"
            >
              <Shield className="h-4 w-4 text-amber-400" />
              <span>Admin Center</span>
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1 */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c121d]/70 p-6 backdrop-blur-xl transition-all hover:border-emerald-500/40">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <EyeOff className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-mono text-lg font-bold text-white">Blind Coding Arena</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              No <code className="rounded bg-white/10 px-1 py-0.5 text-xs text-emerald-300">Run</code> command or terminal output. You must mentally dry-run your logic and syntax before submitting.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c121d]/70 p-6 backdrop-blur-xl transition-all hover:border-cyan-500/40">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Code2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-mono text-lg font-bold text-white">Tri-Language Freedom</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              Solve each challenge in <span className="text-white font-medium">C (GCC 14)</span>, <span className="text-white font-medium">Python 3.12</span>, or <span className="text-white font-medium">Java (JDK 17)</span> with tailored starter templates.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c121d]/70 p-6 backdrop-blur-xl transition-all hover:border-amber-500/40">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-mono text-lg font-bold text-white">50-Min Speed Scoring</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              3–5 real-world scenarios. Solve faster to earn speed decay bonus points. Partial test cases still award partial scores!
            </p>
          </div>

          {/* Card 4 */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c121d]/70 p-6 backdrop-blur-xl transition-all hover:border-rose-500/40">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-mono text-lg font-bold text-white">Anti-Cheat Shield</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              Enforced fullscreen, tab-switch detection, clipboard quarantine, devtools traps, and candidate dynamic watermarks.
            </p>
          </div>
        </div>

        {/* Live Contest Walkthrough Section */}
        <div className="mt-20 rounded-2xl border border-white/10 bg-[#090e17]/80 p-8 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-bold">Event Rules</span>
              <h2 className="mt-1 font-mono text-2xl font-bold text-white">How the 50-Minute Challenge Works</h2>
              <p className="mt-1 text-sm text-gray-400">Everything you need to know before the countdown buzzer starts.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-mono text-xs text-emerald-300">
                Continuous 50m
              </span>
              <span className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 font-mono text-xs text-cyan-300">
                3–5 Challenges
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="flex gap-3 rounded-xl border border-white/5 bg-black/30 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <h4 className="font-mono text-sm font-semibold text-white">1. Read the Story Scenario</h4>
                <p className="mt-1 text-xs text-gray-400">Analyze real-world constraints, input formats, and sample edge cases.</p>
              </div>
            </div>

            <div className="flex gap-3 rounded-xl border border-white/5 bg-black/30 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-400" />
              <div>
                <h4 className="font-mono text-sm font-semibold text-white">2. Code in Pure Blind Mode</h4>
                <p className="mt-1 text-xs text-gray-400">Write clean, error-free code in Monaco. Auto-saves locally every 3s.</p>
              </div>
            </div>

            <div className="flex gap-3 rounded-xl border border-white/5 bg-black/30 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <h4 className="font-mono text-sm font-semibold text-white">3. Submit & Reveal</h4>
                <p className="mt-1 text-xs text-gray-400">Submit when confident. All submissions are tested by sandbox upon time stop.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
