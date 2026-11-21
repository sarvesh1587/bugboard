import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Lenis from 'lenis';
import toast from 'react-hot-toast';
import { ArrowRight, Bell, Columns3, Filter, History, MousePointerClick, ShieldCheck, Workflow } from 'lucide-react';
import BugCanvas from '../components/BugCanvas';
import Mascot from '../components/Mascot';
import { Avatar, Blobs, Logo, Reveal, RevealText, Severity, Spinner, StatusBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/client';
import { STATUSES } from '../lib/meta';

const FEATURES = [
  { icon: ShieldCheck, tone: 'butter', title: 'Roles that mean it', text: 'Admin, Developer and Tester rules live in the API — not just hidden buttons.', wide: true },
  { icon: Workflow, tone: 'mint', title: 'A workflow that holds', text: 'Open → In Progress → Testing → Resolved → Closed. Skips get a polite no.' },
  { icon: Columns3, tone: 'sky', title: 'Drag-and-drop board', text: 'Columns light up only where your role can drop a card.' },
  { icon: History, tone: 'peach', title: 'Every change remembered', text: 'Status, assignee and edits land on a timeline: who, what, when.' },
  { icon: Filter, tone: 'rose', title: 'Filters that scale', text: 'Project, status, priority, severity, people and search — all as API query params.', wide: true },
  { icon: Bell, tone: 'butter', title: 'Little nudges', text: 'In-app notifications when you are assigned, moved or mentioned.' },
];

const ROLES = [
  { role: 'Admin', email: 'admin@bugboard.dev', color: '#F25C3D', accessory: 'crown', tone: 'butter', line: 'Runs the show', can: ['Creates projects & teams', 'Assigns anyone, anytime', 'Reopens closed issues'] },
  { role: 'Developer', email: 'diya@bugboard.dev', color: '#6FB8FF', accessory: 'glasses', tone: 'sky', line: 'Fixes the thing', can: ['Picks up open bugs', 'Starts work & ships to QA', 'Sees only their projects'] },
  { role: 'Tester', email: 'tara@bugboard.dev', color: '#5CC98F', accessory: 'magnifier', tone: 'mint', line: 'Breaks the thing', can: ['Reports bugs', 'Passes or fails QA', 'Resolves & closes'] },
];

const DEMO_PASSWORD = 'Password@123';
const float = (d = 0, y = 10) => ({ animate: { y: [0, -y, 0] }, transition: { duration: 4 + d, repeat: Infinity, ease: 'easeInOut', delay: d } });

function FlowDemo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % STATUSES.length), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flow">
      {STATUSES.map((s, i) => (
        <div key={s.id} className={`flow-col fc-${s.id} ${i === step ? 'on' : ''}`}>
          <span className="flow-label"><b>{i + 1}</b> {s.label}</span>
          <div className="flow-slot">
            {i === step && (
              <motion.div layoutId="flow-card" className="flow-card" transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
                <div className="row-between">
                  <span className="key">PAY-2</span>
                  <Avatar user={{ _id: 'diya', name: 'Diya Sharma' }} size="sm" />
                </div>
                <p>Double charge when user taps Pay twice</p>
                <div className="row-between">
                  <StatusBadge status={s.id} />
                  <Severity value="critical" />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [caught, setCaught] = useState(0);
  const [hello, setHello] = useState(false);
  const [loggingIn, setLoggingIn] = useState(null);

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1 });
    let raf;
    const loop = (t) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    if (!hello) return undefined;
    const t = setTimeout(() => setHello(false), 2600);
    return () => clearTimeout(t);
  }, [hello]);

  const quickLogin = async (email) => {
    setLoggingIn(email);
    try {
      await login(email, DEMO_PASSWORD);
      navigate('/dashboard');
    } catch (err) {
      toast.error(`${errMsg(err)} — did you run "npm run seed"?`);
    } finally {
      setLoggingIn(null);
    }
  };

  const enter = user ? '/dashboard' : '/login';

  return (
    <div className="landing">
      <Blobs />

      <header className="l-nav">
        <Link to="/"><Logo /></Link>
        <nav className="hide-md">
          <a href="#workflow">Workflow</a>
          <a href="#features">Features</a>
          <a href="#roles">Roles</a>
        </nav>
        <div style={{ display: 'flex', gap: 8 }}>
          {!user && <Link to="/login" className="btn btn-ghost btn-sm hide-sm">Sign in</Link>}
          <Link to={user ? '/dashboard' : '/register'} className="btn btn-dark btn-sm">
            {user ? 'Dashboard' : 'Get started'} <ArrowRight />
          </Link>
        </div>
      </header>

      {/* ---------------- HERO ---------------- */}
      <section className="hero">
        <BugCanvas count={12} onCatch={() => setCaught((n) => n + 1)} />

        <div className="hero-copy">
          <motion.span className="eyebrow" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16 }}>
            Bug &amp; issue tracking, made friendly
          </motion.span>
          <h1 className="display hero-title">
            <RevealText text="Catch bugs" className="line" delay={0.1} />
            <RevealText text="before they" className="line" delay={0.25} />
            <span className="line">
              <RevealText text="catch" delay={0.4} />{' '}
              <motion.span className="pop" initial={{ opacity: 0, scale: 0.3, rotate: -10 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.6 }}>
                you.
              </motion.span>
            </span>
          </h1>
          <motion.p className="hero-lede" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            BugBoard is a cosy little Jira-style tracker for small teams — projects, a strict status workflow, role-aware actions and a board you can actually drag things on.
          </motion.p>
          <motion.div className="hero-ctas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95 }}>
            <Link to={enter} className="btn btn-primary btn-lg">Open the board <ArrowRight /></Link>
            <a href="#roles" className="btn btn-lg">Try a demo</a>
          </motion.div>
        </div>

        <div className="hero-art">
          <motion.div className="pedestal" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.3 }} />
          <motion.div className="hero-mascot" initial={{ y: -260, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 11, delay: 0.5 }} onClick={() => setHello(true)}>
            <Mascot size={300} />
            <AnimatePresence>
              {hello && (
                <motion.div className="speech" initial={{ opacity: 0, scale: 0.4, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}>
                  Hi, I&apos;m Dotty! Let&apos;s catch some bugs.
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div className="float-card fc-a" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', delay: 1 }}>
            <motion.div {...float(0, 10)} className="mini-issue">
              <div className="row-between"><span className="key">MOB-1</span><Severity value="critical" /></div>
              <p>App crashes on launch when offline</p>
              <StatusBadge status="in_progress" />
            </motion.div>
          </motion.div>
          <motion.div className="float-card fc-b" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', delay: 1.2 }}>
            <motion.div {...float(0.8, 8)} className="mini-note">
              <Avatar user={{ _id: 'tara', name: 'Tara Iyer' }} size="sm" />
              <span><b>Tara</b> moved PAY-9 to <b>Resolved</b></span>
            </motion.div>
          </motion.div>
          <motion.div className="float-card fc-c" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', delay: 1.4 }}>
            <motion.div {...float(1.4, 12)}>
              <StatusBadge status="resolved" />
            </motion.div>
          </motion.div>
        </div>

        <motion.div className="catch-meter" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 }}>
          <MousePointerClick size={16} />
          <span>{caught === 0 ? 'Tap the little bugs!' : 'Bugs caught'}</span>
          <AnimatePresence mode="popLayout">
            <motion.b key={caught} initial={{ scale: 0.2, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}>
              {caught}
            </motion.b>
          </AnimatePresence>
        </motion.div>
      </section>

      {/* ---------------- TICKER ---------------- */}
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[0, 1, 2].map((k) => (
            <span key={k}>
              {STATUSES.map((s) => (
                <span key={s.id} className={`tick t-${s.id}`}>{s.label}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ---------------- WORKFLOW ---------------- */}
      <section className="l-section" id="workflow">
        <div className="l-head">
          <Reveal><span className="eyebrow">The workflow</span></Reveal>
          <Reveal delay={0.05}><h2 className="display l-title">One bug. <span className="pop">Five</span> stops.</h2></Reveal>
          <Reveal delay={0.1}><p className="l-lede">Every move is checked on the server against who you are and where the issue is. Skip a step and the API says no — with a reason.</p></Reveal>
        </div>
        <Reveal delay={0.15}><FlowDemo /></Reveal>
      </section>

      {/* ---------------- FEATURES ---------------- */}
      <section className="l-section" id="features">
        <div className="l-head">
          <Reveal><span className="eyebrow">What&apos;s inside</span></Reveal>
          <Reveal delay={0.05}><h2 className="display l-title">Small app. <span className="pop">Big</span> heart.</h2></Reveal>
        </div>
        <div className="features">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
              className={`feature tone-${f.tone} ${f.wide ? 'wide' : ''}`}
              initial={{ opacity: 0, y: 40, rotate: i % 2 ? 2 : -2 }}
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ type: 'spring', stiffness: 200, damping: 18, delay: (i % 3) * 0.08 }}
              whileHover={{ y: -8, rotate: i % 2 ? 1.2 : -1.2 }}
            >
              <span className="feature-icon"><f.icon /></span>
              <h3 className="display">{f.title}</h3>
              <p>{f.text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ---------------- ROLES ---------------- */}
      <section className="l-section" id="roles">
        <div className="l-head">
          <Reveal><span className="eyebrow">Three roles · one tap each</span></Reveal>
          <Reveal delay={0.05}><h2 className="display l-title">Meet the <span className="pop">crew</span>.</h2></Reveal>
          <Reveal delay={0.1}>
            <p className="l-lede">Seeded demo accounts — password <code className="code-pill">{DEMO_PASSWORD}</code>. Each one sees a different slice of the same data.</p>
          </Reveal>
        </div>
        <div className="roles">
          {ROLES.map((r, i) => (
            <motion.article
              key={r.role}
              className={`role-card tone-${r.tone}`}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ type: 'spring', stiffness: 180, damping: 16, delay: i * 0.1 }}
            >
              <div className="role-mascot"><Mascot size={150} color={r.color} accessory={r.accessory} /></div>
              <h3 className="display">{r.role}</h3>
              <p className="role-line">{r.line}</p>
              <ul>{r.can.map((c) => <li key={c}>{c}</li>)}</ul>
              <button className="btn btn-dark" onClick={() => quickLogin(r.email)} disabled={!!loggingIn}>
                {loggingIn === r.email ? <Spinner /> : <ArrowRight />} Enter as {r.role.toLowerCase()}
              </button>
              <span className="mono muted role-email">{r.email}</span>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="l-cta-wrap">
        <Reveal className="l-cta">
          <div>
            <h2 className="display">Ready to catch<br />some bugs?</h2>
            <p>Projects, roles, a real workflow and a board — all in one cosy place.</p>
            <Link to={enter} className="btn btn-primary btn-lg">Start tracking <ArrowRight /></Link>
          </div>
          <div className="cta-mascots">
            <Mascot size={120} color="#6FB8FF" accessory="glasses" />
            <Mascot size={170} />
            <Mascot size={120} color="#5CC98F" accessory="magnifier" />
          </div>
        </Reveal>
        <footer className="l-footer">
          <Logo />
          <span className="muted">MongoDB · Express · React · Node</span>
        </footer>
      </section>
    </div>
  );
}
