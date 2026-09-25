'use client';

import React from 'react';
import { ShieldAlert, Maximize2, Lock, AlertTriangle, CheckCircle2, Shield, Compass } from 'lucide-react';
import NauticalCompass from './NauticalCompass';

interface AntiCheatShieldProps {
  participantName: string;
  rollNumber: string;
  terminalId: string;
  strikes: number;
  isLockedOut: boolean;
  isFullscreen: boolean;
  warningModalOpen: boolean;
  warningMessage: string;
  hudWarning: string | null;
  onRequestFullscreen: () => void;
}

export default function AntiCheatShield({
  participantName,
  rollNumber,
  terminalId,
  strikes,
  isLockedOut,
  isFullscreen,
  warningModalOpen,
  warningMessage,
  hudWarning,
  onRequestFullscreen,
}: AntiCheatShieldProps) {
  return (
    <>
      {/* 1. Dynamic Floating Watermark Matrix */}
      <div
        className="pointer-events-none fixed inset-0 z-40 select-none overflow-hidden opacity-[0.05] mix-blend-screen"
        aria-hidden="true"
      >
        <div className="grid h-full w-full grid-cols-3 grid-rows-4 gap-12 p-8 text-center">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div
              key={idx}
              className="flex -rotate-12 flex-col items-center justify-center font-nautical-mono text-xs text-[#f3d38c]"
            >
              <span className="font-bold">{participantName}</span>
              <span>{rollNumber} · {terminalId}</span>
              <span>11:11 CHAPTER II · CODE IN THE DARK</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Real-time Prohibited Shortcut Intercept HUD Banner */}
      {hudWarning && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-2.5 rounded-full border border-amber-500/60 bg-[#1c160e]/95 px-5 py-2.5 font-nautical-mono text-xs font-semibold text-amber-200 shadow-2xl shadow-black backdrop-blur-xl">
            <AlertTriangle className="h-4 w-4 text-[#d4af37] shrink-0 animate-pulse" />
            <span>{hudWarning}</span>
          </div>
        </div>
      )}

      {/* 3. Strike 3 Terminal Lockout Screen */}
      {isLockedOut && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#050504]/98 p-6 backdrop-blur-3xl select-none">
          <div className="max-w-md w-full rounded-2xl border border-red-500/60 bg-[#1c160e]/90 p-8 text-center shadow-2xl shadow-red-500/20">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/40 bg-red-950/40 text-red-400">
              <Lock className="h-8 w-8" />
            </div>
            <h2 className="mb-2 font-cinzel text-2xl font-bold tracking-wider text-red-400">
              TERMINAL LOCKED OUT
            </h2>
            <p className="mb-4 font-nautical-mono text-xs text-[#ebe4d5]/80">
              You have accumulated 3 anti-cheat strikes. The Arena has been permanently locked for this terminal.
            </p>
            <div className="rounded-xl border border-red-500/30 bg-[#050504]/80 p-3 font-nautical-mono text-xs text-red-300">
              Voyager: {participantName} ({rollNumber})<br />
              Status: Disqualified · Dropped Anchor
            </div>
          </div>
        </div>
      )}

      {/* 4. Complete Viewport Lockdown Curtain When NOT In Fullscreen */}
      {!isFullscreen && !isLockedOut && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#050504]/98 p-6 backdrop-blur-3xl select-none">
          {strikes > 0 ? (
            /* Warning Screen for Exiting Fullscreen */
            <div className="max-w-md w-full rounded-2xl border border-amber-500/60 bg-[#1c160e] p-8 text-center shadow-2xl shadow-amber-500/20">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-950/40 text-[#f3d38c]">
                <ShieldAlert className="h-8 w-8 animate-pulse text-[#d4af37]" />
              </div>
              <h3 className="mb-1 font-cinzel text-2xl font-bold text-[#f3d38c] tracking-wider">
                VOYAGE SUSPENDED
              </h3>
              <p className="mb-3 font-nautical-mono text-xs text-[#ebe4d5]/80">
                {warningMessage || 'Fullscreen presentation mode was exited. All typing, problem view, and shortcuts are completely frozen.'}
              </p>

              <div className="mb-5 rounded-xl border border-amber-500/40 bg-[#050504]/80 p-3 font-nautical-mono text-xs text-[#f3d38c]">
                <div className="flex items-center justify-center gap-2">
                  <span>Current Strikes:</span>
                  <strong className="text-red-400 text-sm">{strikes} / 3</strong>
                </div>
                {strikes >= 2 && (
                  <p className="mt-1.5 text-red-400 font-bold text-[11px]">
                    ⚠️ CRITICAL: 1 MORE STRIKE CAUSES PERMANENT DISQUALIFICATION
                  </p>
                )}
              </div>

              <button
                onClick={onRequestFullscreen}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-6 py-4 font-cinzel text-sm font-bold tracking-wider text-[#050504] shadow-xl shadow-black transition-all hover:brightness-110 active:scale-95 cursor-pointer bouncy-btn"
              >
                <Maximize2 className="h-5 w-5" />
                <span>RE-ENGAGE FULLSCREEN ARENA</span>
              </button>
            </div>
          ) : (
            /* Pre-Flight Gateway on First Arrival */
            <div className="max-w-lg w-full rounded-2xl border border-[#a68a56]/40 bg-[#090806]/95 p-8 shadow-2xl shadow-black text-center sm:text-left">
              <div className="flex items-center gap-4">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#a68a56]/40 bg-[#1c160e] text-[#f3d38c] shadow-lg shadow-black">
                  <NauticalCompass size={40} showRings={false} />
                </div>
                <div>
                  <h2 className="font-cinzel text-xl font-bold tracking-wider text-[#f3d38c]">
                    IRONCLAD MARITIME AEGIS
                  </h2>
                  <p className="font-nautical-mono text-xs text-[#a68a56]">11:11 Chapter II · Integrity Gate</p>
                </div>
              </div>

              {/* Candidate Identity Verification Badge */}
              <div className="mt-5 rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/80 p-3.5 font-nautical-mono text-xs text-[#ebe4d5]">
                <div className="flex justify-between border-b border-[#a68a56]/20 pb-2 mb-2">
                  <span className="text-[#a68a56]">Voyager Name:</span>
                  <span className="font-bold text-white">{participantName}</span>
                </div>
                <div className="flex justify-between border-b border-[#a68a56]/20 pb-2 mb-2">
                  <span className="text-[#a68a56]">Roll / Team ID:</span>
                  <span className="font-bold text-[#d4af37]">{rollNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a68a56]">Assigned Terminal:</span>
                  <span className="text-[#f3d38c] font-semibold">{terminalId}</span>
                </div>
              </div>

              {/* Integrity Checklist */}
              <div className="mt-5 space-y-2.5 font-nautical-mono text-xs text-[#a68a56] text-left">
                <div className="flex items-center gap-2 text-[#ebe4d5]">
                  <CheckCircle2 className="h-4 w-4 text-[#d4af37] shrink-0" />
                  <span>Presentation Fullscreen Mode required throughout contest</span>
                </div>
                <div className="flex items-center gap-2 text-[#ebe4d5]">
                  <CheckCircle2 className="h-4 w-4 text-[#d4af37] shrink-0" />
                  <span>Clipboard copy/paste &amp; devtools keystroke traps active</span>
                </div>
                <div className="flex items-center gap-2 text-[#ebe4d5]">
                  <CheckCircle2 className="h-4 w-4 text-[#d4af37] shrink-0" />
                  <span>Zero output blind compiler mode armed (No run button)</span>
                </div>
              </div>

              {/* Explicit Launch Action */}
              <div className="mt-6 pt-2">
                <button
                  onClick={onRequestFullscreen}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-6 py-4 font-cinzel text-sm font-bold tracking-wider text-[#050504] shadow-xl shadow-black transition-all hover:brightness-110 active:scale-95 cursor-pointer bouncy-btn"
                >
                  <Maximize2 className="h-5 w-5" />
                  <span>LAUNCH BLIND ARENA &amp; LOCK IN</span>
                </button>
                <p className="mt-2 text-center font-nautical-mono text-[11px] text-[#a68a56]">
                  Clicking activates presentation lock and starts your terminal voyage.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
