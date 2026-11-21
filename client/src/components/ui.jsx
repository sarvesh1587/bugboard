import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useInView } from 'framer-motion';
import { ArrowDown, ArrowUp, ChevronsUp, Equal, X, RefreshCw } from 'lucide-react';
import Mascot from './Mascot';
import { STATUS, cap, initials, toneFor } from '../lib/meta';

/* ---------------- Brand ---------------- */
/** Small clay ladybug used as the logo mark and icon */
export const BugGlyph = ({ size = 30, color = '#F25C3D', ...props }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" {...props}>
    <defs>
      <radialGradient id="bg-glyph" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.6" />
        <stop offset="40%" stopColor={color} />
      </radialGradient>
    </defs>
    <path d="M15 9 Q12 4 9 3 M25 9 Q28 4 31 3" stroke="#3a2a24" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    <circle cx="20" cy="24" r="14" fill="url(#bg-glyph)" />
    <path d="M20 13v25" stroke="#3a2a24" strokeWidth="1.8" />
    <circle cx="20" cy="12" r="7.5" fill="#3a2a24" />
    <circle cx="17.3" cy="11.5" r="2.2" fill="#fff" />
    <circle cx="22.7" cy="11.5" r="2.2" fill="#fff" />
    <circle cx="13.5" cy="24" r="2.6" fill="#3a2a24" />
    <circle cx="26.5" cy="24" r="2.6" fill="#3a2a24" />
    <circle cx="15.5" cy="31.5" r="2" fill="#3a2a24" />
    <circle cx="24.5" cy="31.5" r="2" fill="#3a2a24" />
  </svg>
);

export const Logo = () => (
  <span className="logo">
    <span className="logo-mark"><BugGlyph /></span>
    BugBoard
  </span>
);

/** Soft drifting clay blobs behind the whole app */
export const Blobs = () => (
  <div className="blobs" aria-hidden="true">
    <span className="blob b1" />
    <span className="blob b2" />
    <span className="blob b3" />
    <span className="blob b4" />
  </div>
);

/* ---------------- People ---------------- */
export function Avatar({ user, size = '', title }) {
  if (!user) return <span className={`avatar empty ${size}`} title="Unassigned">—</span>;
  return (
    <span className={`avatar ${size}`} style={{ '--tone': toneFor(user._id) }} title={title || user.name}>
      {initials(user.name)}
    </span>
  );
}

export const Person = ({ user, size = 'sm', fallback = 'Unassigned' }) => (
  <span className="person">
    <Avatar user={user} size={size} />
    <span className={user ? '' : 'muted'}>{user ? user.name : fallback}</span>
  </span>
);

/* ---------------- Issue meta ---------------- */
export const StatusBadge = ({ status }) => (
  <span className={`status s-${status}`}>
    <i />
    {STATUS[status]?.label || status}
  </span>
);

const SEV_LEVEL = { low: 1, medium: 2, high: 3, critical: 4 };
export const Severity = ({ value }) => (
  <span className={`sev lv-${SEV_LEVEL[value]}`} title={`Severity: ${value}`}>
    <span className="bars"><b /><b /><b /><b /></span>
    {value}
  </span>
);

const PRIO_ICON = { low: ArrowDown, medium: Equal, high: ArrowUp, urgent: ChevronsUp };
export const Priority = ({ value }) => {
  const Icon = PRIO_ICON[value] || Equal;
  return (
    <span className={`prio p-${value}`} title={`Priority: ${value}`}>
      <Icon />
      {cap(value)}
    </span>
  );
};

/* ---------------- Inputs ---------------- */
export function Segmented({ options, value, onChange, id }) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((opt) => {
        const v = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const active = v === value;
        return (
          <button type="button" key={v} role="radio" aria-checked={active} className={active ? 'active' : ''} onClick={() => onChange(v)}>
            {active && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

export const Field = ({ label, error, children, htmlFor }) => (
  <div className="field">
    {label && <label htmlFor={htmlFor}>{label}</label>}
    {children}
    <AnimatePresence>
      {error && (
        <motion.span className="field-error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {error}
        </motion.span>
      )}
    </AnimatePresence>
  </div>
);

/* ---------------- Modal ---------------- */
export function Modal({ open, onClose, eyebrow, title, children, footer, width }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div
            className="modal"
            role="dialog"
            aria-modal="true"
            style={width ? { width: `min(${width}px, 100%)` } : undefined}
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 360, damping: 24 }}
          >
            <div className="modal-head">
              <div>
                {eyebrow && <span className="eyebrow">{eyebrow}</span>}
                <h2>{title}</h2>
              </div>
              <button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button>
            </div>
            {children}
            {footer && <div className="modal-foot">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- States ---------------- */
export const Spinner = () => <span className="spinner" aria-label="Loading" />;

export const SkeletonRows = ({ rows = 6, height = 54 }) => (
  <div style={{ display: 'grid', gap: 10 }}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="skeleton" style={{ height, opacity: 1 - i * 0.12 }} />
    ))}
  </div>
);

export function EmptyState({ title = 'Nothing here', text, action }) {
  return (
    <motion.div className="state" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Mascot size={110} track hop />
      <h4>{title}</h4>
      {text && <p>{text}</p>}
      {action}
    </motion.div>
  );
}

export const ErrorState = ({ message, onRetry }) => (
  <div className="state error">
    <Mascot size={100} mood="sad" track={false} hop={false} color="#9aa7b4" />
    <h4>Oops, couldn&apos;t load this</h4>
    <p>{message}</p>
    {onRetry && (
      <button className="btn btn-sm" onClick={onRetry}>
        <RefreshCw /> Try again
      </button>
    )}
  </div>
);

/* ---------------- Motion helpers ---------------- */
export function CountUp({ value = 0, duration = 1.4, pad = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    if (!inView) return undefined;
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, inView, duration]);

  return <span ref={ref}>{String(display).padStart(pad, '0')}</span>;
}

/** Splits text into words that slide up from a mask — used for big headings */
export function RevealText({ text, className = '', delay = 0, as: Tag = 'span' }) {
  const words = text.split(' ');
  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.08em' }} aria-hidden="true">
          <motion.span
            style={{ display: 'inline-block' }}
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: delay + i * 0.08 }}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

export const Reveal = ({ children, delay = 0, y = 30, className, as = 'div' }) => {
  const M = motion[as];
  return (
    <M className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </M>
  );
};

/** Container + item variants for staggered lists */
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};
export const rise = {
  hidden: { opacity: 0, y: 24, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } },
};
