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

      {/* Navigational Coordinate Watermarks */}
      <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
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
