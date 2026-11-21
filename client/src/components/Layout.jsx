import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNowStrict } from 'date-fns';
import { Bell, CheckCheck, LogOut, Menu, Plus, Users, X } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Avatar, Blobs, Logo } from './ui';
import Mascot from './Mascot';
import NewIssueModal from './NewIssueModal';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/issues', label: 'Issues' },
  { to: '/board', label: 'Board' },
  { to: '/projects', label: 'Projects' },
];

function useOutside(ref, onOutside) {
  useEffect(() => {
    const handler = (e) => ref.current && !ref.current.contains(e.target) && onOutside();
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [ref, onOutside]);
}

function Notifications() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useOutside(ref, close);

  const load = useCallback(() => {
    api.get('/notifications').then(({ data: d }) => setData(d)).catch(() => {});
  }, []);

  // Light polling keeps the bell fresh without websockets
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    window.addEventListener('bugboard:issues-changed', load);
    return () => {
      clearInterval(t);
      window.removeEventListener('bugboard:issues-changed', load);
    };
  }, [load]);

  const openItem = async (n) => {
    if (!n.read) api.patch(`/notifications/${n._id}/read`).then(load).catch(() => {});
    setOpen(false);
    if (n.issue) navigate(`/issues/${n.issue._id}`);
  };

  const readAll = async () => {
    await api.patch('/notifications/read-all');
    load();
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <Bell />
        <AnimatePresence>
          {data.unread > 0 && (
            <motion.span className="badge" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              {data.unread > 9 ? '9+' : data.unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="popover" initial={{ opacity: 0, y: -10, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.9 }} transition={{ type: 'spring', stiffness: 420, damping: 26 }}>
            <div className="popover-head">
              <strong>Notifications</strong>
              {data.unread > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={readAll}><CheckCheck /> Mark all read</button>
              )}
            </div>
            <div className="notif-list">
              {data.notifications.length === 0 && <p className="dim" style={{ padding: 20, margin: 0, textAlign: 'center' }}>All caught up — nothing new</p>}
              {data.notifications.map((n) => (
                <div key={n._id} className={`notif ${n.read ? '' : 'unread'}`} onClick={() => openItem(n)}>
                  <Avatar user={n.actor} size="sm" />
                  <div>
                    <p>{n.message}</p>
                    <time>{formatDistanceToNowStrict(new Date(n.createdAt), { addSuffix: true })}</time>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useOutside(ref, close);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button onClick={() => setOpen((o) => !o)} style={{ background: 'none', border: 0, padding: 0 }} aria-label="Account">
        <Avatar user={user} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="popover" style={{ width: 270 }} initial={{ opacity: 0, y: -10, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.9 }} transition={{ type: 'spring', stiffness: 420, damping: 26 }}>
            <div style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center', borderBottom: '2px dashed var(--line)' }}>
              <Avatar user={user} size="lg" />
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block' }}>{user.name}</strong>
                <span className="dim" style={{ fontSize: 12.5, wordBreak: 'break-all' }}>{user.email}</span>
                <div style={{ marginTop: 6 }}><span className={`role-tag ${user.role}`}>{user.role}</span></div>
              </div>
            </div>
            {user.role === 'admin' && (
              <button className="menu-item" onClick={() => { close(); navigate('/team'); }}><Users /> Team &amp; roles</button>
            )}
            <button className="menu-item" onClick={() => { logout(); navigate('/'); }}><LogOut /> Sign out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const outlet = useOutlet(); // captured per-render so the exiting page keeps its own content
  const { user } = useAuth();
  const [menu, setMenu] = useState(false);
  const [newIssue, setNewIssue] = useState(false);

  useEffect(() => setMenu(false), [location.pathname]);
  useEffect(() => {
    const open = () => setNewIssue(true);
    window.addEventListener('bugboard:new-issue', open);
    return () => window.removeEventListener('bugboard:new-issue', open);
  }, []);

  const links = user.role === 'admin' ? [...LINKS, { to: '/team', label: 'Team' }] : LINKS;

  return (
    <div className="shell">
      <Blobs />
      <header className="topbar">
        <Link to="/dashboard"><Logo /></Link>
        <nav className="nav-links">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className="nav-link">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                  <span>{l.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-right">
          <button className="btn btn-primary hide-sm" onClick={() => setNewIssue(true)}><Plus /> New bug</button>
          <button className="icon-btn primary show-sm" onClick={() => setNewIssue(true)} aria-label="New bug"><Plus /></button>
          <Notifications />
          <span className="hide-sm"><UserMenu /></span>
          <button className="icon-btn burger" onClick={() => setMenu(true)} aria-label="Menu"><Menu /></button>
        </div>
      </header>

      <AnimatePresence>
        {menu && (
          <motion.div className="mobile-menu" initial={{ clipPath: 'circle(0% at 92% 6%)' }} animate={{ clipPath: 'circle(150% at 92% 6%)' }} exit={{ clipPath: 'circle(0% at 92% 6%)' }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
            <div className="menu-mascot"><Mascot size={150} /></div>
            <button className="icon-btn" style={{ position: 'absolute', top: 22, right: 22 }} onClick={() => setMenu(false)} aria-label="Close menu"><X /></button>
            <motion.nav initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}>
              {links.map((l, i) => (
                <motion.div key={l.to} variants={{ hidden: { opacity: 0, x: -40, rotate: -4 }, show: { opacity: 1, x: 0, rotate: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } } }}>
                  <NavLink to={l.to} className={({ isActive }) => `big ${isActive ? 'active' : ''}`}>
                    <small>0{i + 1}</small>
                    {l.label}
                  </NavLink>
                </motion.div>
              ))}
            </motion.nav>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar user={user} size="lg" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{user.name}</strong>
                <div><span className={`role-tag ${user.role}`}>{user.role}</span></div>
              </div>
              <UserMenuLogout />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          className="page"
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.99 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        >
          {outlet}
        </motion.main>
      </AnimatePresence>

      <NewIssueModal open={newIssue} onClose={() => setNewIssue(false)} />
    </div>
  );
}

function UserMenuLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <button className="btn btn-sm" onClick={() => { logout(); navigate('/'); }}><LogOut /> Sign out</button>
  );
}
