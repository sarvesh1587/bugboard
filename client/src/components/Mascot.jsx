import { useEffect, useId, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * "Dotty" — the BugBoard ladybug mascot, drawn in SVG with clay-style shading.
 *  - pupils follow the pointer (or touch)
 *  - blinks on its own, bobs gently, hops when clicked
 *  - optional accessory: crown (admin), glasses (developer), magnifier (tester)
 */
export default function Mascot({ size = 220, color = '#F25C3D', accessory, track = true, hop = true, className = '', mood = 'happy', title = 'Dotty the ladybug' }) {
  const ref = useRef(null);
  const uid = useId().replace(/:/g, '');
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 220, damping: 18 });
  const sy = useSpring(py, { stiffness: 220, damping: 18 });
  const [jump, setJump] = useState(0);

  useEffect(() => {
    if (!track) return undefined;
    const onMove = (e) => {
      const p = e.touches ? e.touches[0] : e;
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const dx = p.clientX - (r.left + r.width / 2);
      const dy = p.clientY - (r.top + r.height * 0.3);
      const d = Math.max(1, Math.hypot(dx, dy));
      const k = Math.min(1, d / 260);
      px.set((dx / d) * 4.5 * k);
      py.set((dy / d) * 4.5 * k);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('touchmove', onMove);
    };
  }, [track, px, py]);

  const shade = `${uid}-shade`;
  const head = `${uid}-head`;

  return (
    <motion.svg
      ref={ref}
      viewBox="0 0 200 210"
      width={size}
      height={size * 1.05}
      className={`mascot ${className}`}
      role="img"
      aria-label={title}
      onClick={() => hop && setJump((j) => j + 1)}
      style={{ cursor: hop ? 'pointer' : 'default', overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={shade} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="35%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} />
        </radialGradient>
        <radialGradient id={head} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#6b5148" />
          <stop offset="100%" stopColor="#2e211c" />
        </radialGradient>
      </defs>

      {/* ground shadow */}
      <motion.ellipse
        cx="100"
        cy="200"
        rx="58"
        ry="8"
        fill="rgba(58,42,36,0.16)"
        animate={{ scaleX: [1, 0.9, 1] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '100px 200px' }}
      />

      <motion.g
        key={jump}
        initial={jump ? { y: 0 } : false}
        animate={jump ? { y: [0, -34, 0, -8, 0], rotate: [0, -6, 0, 3, 0] } : { y: [0, -5, 0] }}
        transition={jump ? { duration: 0.8, ease: 'easeOut' } : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '100px 190px' }}
        onAnimationComplete={() => jump && setJump(0)}
      >
        {/* legs */}
        <g stroke="#3a2a24" strokeWidth="7" strokeLinecap="round" fill="none">
          <path d="M44 128 30 136" />
          <path d="M40 152 26 164" />
          <path d="M50 176 40 190" />
          <path d="M156 128 170 136" />
          <path d="M160 152 174 164" />
          <path d="M150 176 160 190" />
        </g>

        {/* body */}
        <circle cx="100" cy="125" r="66" fill={`url(#${shade})`} />
        <circle cx="100" cy="125" r="66" fill="none" stroke="rgba(58,42,36,0.12)" strokeWidth="3" />
        <path d="M100 70 V190" stroke="#3a2a24" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
        <g fill="#3a2a24">
          <circle cx="68" cy="118" r="11" />
          <circle cx="132" cy="118" r="11" />
          <circle cx="76" cy="160" r="9" />
          <circle cx="124" cy="160" r="9" />
          <circle cx="56" cy="146" r="6" />
          <circle cx="144" cy="146" r="6" />
        </g>
        {/* clay highlight */}
        <ellipse cx="70" cy="92" rx="20" ry="10" fill="#fff" opacity="0.45" transform="rotate(-28 70 92)" />

        {/* antennae */}
        <motion.g
          stroke="#3a2a24"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          animate={{ rotate: [0, 4, -3, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '100px 40px' }}
        >
          <path d="M86 30 Q78 12 66 8" />
          <path d="M114 30 Q122 12 134 8" />
        </motion.g>
        <circle cx="64" cy="8" r="7" fill={color} />
        <circle cx="136" cy="8" r="7" fill={color} />

        {/* head */}
        <circle cx="100" cy="58" r="40" fill={`url(#${head})`} />
        <ellipse cx="84" cy="38" rx="12" ry="6" fill="#fff" opacity="0.14" transform="rotate(-20 84 38)" />

        {/* cheeks */}
        <ellipse cx="72" cy="72" rx="8" ry="4.5" fill="#ff9e8f" opacity="0.75" />
        <ellipse cx="128" cy="72" rx="8" ry="4.5" fill="#ff9e8f" opacity="0.75" />

        {/* eyes */}
        <motion.g
          animate={{ scaleY: [1, 1, 0.08, 1, 1] }}
          transition={{ duration: 4.2, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity }}
          style={{ transformOrigin: '100px 56px' }}
        >
          <ellipse cx="85" cy="55" rx="12" ry="13" fill="#fff" />
          <ellipse cx="115" cy="55" rx="12" ry="13" fill="#fff" />
          <motion.g style={{ x: sx, y: sy }}>
            <circle cx="86" cy="57" r="6.5" fill="#1f1512" />
            <circle cx="116" cy="57" r="6.5" fill="#1f1512" />
            <circle cx="88.5" cy="54" r="2.2" fill="#fff" />
            <circle cx="118.5" cy="54" r="2.2" fill="#fff" />
          </motion.g>
        </motion.g>

        {/* mouth */}
        {mood === 'sad' ? (
          <path d="M92 82 Q100 75 108 82" stroke="#ffb3a6" strokeWidth="4" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M91 77 Q100 87 109 77" stroke="#ffb3a6" strokeWidth="4" strokeLinecap="round" fill="none" />
        )}

        {/* accessories */}
        {accessory === 'crown' && (
          <g transform="translate(0 -4)">
            <path d="M76 26 L80 4 L92 18 L100 0 L108 18 L120 4 L124 26 Z" fill="#ffc94a" stroke="#c98a12" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="100" cy="16" r="3.5" fill="#f25c3d" />
          </g>
        )}
        {accessory === 'glasses' && (
          <g fill="none" stroke="#ffd66b" strokeWidth="4">
            <circle cx="85" cy="55" r="16" />
            <circle cx="115" cy="55" r="16" />
            <path d="M101 55 h-2" />
            <path d="M69 52 L60 48" />
            <path d="M131 52 L140 48" />
          </g>
        )}
        {accessory === 'magnifier' && (
          <motion.g animate={{ rotate: [0, -8, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: '170px 150px' }}>
            <path d="M178 158 L196 182" stroke="#8a5a3c" strokeWidth="9" strokeLinecap="round" />
            <circle cx="166" cy="142" r="20" fill="rgba(207,229,255,0.75)" stroke="#3a2a24" strokeWidth="6" />
            <ellipse cx="160" cy="135" rx="6" ry="3" fill="#fff" opacity="0.8" transform="rotate(-30 160 135)" />
          </motion.g>
        )}
      </motion.g>
    </motion.svg>
  );
}
