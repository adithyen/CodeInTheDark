'use client';

import React from 'react';
import { useAntiCheat, ViolationType } from '@/hooks/useAntiCheat';
import { ShieldAlert, Maximize2, Lock, AlertTriangle } from 'lucide-react';

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
    countdown,
    requestFullscreen,
  } = useAntiCheat({
    participantId,
    initialStrikes: strikes,
    initialLockedOut: isLockedOut,
    enabled,
    onStrikeUpdate: onStrikeRecorded,
  });

  const effectiveStrikes = Math.max(strikes, hookStrikes);
  const effectiveLockedOut = isLockedOut || hookLockedOut;

  return (
    <>
      {/* Dynamic Floating Watermark Matrix to Deter Smartphone Photos */}
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

      {/* Strike 3 Lockout Screen */}
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

      {/* Warning Alert Modal on Fullscreen Exit or Tab Switch */}
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
    </>
  );
}
