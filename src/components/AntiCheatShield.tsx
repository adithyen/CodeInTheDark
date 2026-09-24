'use client';

import React from 'react';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { ShieldAlert, Maximize2, Lock, AlertTriangle, CheckCircle2, Shield, EyeOff } from 'lucide-react';

interface AntiCheatShieldProps {
  participantId: string;
  participantName: string;
  rollNumber: string;
  terminalId: string;
  strikes: number;
  isLockedOut: boolean;
  onStrikeRecorded: (newStrikes: number, isLockedOut: boolean) => void;
  enabled?: boolean;
}

export default function AntiCheatShield({
  participantId,
  participantName,
  rollNumber,
  terminalId,
  strikes,
  isLockedOut,
  onStrikeRecorded,
  enabled = true,
}: AntiCheatShieldProps) {
  const {
    isFullscreen,
    strikes: hookStrikes,
    isLockedOut: hookLockedOut,
    warningModalOpen,
    warningMessage,
    hudWarning,
    requestFullscreen,
  } = useAntiCheat({
    participantId,
    participantName,
    rollNumber,
    terminalId,
    initialStrikes: strikes,
    initialLockedOut: isLockedOut,
    enabled,
    onStrikeUpdate: onStrikeRecorded,
  });

  const effectiveStrikes = Math.max(strikes, hookStrikes);
  const effectiveLockedOut = isLockedOut || hookLockedOut;

  return (
    <>
      {/* 1. Dynamic Floating Watermark Matrix to Deter Smartphone Photos */}
      <div
        className="pointer-events-none fixed inset-0 z-40 select-none overflow-hidden opacity-[0.06] mix-blend-screen"
        aria-hidden="true"
      >
        <div className="grid h-full w-full grid-cols-3 grid-rows-4 gap-12 p-8 text-center">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div
              key={idx}
              className="flex -rotate-12 flex-col items-center justify-center font-mono text-xs text-white"
            >
              <span className="font-bold">{participantName}</span>
              <span>{rollNumber} · {terminalId}</span>
              <span>11:11 CODE IN THE DARK</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Real-time Prohibited Shortcut Intercept HUD Banner (Pre-emptive feedback) */}
      {hudWarning && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-2.5 rounded-full border border-amber-500/60 bg-amber-950/95 px-5 py-2.5 font-mono text-xs font-semibold text-amber-200 shadow-2xl shadow-amber-500/30 backdrop-blur-xl">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
            <span>{hudWarning}</span>
          </div>
        </div>
      )}

      {/* 3. Strike 3 Terminal Lockout Screen */}
      {effectiveLockedOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-6 backdrop-blur-2xl">
          <div className="max-w-md w-full rounded-2xl border border-red-500/50 bg-red-950/40 p-8 text-center shadow-2xl shadow-red-500/20">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-400">
              <Lock className="h-8 w-8" />
            </div>
            <h2 className="mb-2 font-mono text-2xl font-bold tracking-tight text-red-400">
              TERMINAL LOCKED OUT
            </h2>
            <p className="mb-4 text-sm text-gray-300">
              You have accumulated 3 anti-cheat strikes (fullscreen exit, tab switches, or prohibited shortcuts).
            </p>
            <div className="rounded-xl border border-red-500/30 bg-black/60 p-3 font-mono text-xs text-red-300">
              Candidate: {participantName} ({rollNumber})<br />
              Status: Disqualification Pending Admin Review
            </div>
          </div>
        </div>
      )}

      {/* 4. Fullscreen Warning Alert Modal (When Fullscreen was exited) */}
      {warningModalOpen && !effectiveLockedOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur-md">
          <div className="max-w-md w-full rounded-2xl border border-amber-500/50 bg-[#121824] p-6 text-center shadow-2xl shadow-amber-500/20">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              <ShieldAlert className="h-7 w-7 animate-pulse" />
            </div>
            <h3 className="mb-1 font-mono text-xl font-bold text-amber-400">
              ANTI-CHEAT WARNING
            </h3>
            <p className="mb-3 text-sm text-gray-300">{warningMessage}</p>

            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-950/30 p-2.5 font-mono text-xs text-amber-200">
              Strikes: <span className="font-bold text-red-400">{effectiveStrikes} / 3</span>
              {effectiveStrikes >= 2 && ' · CRITICAL: Next strike locks your terminal!'}
            </div>

            <button
              onClick={requestFullscreen}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 font-mono text-sm font-semibold text-black shadow-lg shadow-emerald-500/25 transition-all hover:brightness-110 active:scale-95"
            >
              <Maximize2 className="h-4 w-4" />
              Re-Enter Fullscreen Arena
            </button>
          </div>
        </div>
      )}

      {/* 5. Pre-Flight Locked Gateway Modal (Mandatory Fullscreen Entry Gesture) */}
      {!isFullscreen && !warningModalOpen && !effectiveLockedOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur-xl">
          <div className="max-w-lg w-full rounded-2xl border border-emerald-500/40 bg-[#0c121d] p-8 shadow-2xl shadow-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-mono text-xl font-bold tracking-tight text-white">
                  LOCKED EXAMINATION ARENA
                </h2>
                <p className="text-xs text-gray-400">11:11 Chapter 2 · Academic Integrity Gate</p>
              </div>
            </div>

            {/* Candidate Identity Verification Badge */}
            <div className="mt-5 rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-xs text-gray-300">
              <div className="flex justify-between border-b border-white/10 pb-2 mb-2">
                <span className="text-gray-400">Candidate Name:</span>
                <span className="font-bold text-white">{participantName}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2 mb-2">
                <span className="text-gray-400">Roll / Team ID:</span>
                <span className="font-bold text-emerald-400">{rollNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Terminal Node:</span>
                <span className="text-gray-200">{terminalId}</span>
              </div>
            </div>

            {/* Integrity Checklist */}
            <div className="mt-5 space-y-2 font-mono text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Presentation Fullscreen Mode required throughout contest</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Clipboard copy/paste & devtools keyboard traps active</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Zero output blind compiler mode armed (No run button)</span>
              </div>
            </div>

            {/* Explicit Launch Action */}
            <div className="mt-6 pt-2">
              <button
                onClick={requestFullscreen}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 font-mono text-sm font-bold text-black shadow-xl shadow-emerald-500/20 transition-all hover:brightness-110 active:scale-95 cursor-pointer"
              >
                <Maximize2 className="h-5 w-5" />
                <span>Launch Blind Arena & Enter Fullscreen</span>
              </button>
              <p className="mt-2 text-center font-mono text-[11px] text-gray-500">
                Clicking activates secure presentation mode and keyboard lockdown.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
