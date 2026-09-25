'use client';

import React from 'react';

export default function CelestialBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      {/* Dark Oceanic Radial Gradients */}
      <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(212,175,55,0.08),_transparent_70%)] blur-2xl" />
      <div className="absolute top-1/3 -right-40 h-[500px] w-[600px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(243,211,140,0.06),_transparent_65%)] blur-2xl" />
      <div className="absolute -bottom-40 left-10 h-[500px] w-[600px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(166,138,86,0.05),_transparent_65%)] blur-3xl" />

      {/* Nautical Grid Lines */}
      <div className="absolute inset-0 bg-nautical-chart opacity-80" />

      {/* Celestial Constellation Overlay */}
      <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f3d38c" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Constellation 1: Ursa Major style cluster (Top Left) */}
        <polyline
          points="80,120 160,110 240,150 320,140 370,220 290,250 240,150"
          fill="none"
          stroke="#a68a56"
          strokeWidth="0.75"
          strokeDasharray="3 3"
        />
        <circle cx="80" cy="120" r="2.5" fill="#f3d38c" />
        <circle cx="160" cy="110" r="2" fill="#f3d38c" />
        <circle cx="240" cy="150" r="3" fill="#f3d38c" />
        <circle cx="320" cy="140" r="2" fill="#f3d38c" />
        <circle cx="370" cy="220" r="2.5" fill="#f3d38c" />
        <circle cx="290" cy="250" r="2" fill="#f3d38c" />

        {/* Constellation 2: Orion style belt (Bottom Right) */}
        <polyline
          points="1100,500 1150,480 1200,460"
          fill="none"
          stroke="#d4af37"
          strokeWidth="1"
        />
        <circle cx="1100" cy="500" r="2.5" fill="#f3d38c" />
        <circle cx="1150" cy="480" r="2.5" fill="#f3d38c" />
        <circle cx="1200" cy="460" r="2.5" fill="#f3d38c" />
        <line x1="1100" y1="500" x2="1080" y2="400" stroke="#a68a56" strokeWidth="0.5" strokeDasharray="2 2" />
        <line x1="1200" y1="460" x2="1240" y2="560" stroke="#a68a56" strokeWidth="0.5" strokeDasharray="2 2" />
        <circle cx="1080" cy="400" r="3" fill="#f3d38c" />
        <circle cx="1240" cy="560" r="3" fill="#f3d38c" />

        {/* Navigational Coordinate Watermarks */}
        <text x="30" y="40" fill="#a68a56" fontSize="10" fontFamily="'Share Tech Mono', monospace" opacity="0.4" letterSpacing="0.2em">
          11° 11&apos; 00&quot; N · CHAPTER II
        </text>
        <text x="30" y="60" fill="#8c6f3d" fontSize="9" fontFamily="'Share Tech Mono', monospace" opacity="0.3" letterSpacing="0.2em">
          AZIMUTH 042° · LOGISTICS &amp; ALGORITHMS
        </text>
      </svg>
    </div>
  );
}
