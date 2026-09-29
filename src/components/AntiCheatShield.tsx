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
  isBlackoutActive?: boolean;
  disableStrikes?: boolean;
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
  isBlackoutActive = false,
  disableStrikes = false,
  onRequestFullscreen,
}: AntiCheatShieldProps) {
  return (
    <>
      {/* 0. Instant Anti-Screen Capture / Snipping Tool Blackout Shield */}
      {isBlackoutActive && !disableStrikes && (
        <div className="fixed inset-0 z-[10000] bg-black flex items-center justify-center select-none pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-center p-4">
            <ShieldAlert className="h-10 w-10 text-[#d4af37] animate-pulse" />
            <span className="font-cinzel text-base font-bold tracking-widest text-[#f3d38c]">
              SCREEN CAPTURE SANITIZED
            </span>
          </div>
        </div>
      )}

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
          <div className="flex items-center gap-2.5 rounded-full border border-amber-500/60 bg-[#1c160e]/95 px-6 py-3 font-nautical-mono text-sm font-semibold text-amber-200 shadow-2xl shadow-black backdrop-blur-xl">
            <AlertTriangle className="h-4 w-4 text-[#d4af37] shrink-0 animate-pulse" />
            <span>{hudWarning}</span>
          </div>
        </div>
      )}

      {/* 3. Strike 3 Terminal Lockout Screen */}
      {isLockedOut && !disableStrikes && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#050504]/98 p-6 backdrop-blur-3xl select-none">
          <div className="max-w-lg w-full rounded-2xl border border-red-500/60 bg-[#1c160e]/95 p-8 text-center shadow-2xl shadow-red-500/20">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/40 bg-red-950/40 text-red-400">
              <Lock className="h-8 w-8" />
            </div>
            <h2 className="mb-2 font-cinzel text-2xl font-bold tracking-wider text-red-400">
              EXAM TERMINAL LOCKED OUT
            </h2>
            <p className="mb-4 font-nautical-mono text-sm text-[#ebe4d5]/90">
              You have accumulated 3 anti-cheat violations. The contest terminal has been permanently locked.
            </p>
            <div className="rounded-xl border border-red-500/30 bg-[#050504]/80 p-4 font-nautical-mono text-sm text-red-300">
              Participant: {participantName} ({rollNumber})<br />
              Status: Disqualified · Multiple Anti-Cheat Violations
            </div>
          </div>
        </div>
      )}

      {/* 4. Complete Viewport Lockdown Curtain When NOT In Fullscreen (Bypassed in Testing Mode) */}
      {!isFullscreen && !isLockedOut && !disableStrikes && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#050504]/98 p-6 backdrop-blur-3xl select-none">
          {strikes > 0 ? (
            /* Warning Screen for Exiting Fullscreen */
            <div className="max-w-lg w-full rounded-2xl border border-amber-500/60 bg-[#1c160e] p-8 text-center shadow-2xl shadow-amber-500/20">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-950/40 text-[#f3d38c]">
                <ShieldAlert className="h-8 w-8 animate-pulse text-[#d4af37]" />
              </div>
              <h3 className="mb-2 font-cinzel text-2xl font-bold text-[#f3d38c] tracking-wider">
                EXAM SUSPENDED - FULLSCREEN EXITED
              </h3>
              <p className="mb-4 font-nautical-mono text-sm text-[#ebe4d5]/90 leading-relaxed">
                {warningMessage || 'Fullscreen examination mode was exited. Code editing, problem view, and keyboard shortcuts are suspended until you return to fullscreen.'}
              </p>

              <div className="mb-6 rounded-xl border border-amber-500/40 bg-[#050504]/80 p-4 font-nautical-mono text-sm text-[#f3d38c]">
                {disableStrikes ? (
                  <div>
                    <div className="flex items-center justify-center gap-2">
                      <span>Anti-Cheat Status:</span>
                      <strong className="text-emerald-400 text-base font-bold">Disabled (Testing Mode)</strong>
                    </div>
                    <p className="mt-2 text-emerald-300/90 font-medium text-xs">
                      🛡️ Anti-cheat is disabled for testing. Copy-paste is permitted and strikes are bypassed (∞).
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-center gap-2">
                      <span>Current Violations:</span>
                      <strong className="text-red-400 text-base font-bold">{strikes} / 3 Strikes</strong>
                    </div>
                    {strikes >= 2 && (
                      <p className="mt-2 text-red-400 font-bold text-xs">
                        ⚠️ CRITICAL: 1 MORE STRIKE WILL RESULT IN IMMEDIATE DISQUALIFICATION
                      </p>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={onRequestFullscreen}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-6 py-4 font-cinzel text-sm sm:text-base font-bold tracking-wider text-[#050504] shadow-xl shadow-black transition-all hover:brightness-110 active:scale-95 cursor-pointer bouncy-btn"
              >
                <Maximize2 className="h-5 w-5" />
                <span>RETURN TO FULLSCREEN EXAM</span>
              </button>
            </div>
          ) : (
            /* Pre-Flight Gateway on First Arrival */
            <div className="max-w-xl w-full rounded-2xl border border-[#a68a56]/40 bg-[#090806]/95 p-8 sm:p-10 shadow-2xl shadow-black text-center sm:text-left">
              <div className="flex items-center gap-4">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#a68a56]/40 bg-[#1c160e] text-[#f3d38c] shadow-lg shadow-black">
                  <NauticalCompass size={40} showRings={false} />
                </div>
                <div>
                  <h2 className="font-cinzel text-xl sm:text-2xl font-bold tracking-wider text-[#f3d38c]">
                    FULLSCREEN EXAM ENVIRONMENT
                  </h2>
                  <p className="font-nautical-mono text-xs sm:text-sm text-[#a68a56]">11:11 Chapter 2 · Contest Integrity Gate</p>
                  {disableStrikes && (
                    <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-1 font-nautical-mono text-xs text-emerald-300 font-semibold">
                      <Shield className="h-3.5 w-3.5 text-emerald-400" /> Anti-Cheat Disabled (Testing Mode · Copy-Paste Allowed)
                    </span>
                  )}
                </div>
              </div>

              {/* Candidate Identity Verification Badge */}
              <div className="mt-6 rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/80 p-4 font-nautical-mono text-sm text-[#ebe4d5]">
                <div className="flex justify-between border-b border-[#a68a56]/20 pb-2.5 mb-2.5">
                  <span className="text-[#a68a56]">Participant Name:</span>
                  <span className="font-bold text-white text-base">{participantName}</span>
                </div>
                <div className="flex justify-between border-b border-[#a68a56]/20 pb-2.5 mb-2.5">
                  <span className="text-[#a68a56]">College / Registration:</span>
                  <span className="font-bold text-[#d4af37]">{rollNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a68a56]">Assigned Terminal / Seat:</span>
                  <span className="text-[#f3d38c] font-semibold">{terminalId}</span>
                </div>
              </div>

              {/* Integrity Checklist */}
              <div className="mt-6 space-y-3 font-nautical-mono text-xs sm:text-sm text-[#a68a56] text-left">
                <div className="flex items-center gap-2.5 text-[#ebe4d5]">
                  <CheckCircle2 className="h-4 w-4 text-[#d4af37] shrink-0" />
                  <span>Fullscreen examination mode is mandatory throughout the contest</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#ebe4d5]">
                  <CheckCircle2 className={`h-4 w-4 shrink-0 ${disableStrikes ? 'text-emerald-400' : 'text-[#d4af37]'}`} />
                  <span>{disableStrikes ? 'Testing Mode: Copy-paste allowed & anti-cheat strikes bypassed (∞)' : 'Clipboard copy/paste & devtools keyboard shortcuts are blocked'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#ebe4d5]">
                  <CheckCircle2 className="h-4 w-4 text-[#d4af37] shrink-0" />
                  <span>Zero output blind compiler mode active (no run button or live output)</span>
                </div>
              </div>

              {/* Explicit Launch Action */}
              <div className="mt-8 pt-2">
                <button
                  onClick={onRequestFullscreen}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-6 py-4 font-cinzel text-sm sm:text-base font-bold tracking-wider text-[#050504] shadow-xl shadow-black transition-all hover:brightness-110 active:scale-95 cursor-pointer bouncy-btn"
                >
                  <Maximize2 className="h-5 w-5" />
                  <span>ENTER FULLSCREEN &amp; START CONTEST</span>
                </button>
                <p className="mt-2.5 text-center font-nautical-mono text-xs text-[#a68a56]">
                  Clicking will enter fullscreen presentation mode and open your contest questions.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
