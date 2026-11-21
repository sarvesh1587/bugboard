import { useEffect, useRef } from 'react';

/**
 * Canvas of little clay ladybugs.
 *  - they wander with smooth steering and wiggling legs
 *  - they scurry away from the pointer
 *  - click / tap one to "catch" it: it pops into confetti and a new one wanders in
 * Pauses automatically when off-screen.
 */
const PALETTE = ['#F25C3D', '#FF8A5B', '#FFC94A', '#6FB8FF', '#5CC98F', '#FF7FA0'];
const COCOA = '#3a2a24';

export default function BugCanvas({ count = 14, onCatch, className = '' }) {
  const ref = useRef(null);
  const catchRef = useRef(onCatch);

  useEffect(() => {
    catchRef.current = onCatch;
  }, [onCatch]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let w = 0;
    let h = 0;
    let raf = 0;
    let running = true;
    const pointer = { x: -9999, y: -9999 };
    const bursts = [];

    const spawn = (atEdge = false) => {
      let x = Math.random() * w;
      let y = Math.random() * h;
      if (atEdge) {
        const side = Math.floor(Math.random() * 4);
        x = side === 0 ? -20 : side === 1 ? w + 20 : Math.random() * w;
        y = side === 2 ? -20 : side === 3 ? h + 20 : Math.random() * h;
      }
      return {
        x,
        y,
        a: Math.random() * Math.PI * 2,
        turn: 0,
        speed: 0.3 + Math.random() * 0.45,
        r: 9 + Math.random() * 8,
        phase: Math.random() * 10,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        scale: atEdge ? 0 : 1,
      };
    };

    let bugs = [];
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(count * Math.min(1, (w * h) / (1280 * 720)) + 4);
      while (bugs.length < target) bugs.push(spawn());
      bugs.length = target;
    };

    const drawBug = (b, t) => {
      const r = b.r * b.scale;
      if (r <= 0.5) return;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.a);

      // soft drop shadow
      ctx.fillStyle = 'rgba(58,42,36,0.13)';
      ctx.beginPath();
      ctx.ellipse(2, r * 0.55, r * 1.05, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // legs
      const gait = Math.sin(t * 0.02 * (1 + b.speed) + b.phase);
      ctx.strokeStyle = COCOA;
      ctx.lineWidth = Math.max(1.4, r * 0.16);
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        for (const side of [-1, 1]) {
          const swing = (i % 2 === 0 ? gait : -gait) * side * r * 0.25;
          ctx.beginPath();
          ctx.moveTo(i * r * 0.5, side * r * 0.6);
          ctx.lineTo(i * r * 0.5 + swing, side * r * 1.15);
          ctx.stroke();
        }
      }

      // head
      ctx.fillStyle = COCOA;
      ctx.beginPath();
      ctx.arc(r * 0.9, 0, r * 0.48, 0, Math.PI * 2);
      ctx.fill();

      // clay body with highlight
      const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.28, b.color);
      g.addColorStop(1, b.color);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // wing line + spots
      ctx.strokeStyle = 'rgba(58,42,36,0.75)';
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(r * 0.85, 0);
      ctx.lineTo(-r * 0.95, 0);
      ctx.stroke();
      ctx.fillStyle = COCOA;
      [[0.2, -0.45, 0.2], [0.2, 0.45, 0.2], [-0.45, -0.35, 0.16], [-0.45, 0.35, 0.16]].forEach(([sx, sy, sr]) => {
        ctx.beginPath();
        ctx.arc(sx * r, sy * r, sr * r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    };

    const drawBurst = (bt) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, bt.life);
      bt.parts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.vx *= 0.98;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (p.star) {
          // little 4-point sparkle
          const s = p.r * 1.6;
          ctx.moveTo(p.x, p.y - s);
          ctx.quadraticCurveTo(p.x, p.y, p.x + s, p.y);
          ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + s);
          ctx.quadraticCurveTo(p.x, p.y, p.x - s, p.y);
          ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - s);
        } else {
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        }
        ctx.fill();
      });
      // "+1" floating up
      ctx.fillStyle = COCOA;
      ctx.font = '700 18px Fredoka, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+1', bt.x, bt.y - 18 - (1 - bt.life) * 40);
      ctx.restore();
    };

    const tick = (t) => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);

      for (const b of bugs) {
        b.turn += (Math.random() - 0.5) * 0.07;
        b.turn *= 0.92;
        b.a += b.turn;
        let speed = b.speed;

        const dx = b.x - pointer.x;
        const dy = b.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 130) {
          let diff = Math.atan2(dy, dx) - b.a;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          b.a += diff * 0.16;
          speed *= 1 + (130 - dist) / 32;
        }

        const m = 30;
        if (b.x < m || b.x > w - m || b.y < m || b.y > h - m) {
          let diff = Math.atan2(h / 2 - b.y, w / 2 - b.x) - b.a;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          b.a += diff * 0.05;
        }

        b.x += Math.cos(b.a) * speed;
        b.y += Math.sin(b.a) * speed;
        if (b.scale < 1) b.scale = Math.min(1, b.scale + 0.04);
        drawBug(b, t);
      }

      for (let i = bursts.length - 1; i >= 0; i--) {
        bursts[i].life -= 0.018;
        if (bursts[i].life <= 0) bursts.splice(i, 1);
        else drawBurst(bursts[i]);
      }
      raf = requestAnimationFrame(tick);
    };

    const localPoint = (e) => {
      const rect = canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return { x: p.clientX - rect.left, y: p.clientY - rect.top };
    };
    const onMove = (e) => Object.assign(pointer, localPoint(e));
    const onLeave = () => Object.assign(pointer, { x: -9999, y: -9999 });
    const onDown = (e) => {
      const p = localPoint(e);
      let hit = -1;
      let best = 38;
      bugs.forEach((b, i) => {
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        if (d < best) {
          best = d;
          hit = i;
        }
      });
      if (hit < 0) return;
      const b = bugs[hit];
      bursts.push({
        x: b.x,
        y: b.y,
        life: 1,
        parts: Array.from({ length: 16 }, (_, k) => {
          const ang = (k / 16) * Math.PI * 2;
          const v = 2 + Math.random() * 3;
          return {
            x: b.x,
            y: b.y,
            vx: Math.cos(ang) * v,
            vy: Math.sin(ang) * v - 1.5,
            r: 2 + Math.random() * 3,
            star: k % 3 === 0,
            color: k % 2 ? b.color : PALETTE[(k + 2) % PALETTE.length],
          };
        }),
      });
      bugs[hit] = spawn(true);
      if (navigator.vibrate) navigator.vibrate(15);
      catchRef.current?.();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        raf = requestAnimationFrame(tick);
      } else if (!entry.isIntersecting) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(canvas);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointerdown', onDown);
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('touchmove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerdown', onDown);
    };
  }, [count]);

  return <canvas ref={ref} className={`bug-canvas ${className}`} aria-hidden="true" />;
}
