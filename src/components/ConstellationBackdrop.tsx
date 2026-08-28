import { useEffect, useRef } from "react";

type Dot = { x: number; y: number; vx: number; vy: number; r: number };

const DOT_DENSITY = 1 / 14000; // dots per px^2
const MAX_DOTS = 140;
const LINK_DISTANCE = 140;
const CURSOR_RADIUS = 220;
const PARALLAX = 26;

/**
 * Animated constellation canvas: soft drifting dots linked by faint lines,
 * gently parallaxed by the pointer. Freezes drift under prefers-reduced-motion.
 */
export function ConstellationBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;

    let width = 0;
    let height = 0;
    let dots: Dot[] = [];
    let frame = 0;

    // Target parallax offset (from pointer) and the eased current offset.
    const pointer = { x: -9999, y: -9999 };
    const target = { x: 0, y: 0 };
    const offset = { x: 0, y: 0 };

    const seedDots = () => {
      const count = Math.min(MAX_DOTS, Math.round(width * height * DOT_DENSITY));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: 0.8 + Math.random() * 1.6,
      }));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedDots();
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      target.x = (pointer.x / Math.max(rect.width, 1) - 0.5) * PARALLAX;
      target.y = (pointer.y / Math.max(rect.height, 1) - 0.5) * PARALLAX;
    };

    const onPointerLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
      target.x = 0;
      target.y = 0;
    };

    const draw = () => {
      offset.x += (target.x - offset.x) * 0.05;
      offset.y += (target.y - offset.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      if (!reducedMotion) {
        for (const d of dots) {
          d.x += d.vx;
          d.y += d.vy;
          if (d.x < -20) d.x = width + 20;
          if (d.x > width + 20) d.x = -20;
          if (d.y < -20) d.y = height + 20;
          if (d.y > height + 20) d.y = -20;
        }
      }

      // Links
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        if (!a) continue;
        const ax = a.x + offset.x;
        const ay = a.y + offset.y;
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          if (!b) continue;
          const bx = b.x + offset.x;
          const by = b.y + offset.y;
          const dx = ax - bx;
          const dy = ay - by;
          const dist = Math.hypot(dx, dy);
          if (dist > LINK_DISTANCE) continue;

          const falloff = 1 - dist / LINK_DISTANCE;
          const midX = (ax + bx) / 2;
          const midY = (ay + by) / 2;
          const near = Math.max(
            0,
            1 - Math.hypot(midX - pointer.x, midY - pointer.y) / CURSOR_RADIUS,
          );
          ctx.strokeStyle = `rgba(226, 232, 240, ${falloff * (0.07 + near * 0.16)})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      }

      // Dots
      for (const d of dots) {
        const x = d.x + offset.x;
        const y = d.y + offset.y;
        const near = Math.max(
          0,
          1 - Math.hypot(x - pointer.x, y - pointer.y) / CURSOR_RADIUS,
        );
        ctx.fillStyle = `rgba(226, 232, 240, ${0.22 + near * 0.45})`;
        ctx.beginPath();
        ctx.arc(x, y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      frame = window.requestAnimationFrame(draw);
    };

    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
    };

    resize();
    frame = window.requestAnimationFrame(draw);

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);
    motionQuery.addEventListener("change", onMotionChange);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      motionQuery.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
