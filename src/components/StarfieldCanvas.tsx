'use client';

import React, { useEffect, useRef } from 'react';

export default function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();

    const mouse = {
      x: -1000,
      y: -1000,
      vx: 0,
      vy: 0,
      radius: Math.min(0.25 * width, 180),
    };

    let prevX = -1000;
    let prevY = -1000;

    const updateMouse = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const nx = clientX - rect.left;
      const ny = clientY - rect.top;
      if (prevX !== -1000) {
        mouse.vx = (nx - prevX) * 0.25;
        mouse.vy = (ny - prevY) * 0.25;
      }
      mouse.x = nx;
      mouse.y = ny;
      prevX = nx;
      prevY = ny;
    };

    const onMouseMove = (e: MouseEvent) => updateMouse(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) updateMouse(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchstart', onTouchMove, { passive: true });

    const isMobile = width < 640;
    const particleCount = Math.min(Math.floor((width * height) / (isMobile ? 5500 : 3200)), 280);
    const particles: Array<{
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      baseAlpha: number;
      twinkleSpeed: number;
      phase: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const alpha = 0.15 + 0.65 * Math.random();
      particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        vx: 0,
        vy: 0,
        size: isMobile ? 0.6 + 1.4 * Math.random() : 0.8 + 2.0 * Math.random(),
        alpha,
        baseAlpha: alpha,
        twinkleSpeed: 0.015 + 0.03 * Math.random(),
        phase: Math.random() * Math.PI * 2,
      });
    }

    const onResize = () => {
      handleResize();
      mouse.radius = Math.min(0.25 * window.innerWidth, 180);
    };
    window.addEventListener('resize', onResize);

    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      mouse.vx *= 0.92;
      mouse.vy *= 0.92;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          const force = (1 - dist / mouse.radius) * 1.8;
          const angle = Math.atan2(dy, dx);
          const pushX = Math.cos(angle) * force * 3.2;
          const pushY = Math.sin(angle) * force * 3.2;
          p.vx += pushX + mouse.vx * force;
          p.vy += pushY + mouse.vy * force;
          p.alpha = Math.min(1, p.baseAlpha + 0.75 * force);
        } else {
          p.phase += p.twinkleSpeed;
          const twinkle = 0.2 * Math.sin(p.phase);
          p.alpha += (p.baseAlpha + twinkle - p.alpha) * 0.05;
        }

        p.vx *= 0.88;
        p.vy *= 0.88;

        const returnX = p.baseX - p.x;
        const returnY = p.baseY - p.y;
        p.vx += 0.005 * returnX;
        p.vy += 0.005 * returnY;

        p.x += p.vx;
        p.y += p.vy;

        p.baseX += 0.16 * Math.sin((p.y + frame) * 0.008);
        p.baseY += 0.16 * Math.cos((p.x + frame) * 0.008);

        if (p.baseX < 0) p.baseX = width;
        if (p.baseX > width) p.baseX = 0;
        if (p.baseY < 0) p.baseY = height;
        if (p.baseY > height) p.baseY = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(230, 194, 128, ${Math.max(0, Math.min(1, p.alpha))})`;
        if (!isMobile && p.size > 1.4) {
          ctx.shadowBlur = 2.5 * p.size;
          ctx.shadowColor = 'rgba(212, 175, 55, 0.6)';
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchstart', onTouchMove);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 block w-full h-full" />;
}
