import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ArrowUpRight, Plus } from 'lucide-react';
import api from '../api/client';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { Avatar, CountUp, EmptyState, ErrorState, Priority, RevealText, Severity, SkeletonRows, StatusBadge, rise, stagger } from '../components/ui';
import { SEVERITIES, STATUSES } from '../lib/meta';
import { describeActivity } from '../lib/activity';
import Mascot from '../components/Mascot';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const STATUS_COLORS = { open: '#6fb8ff', in_progress: '#ffc94a', testing: '#ff8a5b', resolved: '#5cc98f', closed: '#cbbfb3' };

function TrendChart({ data }) {
  const W = 560;
  const H = 180;
  const P = 6;
  const max = Math.max(2, ...data.flatMap((d) => [d.created, d.resolved]));
  const x = (i) => P + (i * (W - P * 2)) / (data.length - 1);
  const y = (v) => H - P - (v / max) * (H - P * 2 - 14);

  const line = (key) =>
    data
      .map((d, i) => {
        if (i === 0) return `M${x(i)},${y(d[key])}`;
        const cx = (x(i - 1) + x(i)) / 2;
        return `C${cx},${y(data[i - 1][key])} ${cx},${y(d[key])} ${x(i)},${y(d[key])}`;
      })
      .join(' ');
  const created = line('created');
  const resolved = line('resolved');

  return (
    <>
    <svg viewBox={`0 0 ${W} ${H}`} className="trend" preserveAspectRatio="none" role="img" aria-label="Issues created vs resolved over 14 days">
      <defs>
        <linearGradient id="g-created" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f25c3d" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#f25c3d" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--line)" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
      ))}
      <motion.path d={`${created} L${x(data.length - 1)},${H} L${x(0)},${H} Z`} fill="url(#g-created)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 1 }} />
      <motion.path d={created} fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: 'easeInOut' }} />
      <motion.path d={resolved} fill="none" stroke="var(--ok)" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 8" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.8 }} transition={{ duration: 1.6, delay: 0.3, ease: 'easeInOut' }} />
    </svg>
    <div className="trend-axis mono">
      {data.filter((_, i) => i % 3 === 0 || i === data.length - 1).map((d) => <span key={d.date}>{format(new Date(d.date), 'd MMM')}</span>)}
    </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState('');
  const projects = useAsync(() => api.get('/projects').then((r) => r.data.projects), []);
  const dash = useAsync(() => api.get('/dashboard', { params: project ? { project } : {} }).then((r) => r.data), [project]);

  const { reload } = dash;
  useEffect(() => {
    window.addEventListener('bugboard:issues-changed', reload);
    return () => window.removeEventListener('bugboard:issues-changed', reload);
  }, [reload]);

  const d = dash.data;
  const firstName = user.name.split(' ')[0];
  const go = (query) => navigate(`/issues?${new URLSearchParams({ ...(project ? { project } : {}), ...query })}`);

  const stats = d && [
    { label: 'Total issues', value: d.stats.total, q: {}, cls: 'st-total' },
    { label: 'Open', value: d.stats.open, q: { status: 'open' }, cls: 'st-open' },
    { label: 'In progress', value: d.stats.inProgress, q: { status: 'in_progress' }, cls: 'st-progress' },
    { label: 'Critical', value: d.stats.critical, q: { severity: 'critical', status: 'open,in_progress,testing' }, danger: true, cls: 'st-critical' },
    { label: 'Resolved', value: d.stats.resolved, q: { status: 'resolved' }, cls: 'st-resolved' },
  ];

  const pipelineTotal = d ? Math.max(1, d.stats.total) : 1;
  const sevMax = useMemo(() => (d ? Math.max(1, ...SEVERITIES.map((s) => d.bySeverity[s] || 0)) : 1), [d]);

  return (
    <div>
      <div className="page-head">
        <div className="hello-row">
          <Mascot size={130} accessory={user.role === 'admin' ? 'crown' : user.role === 'developer' ? 'glasses' : 'magnifier'} color={user.role === 'admin' ? '#F25C3D' : user.role === 'developer' ? '#6FB8FF' : '#5CC98F'} />
          <div>
            <span className="eyebrow">{format(new Date(), 'EEEE, d MMMM')} · <span className={`role-tag ${user.role}`} style={{ marginLeft: 2 }}>{user.role}</span></span>
            <h1 className="display page-title">
              <RevealText text={`${greeting()},`} />{' '}
              <motion.span className="pop" initial={{ opacity: 0, scale: 0.4, rotate: -8 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.35 }}>{firstName}!</motion.span>
            </h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="select" value={project} onChange={(e) => setProject(e.target.value)} style={{ width: 'auto', minWidth: 200 }} aria-label="Filter by project">
            <option value="">All my projects</option>
            {projects.data?.map((p) => <option key={p._id} value={p._id}>{p.key} — {p.name}</option>)}
          </select>
        </div>
      </div>

      {dash.error && !d ? (
        <ErrorState message={dash.error} onRetry={dash.reload} />
      ) : (
        <>
          {/* Stats — oversized editorial numbers */}
          <motion.section className="stats" variants={stagger} initial="hidden" animate={d ? 'show' : 'hidden'}>
            {(stats || Array.from({ length: 5 }, (_, i) => ({ label: '…', value: 0, key: i }))).map((s) => (
              <motion.button key={s.label + (s.key ?? '')} variants={rise} className={`stat ${s.cls || ''}`} onClick={() => s.q && go(s.q)} disabled={!d}>
                <span className="stat-label mono">{s.label}{s.danger && <i className="live-dot" />}</span>
                <span className="stat-value display">{d ? <CountUp value={s.value} /> : '–'}</span>
                <ArrowUpRight className="stat-arrow" />
              </motion.button>
            ))}
          </motion.section>

          {/* Pipeline bar */}
          {d && (
            <section className="pipeline">
              <div className="pipeline-bar">
                {STATUSES.map((s, i) => {
                  const n = d.stats[s.id === 'in_progress' ? 'inProgress' : s.id] || 0;
                  return (
                    <motion.button
                      key={s.id}
                      title={`${s.label}: ${n}`}
                      style={{ background: STATUS_COLORS[s.id] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(n / pipelineTotal) * 100}%` }}
                      transition={{ duration: 1.1, delay: 0.2 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => go({ status: s.id })}
                    />
                  );
                })}
              </div>
              <div className="pipeline-legend">
                {STATUSES.map((s) => (
                  <span key={s.id}><i style={{ background: STATUS_COLORS[s.id] }} />{s.label} <b className="mono">{d.stats[s.id === 'in_progress' ? 'inProgress' : s.id] || 0}</b></span>
                ))}
              </div>
            </section>
          )}

          <div className="dash-grid">
            {/* Assigned to me */}
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>On your plate</h3>
                  <span className="dim" style={{ fontSize: 13 }}>{d ? `${d.stats.assignedToMe} active issue${d.stats.assignedToMe === 1 ? '' : 's'} assigned to you` : 'Loading…'}</span>
                </div>
                <button className="btn btn-sm" onClick={() => go({ assignee: 'me', status: 'open,in_progress,testing' })}>View all <ArrowUpRight /></button>
              </div>
              <div className="panel-body" style={{ padding: 10 }}>
                {!d ? (
                  <div style={{ padding: 12 }}><SkeletonRows rows={4} height={60} /></div>
                ) : d.myIssues.length === 0 ? (
                  <EmptyState
                    title="Inbox zero"
                    text={user.role === 'developer' ? 'Nothing assigned to you. Grab an unassigned bug from the board.' : 'No issues are assigned to you right now.'}
                    action={<button className="btn btn-sm" onClick={() => window.dispatchEvent(new Event('bugboard:new-issue'))}><Plus /> Report a bug</button>}
                  />
                ) : (
                  <motion.ul className="mine" variants={stagger} initial="hidden" animate="show">
                    {d.myIssues.map((i) => (
                      <motion.li key={i._id} variants={rise}>
                        <Link to={`/issues/${i._id}`}>
                          <span className="key">{i.key}</span>
                          <span className="mine-title">{i.title}</span>
                          <span className="mine-meta">
                            <Priority value={i.priority} />
                            <StatusBadge status={i.status} />
                          </span>
                        </Link>
                      </motion.li>
                    ))}
                  </motion.ul>
                )}
              </div>
            </section>

            {/* Trend + severity */}
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Last 14 days</h3>
                  <span className="dim" style={{ fontSize: 13 }}>
                    <span className="legend-dot accent-bg" /> Reported &nbsp; <span className="legend-dot dashed" /> Resolved
                  </span>
                </div>
              </div>
              <div className="panel-body">
                {d ? <TrendChart data={d.trend} /> : <div className="skeleton" style={{ height: 180 }} />}
                <div className="label" style={{ margin: '22px 0 12px' }}>Open by severity</div>
                <div className="sev-bars">
                  {SEVERITIES.slice().reverse().map((s, i) => (
                    <button key={s} className="sev-row" onClick={() => go({ severity: s, status: 'open,in_progress,testing' })}>
                      <Severity value={s} />
                      <span className="sev-track">
                        <motion.span
                          className={s === 'critical' ? 'crit' : ''}
                          initial={{ width: 0 }}
                          animate={{ width: d ? `${((d.bySeverity[s] || 0) / sevMax) * 100}%` : 0 }}
                          transition={{ duration: 1, delay: 0.4 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </span>
                      <b className="mono">{d ? d.bySeverity[s] || 0 : '-'}</b>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Recent activity */}
          <section className="panel" style={{ marginTop: 20 }}>
            <div className="panel-head"><h3>Recent activity</h3></div>
            <div className="panel-body">
              {!d ? (
                <SkeletonRows rows={5} height={36} />
              ) : d.recent.length === 0 ? (
                <EmptyState title="Quiet in here" text="Activity from your projects will appear here." />
              ) : (
                <motion.ol className="feed" variants={stagger} initial="hidden" animate="show">
                  {d.recent.map((a) => (
                    <motion.li key={a._id} variants={rise}>
                      <Avatar user={a.actor} size="sm" />
                      <p>
                        <b>{a.actor?.name}</b> {describeActivity(a)} on{' '}
                        <Link to={`/issues/${a.issue._id}`} className="feed-link"><span className="key">{a.issue.key}</span> {a.issue.title}</Link>
                      </p>
                      <time className="mono">{formatDistanceToNowStrict(new Date(a.createdAt))}</time>
                    </motion.li>
                  ))}
                </motion.ol>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
