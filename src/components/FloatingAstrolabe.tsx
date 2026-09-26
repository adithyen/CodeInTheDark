'use client';

import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function FloatingAstrolabe() {
  const { scrollYProgress } = useScroll();
  const rotateOuter = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const rotateNeedleScroll = useTransform(scrollYProgress, [0, 1], [0, -720]);

  const waypointsTop = ['8vh', '55vh', '18vh', '70vh', '30vh', '62vh', '12vh', '45vh', '75vh', '22vh', '8vh'];
  const waypointsLeft = ['6vw', '45vw', '68vw', '15vw', '72vw', '35vw', '58vw', '10vw', '50vw', '78vw', '6vw'];
  const times = [0, 0.09, 0.19, 0.3, 0.41, 0.52, 0.62, 0.72, 0.83, 0.93, 1];

  return (
    <motion.div
      className="hidden sm:block fixed z-[2] opacity-100 pointer-events-none"
      animate={{
        top: waypointsTop,
        left: waypointsLeft,
      }}
      transition={{
        duration: 45,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatType: 'loop',
        times,
      }}
    >
      <div className="relative select-none flex items-center justify-center p-1" title="Compass — synchronized with your journey">
        <motion.div
          style={{ rotate: rotateOuter }}
          className="relative w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 flex items-center justify-center"
        >
          {/* Outer Radial Glow */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,_rgba(230,194,128,0.18),_transparent_70%)] pointer-events-none" />

          {/* Heavy Ancient Brass Dial Rim */}
          <div className="absolute inset-0 border-[2px] sm:border-[2.5px] border-[#2a2218] rounded-full shadow-[0_0_25px_rgba(0,0,0,0.95)] bg-[#090806]/92 backdrop-blur-md flex items-center justify-center">
            {/* Inner Border Rings */}
            <div className="absolute inset-1 sm:inset-1.5 border border-[#6b5535]/50 rounded-full" />
            <div className="absolute inset-2.5 sm:inset-3 border border-dashed border-[#a68a56]/30 rounded-full" />

            {/* Cardinal Degree Labels */}
            <span className="absolute top-0.5 sm:top-1 text-[9px] xs:text-[10px] sm:text-xs font-serif font-bold text-[#e6c280] tracking-widest drop-shadow-[0_0_8px_rgba(230,194,128,0.8)]">
              N
            </span>
            <span className="absolute bottom-0.5 sm:bottom-1 text-[8px] xs:text-[9px] sm:text-[10px] font-serif font-semibold text-[#8c6f3d] tracking-widest">
              S
            </span>
            <span className="absolute left-1 sm:left-1.5 text-[8px] xs:text-[9px] sm:text-[10px] font-serif font-semibold text-[#8c6f3d] tracking-widest">
              W
            </span>
            <span className="absolute right-1 sm:right-1.5 text-[8px] xs:text-[9px] sm:text-[10px] font-serif font-semibold text-[#8c6f3d] tracking-widest">
              E
            </span>

            {/* Crosshair Gradients */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
              <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
              <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-[#d4af37] to-transparent" />
              <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#8c6f3d] to-transparent rotate-45" />
              <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#8c6f3d] to-transparent -rotate-45" />
            </div>

            {/* Oscillating & Scroll Needle */}
            <motion.div
              style={{ rotate: rotateNeedleScroll }}
              animate={{ rotate: [12, -18, 25, -8, 15, 0] }}
              transition={{ repeat: Infinity, repeatType: 'mirror', duration: 9, ease: 'easeInOut' }}
              className="relative w-1.5 xs:w-2 h-14 xs:h-16 sm:h-18 md:h-22 flex flex-col justify-between items-center origin-center z-10"
            >
              {/* North Spearhead (Glowing Ivory / Gold) */}
              <div className="w-0 h-0 border-l-[3.5px] xs:border-l-[4px] sm:border-l-[4.5px] border-l-transparent border-r-[3.5px] xs:border-r-[4px] sm:border-r-[4.5px] border-r-transparent border-b-[26px] xs:border-b-[30px] sm:border-b-[36px] border-b-[#fce8be] drop-shadow-[0_0_12px_rgba(230,194,128,0.9)]" />
              {/* South Tail (Ancient Espresso Bronze) */}
              <div className="w-0 h-0 border-l-[3.5px] xs:border-l-[4px] sm:border-l-[4.5px] border-l-transparent border-r-[3.5px] xs:border-r-[4px] sm:border-r-[4.5px] border-r-transparent border-t-[26px] xs:border-t-[30px] sm:border-t-[36px] border-t-[#3a2d1d]" />
            </motion.div>

            {/* Central Polished Brass Pivot Pin */}
            <div className="absolute w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 bg-gradient-to-br from-[#fce8be] via-[#d4af37] to-[#4a3b25] rounded-full border border-[#1a140e] shadow-[0_0_8px_rgba(0,0,0,0.8)] z-20" />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
