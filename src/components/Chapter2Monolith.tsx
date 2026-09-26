'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * 11:11 Chapter 2 Suspension Bridge & Horizon Line
 */
export function Chapter2Bridge() {
  return (
    <motion.div
      className="absolute left-1/2 top-1/2 md:top-4/5 -translate-x-1/2 -translate-y-2/8 w-full h-full pointer-events-none z-0 opacity-80"
      animate={{ y: [0, -1.5, 0, 1, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg
        viewBox="0 0 800 200"
        preserveAspectRatio="none"
        className="w-full h-full filter drop-shadow-[0_0_12px_rgba(243,211,140,0.4)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bridgeGlowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff2d6" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#f3d38c" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#7a5c28" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="cableGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7a5c28" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#f3d38c" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7a5c28" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="bridgeCenterLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="30%" stopColor="#f3d38c" stopOpacity="0.8" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Catenary Main Suspension Cables */}
        <path d="M 0 130 Q 250 160 250 90" stroke="url(#cableGrad)" strokeWidth="1.2" />
        <path d="M 250 90 Q 400 165 550 90" stroke="url(#cableGrad)" strokeWidth="1.8" />
        <path d="M 0 135 Q 250 162 250 90" stroke="#f3d38c" strokeWidth="0.5" opacity="0.4" />
        <path d="M 250 90 Q 400 168 550 90" stroke="#f3d38c" strokeWidth="0.6" opacity="0.5" />
        <path d="M 550 90 Q 550 162 800 135" stroke="#f3d38c" strokeWidth="0.5" opacity="0.4" />

        {/* Vertical Cable Stay Lines */}
        <g stroke="url(#bridgeGlowGrad)" strokeWidth="0.7" opacity="0.6">
          <line x1="50" y1="136" x2="50" y2="150" />
          <line x1="100" y1="142" x2="100" y2="150" />
          <line x1="150" y1="146" x2="150" y2="150" />
          <line x1="200" y1="142" x2="200" y2="150" />
          <line x1="280" y1="105" x2="280" y2="150" />
          <line x1="310" y1="120" x2="310" y2="150" />
          <line x1="340" y1="135" x2="340" y2="150" />
          <line x1="370" y1="145" x2="370" y2="150" />
          <line x1="400" y1="148" x2="400" y2="150" />
          <line x1="430" y1="145" x2="430" y2="150" />
          <line x1="460" y1="135" x2="460" y2="150" />
          <line x1="490" y1="120" x2="490" y2="150" />
          <line x1="520" y1="105" x2="520" y2="150" />
          <line x1="600" y1="142" x2="600" y2="150" />
          <line x1="650" y1="146" x2="650" y2="150" />
          <line x1="700" y1="142" x2="700" y2="150" />
          <line x1="750" y1="136" x2="750" y2="150" />
        </g>

        {/* Horizontal Roadway Span */}
        <line x1="0" y1="150" x2="800" y2="150" stroke="url(#bridgeGlowGrad)" strokeWidth="1.8" />
        <line x1="0" y1="152" x2="800" y2="152" stroke="#fff2d6" strokeWidth="0.55" opacity="0.6" />

        {/* Tower 1 (West Pylon) */}
        <g>
          <rect x="244" y="80" width="12" height="70" fill="#090705" stroke="url(#bridgeGlowGrad)" strokeWidth="1" />
          <path d="M 244 80 L 250 60 L 256 80 Z" fill="url(#bridgeGlowGrad)" />
          <motion.circle
            cx="250"
            cy="58"
            r="1.5"
            fill="#ffffff"
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.3, 0.8] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </g>

        {/* Tower 2 (East Pylon) */}
        <g>
          <rect x="544" y="80" width="12" height="70" fill="#090705" stroke="url(#bridgeGlowGrad)" strokeWidth="1" />
          <path d="M 544 80 L 550 60 L 556 80 Z" fill="url(#bridgeGlowGrad)" />
          <motion.circle
            cx="550"
            cy="58"
            r="1.5"
            fill="#ffffff"
            animate={{ opacity: [1, 0.4, 1], scale: [1.3, 0.8, 1.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </g>

        {/* Central Horizon Flare */}
        <motion.circle
          cx="400"
          cy="150"
          r="18"
          fill="url(#bridgeCenterLight)"
          animate={{ scale: [0.8, 1.25, 0.8], opacity: [0.35, 0.9, 0.35] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.ellipse
          cx="400"
          cy="150"
          rx="60"
          ry="2"
          fill="#ffffff"
          animate={{ opacity: [0.25, 0.9, 0.25], rx: [45, 70, 45] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Shimmering Nautical Chart Waves */}
        <motion.g
          opacity="0.3"
          animate={{ opacity: [0.15, 0.4, 0.15], y: [0, 1, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <line x1="100" y1="160" x2="700" y2="160" stroke="#f3d38c" strokeWidth="0.6" strokeDasharray="10 15 5 10" />
          <line x1="200" y1="168" x2="600" y2="168" stroke="#f3d38c" strokeWidth="0.4" strokeDasharray="20 10 15 5" />
          <line x1="300" y1="175" x2="500" y2="175" stroke="#f3d38c" strokeWidth="0.3" strokeDasharray="5 5" />
        </motion.g>
      </svg>
    </motion.div>
  );
}

/**
 * 11:11 Chapter 2 Monolith Pillars (Four Sloped Towers with Colon & Beam)
 */
export function Chapter2Pillars() {
  const drawTransition = { duration: 1.8, ease: 'easeInOut' as const };

  return (
    <motion.div
      className="relative w-full max-w-[460px] sm:max-w-[500px] md:max-w-[540px] h-[155px] sm:h-[185px] md:h-[220px] flex items-center justify-center mx-auto"
      animate={{
        opacity: [0.92, 1, 0.92],
        filter: [
          'drop-shadow(0 0 6px rgba(243,211,140,0.18))',
          'drop-shadow(0 0 16px rgba(243,211,140,0.42))',
          'drop-shadow(0 0 6px rgba(243,211,140,0.18))',
        ],
      }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg
        viewBox="210 65 580 400"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full block overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldMain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff8e8" />
            <stop offset="28%" stopColor="#fce8be" />
            <stop offset="62%" stopColor="#e6c280" />
            <stop offset="100%" stopColor="#8f6b38" />
          </linearGradient>
          <linearGradient id="goldDim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fce8be" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a47c42" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="innerLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff4d6" stopOpacity="0.38" />
            <stop offset="50%" stopColor="#e6c280" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#8c6836" stopOpacity="0.02" />
          </linearGradient>
          <radialGradient id="colon">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#fff4d6" />
            <stop offset="58%" stopColor="#e6c280" />
            <stop offset="100%" stopColor="#a67d40" />
          </radialGradient>
          <radialGradient id="colonGlow">
            <stop offset="0%" stopColor="#fce8be" stopOpacity="0.45" />
            <stop offset="45%" stopColor="#e6c280" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#e6c280" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e6c280" stopOpacity="0" />
            <stop offset="28%" stopColor="#fce8be" stopOpacity="0.18" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="72%" stopColor="#fce8be" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#e6c280" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* COLUMN 1 */}
        <motion.g
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          <path d="M250 455V142L330 88V455Z" fill="url(#innerLight)" opacity="0.35" />
          <motion.path
            d="M250 455V142L330 88V455"
            stroke="url(#goldMain)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={drawTransition}
          />
          <motion.path
            d="M250 142L330 88"
            stroke="#fff4dc"
            strokeWidth="2.4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
          />
          <motion.path
            d="M265 455V153L315 119V455"
            stroke="url(#goldDim)"
            strokeWidth="0.9"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0.3] }}
            transition={{ duration: 1.5, delay: 0.8 }}
          />
          <motion.path
            d="M280 455V157"
            stroke="#f3d38c"
            strokeWidth="0.7"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0.28] }}
            transition={{ duration: 1.4, delay: 1 }}
          />
          <motion.path
            d="M300 455V143"
            stroke="#f3d38c"
            strokeWidth="0.7"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.35, 0.23] }}
            transition={{ duration: 1.4, delay: 1.1 }}
          />
          <motion.path
            d="M315 455V119"
            stroke="#fce8be"
            strokeWidth="0.7"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0.28] }}
            transition={{ duration: 1.4, delay: 1.2 }}
          />
        </motion.g>

        {/* COLUMN 2 */}
        <motion.g
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.25, ease: 'easeOut' }}
        >
          <path d="M370 455V142L450 88V455Z" fill="url(#innerLight)" opacity="0.35" />
          <motion.path
            d="M370 455V142L450 88V455"
            stroke="url(#goldMain)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ ...drawTransition, delay: 0.25 }}
          />
          <motion.path
            d="M370 142L450 88"
            stroke="#fff4dc"
            strokeWidth="2.4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.75, ease: 'easeOut' }}
          />
          <motion.path
            d="M385 455V153L435 119V455"
            stroke="url(#goldDim)"
            strokeWidth="0.9"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0.3] }}
            transition={{ duration: 1.5, delay: 1 }}
          />
          <motion.path
            d="M400 455V157"
            stroke="#f3d38c"
            strokeWidth="0.7"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0.28] }}
            transition={{ duration: 1.4, delay: 1.2 }}
          />
          <motion.path
            d="M420 455V143"
            stroke="#f3d38c"
            strokeWidth="0.7"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.35, 0.23] }}
            transition={{ duration: 1.4, delay: 1.3 }}
          />
          <motion.path
            d="M435 455V119"
            stroke="#fce8be"
            strokeWidth="0.7"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0.28] }}
            transition={{ duration: 1.4, delay: 1.4 }}
          />
        </motion.g>

        {/* CENTRAL VERTICAL LIGHT BEAM */}
        <motion.rect
          x="498"
          y="75"
          width="4"
          height="380"
          fill="url(#beam)"
          animate={{ opacity: [0.35, 0.85, 0.35], scaleY: [0.96, 1, 0.96] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* COLON TOP SPHERE */}
        <motion.circle
          cx="500"
          cy="205"
          r="48"
          fill="url(#colonGlow)"
          animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.92, 1.08, 0.92] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.circle
          cx="500"
          cy="205"
          r="17"
          fill="url(#colon)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.15, 1], opacity: [0, 1, 0.9] }}
          transition={{ duration: 1, delay: 1.2, ease: 'easeOut' }}
        />

        {/* COLON BOTTOM SPHERE */}
        <motion.circle
          cx="500"
          cy="335"
          r="48"
          fill="url(#colonGlow)"
          animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.92, 1.08, 0.92] }}
          transition={{ duration: 2.8, delay: 0.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.circle
          cx="500"
          cy="335"
          r="17"
          fill="url(#colon)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.15, 1], opacity: [0, 1, 0.9] }}
          transition={{ duration: 1, delay: 1.5, ease: 'easeOut' }}
        />

        {/* COLUMN 3 */}
        <motion.g
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
        >
          <path d="M550 455V142L630 88V455Z" fill="url(#innerLight)" opacity="0.35" />
          <motion.path
            d="M550 455V142L630 88V455"
            stroke="url(#goldMain)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ ...drawTransition, delay: 0.5 }}
          />
          <motion.path
            d="M550 142L630 88"
            stroke="#fff4dc"
            strokeWidth="2.4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 1, ease: 'easeOut' }}
          />
          <path d="M565 455V153L615 119V455" stroke="url(#goldDim)" strokeWidth="0.9" opacity="0.3" />
          <path d="M580 455V157" stroke="#f3d38c" strokeWidth="0.7" opacity="0.28" />
          <path d="M600 455V143" stroke="#f3d38c" strokeWidth="0.7" opacity="0.23" />
          <path d="M615 455V119" stroke="#fce8be" strokeWidth="0.7" opacity="0.28" />
        </motion.g>

        {/* COLUMN 4 */}
        <motion.g
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.75, ease: 'easeOut' }}
        >
          <path d="M670 455V142L750 88V455Z" fill="url(#innerLight)" opacity="0.35" />
          <motion.path
            d="M670 455V142L750 88V455"
            stroke="url(#goldMain)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ ...drawTransition, delay: 0.75 }}
          />
          <motion.path
            d="M670 142L750 88"
            stroke="#fff4dc"
            strokeWidth="2.4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 1.25, ease: 'easeOut' }}
          />
          <path d="M685 455V153L735 119V455" stroke="url(#goldDim)" strokeWidth="0.9" opacity="0.3" />
          <path d="M700 455V157" stroke="#f3d38c" strokeWidth="0.7" opacity="0.28" />
          <path d="M720 455V143" stroke="#f3d38c" strokeWidth="0.7" opacity="0.23" />
          <path d="M735 455V119" stroke="#fce8be" strokeWidth="0.7" opacity="0.28" />
        </motion.g>

        {/* MONOLITH FOUNDATION BASELINE */}
        <motion.line
          x1="220"
          y1="455"
          x2="780"
          y2="455"
          stroke="#e6c280"
          strokeWidth="0.7"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 0.25, 0.2] }}
          transition={{ pathLength: { duration: 1.5, delay: 1.5 }, opacity: { duration: 2, delay: 1.5 } }}
        />
      </svg>
    </motion.div>
  );
}

/**
 * 11:11 Chapter 2 Sailing Caravel Ship on Celestial Orbit Path
 */
export function Chapter2SailingShip() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const pathD = isMobile
    ? 'M 340 -80 C 270 20, 210 140, 170 260 C 130 370, 80 450, -80 540'
    : 'M 560 -80 C 450 40, 380 160, 310 300 C 250 420, 150 540, -100 680';

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
      {/* Dashed Celestial Orbit Path */}
      <svg
        className="absolute top-[20vh] right-0 w-[75vw] sm:w-[50vw] lg:w-[42vw] h-[65vh] sm:h-[70vh]"
        viewBox={isMobile ? '0 0 300 480' : '0 0 500 600'}
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d={pathD}
          fill="transparent"
          stroke="#8c6f3d"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          className="opacity-25 sm:opacity-35"
        />
      </svg>

      {/* Ship Motion Container */}
      <div className="absolute top-[20vh] right-0 w-[75vw] sm:w-[50vw] lg:w-[42vw] h-[65vh] sm:h-[70vh]">
        <motion.div
          animate={{ offsetDistance: ['0%', '100%'] }}
          transition={{ duration: isMobile ? 24 : 32, repeat: Infinity, ease: 'linear' }}
          style={{
            offsetPath: `path("${pathD}")`,
            offsetRotate: 'auto',
            position: 'absolute',
            top: 0,
            left: 0,
            willChange: 'transform',
          }}
          className="relative w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 -translate-x-1/2 -translate-y-1/2 opacity-80 sm:opacity-95"
        >
          <motion.div
            animate={{ y: [-3, 3, -3], rotate: [-2, 2.5, -2] }}
            transition={{
              y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
              rotate: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="w-full h-full relative flex items-center justify-center"
          >
            {/* Luminous Water Reflection Underneath */}
            <motion.div
              animate={{ scaleX: [0.8, 1.3, 0.8], opacity: [0.25, 0.55, 0.25] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              className="absolute bottom-2 right-1 w-16 xs:w-20 sm:w-24 h-3 sm:h-5 rounded-full blur-sm sm:blur-md"
              style={{ background: 'radial-gradient(circle at center, rgba(230,194,128,0.4) 0%, transparent 75%)' }}
            />

            {/* The Authentic 3-Mast Caravel SVG */}
            <svg
              viewBox="0 0 120 120"
              className="w-full h-full scale-y-[-1] filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)] drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="hullGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4a3728" />
                  <stop offset="40%" stopColor="#2c2217" />
                  <stop offset="100%" stopColor="#0f0c08" />
                </linearGradient>
                <linearGradient id="goldTrim" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#d4af37" />
                  <stop offset="50%" stopColor="#fce8be" />
                  <stop offset="100%" stopColor="#aa820a" />
                </linearGradient>
                <linearGradient id="sailGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fff2d6" />
                  <stop offset="55%" stopColor="#e2bd6a" />
                  <stop offset="100%" stopColor="#7a5d32" />
                </linearGradient>
                <radialGradient id="lanternGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="35%" stopColor="#ffb300" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>

              {/* Rigging Lines */}
              <g stroke="#735731" strokeWidth="0.5" opacity="0.6">
                <line x1="16" y1="68" x2="38" y2="18" />
                <line x1="38" y1="18" x2="62" y2="10" />
                <line x1="62" y1="10" x2="84" y2="22" />
                <line x1="84" y1="22" x2="100" y2="66" />
                <line x1="28" y1="68" x2="38" y2="35" />
                <line x1="48" y1="68" x2="62" y2="25" />
                <line x1="72" y1="68" x2="84" y2="38" />
              </g>

              {/* Bowsprit */}
              <path d="M 102 70 L 118 55" stroke="url(#goldTrim)" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="104" y1="68" x2="116" y2="56" stroke="#1f1810" strokeWidth="0.8" />

              {/* Masts & Spars */}
              <g stroke="#3a2a19" strokeLinecap="round">
                <line x1="38" y1="16" x2="38" y2="76" strokeWidth="2.2" />
                <line x1="24" y1="36" x2="52" y2="34" strokeWidth="1.2" />
                <line x1="62" y1="8" x2="62" y2="78" strokeWidth="3" />
                <line x1="44" y1="28" x2="80" y2="25" strokeWidth="1.5" />
                <line x1="48" y1="50" x2="76" y2="48" strokeWidth="1.2" />
                <line x1="84" y1="20" x2="84" y2="74" strokeWidth="2.5" />
                <line x1="72" y1="40" x2="96" y2="38" strokeWidth="1" />
              </g>

              {/* Billowing Golden Sails */}
              <g fill="url(#sailGrad)" stroke="#261b0e" strokeWidth="0.8">
                <path d="M 38 18 C 58 28, 58 52, 38 58 C 48 48, 48 28, 38 18 Z" />
                <path d="M 62 10 C 82 20, 82 38, 62 42 C 72 34, 72 18, 62 10 Z" />
                <path d="M 62 44 C 88 54, 88 68, 62 72 C 76 64, 76 50, 62 44 Z" />
                <path d="M 84 22 C 98 30, 98 54, 84 60 C 92 52, 92 32, 84 22 Z" />
              </g>

              {/* Hull & Gold Trim Deck */}
              <g>
                <path
                  d="M 12 68 C 24 92, 88 94, 104 68 C 96 82, 30 84, 12 68 Z"
                  fill="url(#hullGrad)"
                  stroke="url(#goldTrim)"
                  strokeWidth="1.5"
                />
                <path d="M 16 73 C 32 84, 80 84, 100 73" stroke="#211810" strokeWidth="1" />
                <path d="M 22 78 C 38 88, 72 88, 92 78" stroke="#150f0a" strokeWidth="0.8" />
                <path d="M 16 62 L 36 62 L 38 74 L 19 74 Z" fill="#362719" stroke="url(#goldTrim)" strokeWidth="1" />
                <g fill="url(#goldTrim)">
                  <rect x="32" y="74" width="3" height="3" rx="0.5" />
                  <rect x="46" y="75" width="3" height="3" rx="0.5" />
                  <rect x="60" y="75" width="3" height="3" rx="0.5" />
                  <rect x="74" y="74" width="3" height="3" rx="0.5" />
                </g>
              </g>

              {/* Stern Glowing Lantern */}
              <g>
                <circle cx="17" cy="64" r="3.5" fill="url(#lanternGlow)" />
                <circle cx="17" cy="64" r="1.2" fill="#ffffff" />
              </g>

              {/* Crow's Nest & Admiral Flag */}
              <g>
                <rect x="58" y="24" width="8" height="4" rx="1" fill="#2c2013" stroke="url(#goldTrim)" strokeWidth="0.6" />
                <path d="M 62 8 L 78 4 L 62 0 Z" fill="#120e0a" stroke="url(#goldTrim)" strokeWidth="0.5" />
                <circle cx="68" cy="4" r="1" fill="#ffffff" />
              </g>
            </svg>

            {/* Ripple Pulse Rings */}
            <motion.div
              animate={{ scale: [0.8, 1.3], opacity: [0.4, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
              className="absolute bottom-1 w-12 sm:w-16 h-2 sm:h-3 border border-[#fce8be]/40 rounded-full"
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Combined Centerpiece Monument: Monolith Towers + Suspension Bridge
 */
export default function Chapter2Monolith() {
  return (
    <div className="relative w-full flex flex-col items-center justify-center">
      <div className="relative w-full flex items-center justify-center">
        {/* Monolith Pillars */}
        <Chapter2Pillars />

        {/* Bridge Horizon Layered Underneath Monolith Base */}
        <div className="absolute left-1/2 top-[76%] -translate-x-1/2 -translate-y-1/2 w-[125%] h-[120px] pointer-events-none z-10">
          <Chapter2Bridge />
        </div>
      </div>
    </div>
  );
}
