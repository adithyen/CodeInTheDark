'use client';

import React from 'react';

interface CompassProps {
  size?: number;
  className?: string;
  showRings?: boolean;
}

export default function NauticalCompass({ size = 120, className = '', showRings = true }: CompassProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      title="Celestial Compass · 11:11 Chapter 2"
    >
      {/* Ambient radial glow */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,_rgba(212,175,55,0.18),_transparent_70%)] pointer-events-none" />

      {/* Outer ancient brass ring */}
      {showRings && (
        <div className="absolute inset-0 rounded-full border border-[#a68a56]/40 shadow-[0_0_20px_rgba(0,0,0,0.95)] bg-[#090806]/80 backdrop-blur-md flex items-center justify-center">
          {/* Inner concentric ring */}
          <div className="absolute inset-1.5 rounded-full border border-[#6b5535]/50" />
          {/* Dashed astronomical degree ring */}
          <div className="absolute inset-3 rounded-full border border-dashed border-[#a68a56]/30" />

          {/* Cardinal Directions in Roman Serif */}
          <span className="absolute top-1 font-serif text-[10px] font-bold text-[#f3d38c] tracking-widest drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]">
            N
          </span>
          <span className="absolute bottom-1 font-serif text-[9px] font-semibold text-[#8c6f3d] tracking-widest">
            S
          </span>
          <span className="absolute left-1.5 font-serif text-[9px] font-semibold text-[#8c6f3d] tracking-widest">
            W
          </span>
          <span className="absolute right-1.5 font-serif text-[9px] font-semibold text-[#8c6f3d] tracking-widest">
            E
          </span>

          {/* Crosshair lines */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
            <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-[#d4af37] to-transparent" />
            <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#8c6f3d] to-transparent rotate-45" />
            <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#8c6f3d] to-transparent -rotate-45" />
          </div>
        </div>
      )}

      {/* 8-Point Windrose Star */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] animate-compass-float drop-shadow-[0_0_10px_rgba(212,175,55,0.25)] pointer-events-none"
      >
        {/* Secondary Points (NW, NE, SE, SW) */}
        <polygon points="50,50 43,43 50,22 47,47" fill="#8c6f3d" opacity="0.7" />
        <polygon points="50,50 47,47 50,22 57,43" fill="#3a2d1d" opacity="0.7" />

        <polygon points="50,50 57,43 78,50 53,47" fill="#8c6f3d" opacity="0.7" />
        <polygon points="50,50 53,47 78,50 57,57" fill="#3a2d1d" opacity="0.7" />

        <polygon points="50,50 57,57 50,78 53,53" fill="#8c6f3d" opacity="0.7" />
        <polygon points="50,50 53,53 50,78 43,57" fill="#3a2d1d" opacity="0.7" />

        <polygon points="50,50 43,57 22,50 47,53" fill="#8c6f3d" opacity="0.7" />
        <polygon points="50,50 47,53 22,50 43,43" fill="#3a2d1d" opacity="0.7" />

        {/* Primary North Needle Point */}
        <polygon points="50,50 44,50 50,8 50,50" fill="#f3d38c" />
        <polygon points="50,50 50,8 56,50 50,50" fill="#a68a56" />

        {/* Primary South Point */}
        <polygon points="50,50 44,50 50,92 50,50" fill="#3a2d1d" />
        <polygon points="50,50 50,92 56,50 50,50" fill="#1c160e" />

        {/* Primary East Point */}
        <polygon points="50,50 50,44 92,50 50,50" fill="#a68a56" />
        <polygon points="50,50 92,50 50,56 50,50" fill="#6b5535" />

        {/* Primary West Point */}
        <polygon points="50,50 50,44 8,50 50,50" fill="#8c6f3d" />
        <polygon points="50,50 8,50 50,56 50,50" fill="#3a2d1d" />

        {/* Center Golden Pivot */}
        <circle cx="50" cy="50" r="5" fill="#f3d38c" stroke="#1c160e" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="2" fill="#050504" />
      </svg>
    </div>
  );
}
