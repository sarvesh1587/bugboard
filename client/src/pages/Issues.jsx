import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNowStrict } from 'date-fns';
import { ChevronLeft, ChevronRight, Columns3, Flame, Inbox, PenLine, Plus, Rows3, Search, SlidersHorizontal, UserX, X, Zap } from 'lucide-react';
import api from '../api/client';
import useAsync from '../hooks/useAsync';
import useDebounce from '../hooks/useDebounce';
import useFilterOptions from '../hooks/useFilterOptions';
import { useAuth } from '../context/AuthContext';
import { EmptyState, ErrorState, Person, Priority, Severity, SkeletonRows, StatusBadge } from '../components/ui';
import { PRIORITIES, SEVERITIES, STATUSES, cap } from '../lib/meta';

const QUICK = [
  { id: 'mine', label: 'Assigned to me', icon: Inbox, q: { assignee: 'me' } },
  { id: 'reported', label: 'Reported by me', icon: PenLine, q: { reporter: 'me' } },
  { id: 'critical', label: 'Critical', icon: Flame, q: { severity: 'critical' } },
  { id: 'urgent', label: 'Urgent', icon: Zap, q: { priority: 'urgent' } },
  { id: 'unassigned', label: 'Unassigned', icon: UserX, q: { assignee: 'none' } },
];

const SORTS = [
  ['-updatedAt', 'Recently updated'],
  ['-createdAt', 'Newest first'],
  ['createdAt', 'Oldest first'],
  ['-priority', 'Priority: high → low'],
  ['-severity', 'Severity: high → low'],
  ['number', 'Key ↑'],
];

const FILTER_KEYS = ['project', 'status', 'priority', 'severity', 'assignee', 'reporter', 'q'];

export default function Issues() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { projects, people } = useFilterOptions();
  const [search, setSearch] = useState(params.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);
  const debounced = useDebounce(search, 350);

  const page = Number(params.get('page')) || 1;
  const sort = params.get('sort') || '-updatedAt';
  const statusSel = (params.get('status') || '').split(',').filter(Boolean);

  const update = (patch, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === '' || v == null ? next.delete(k) : next.set(k, v)));
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  // keep the search box in sync with the URL (debounced)
  useEffect(() => {
    if ((params.get('q') || '') !== debounced) update({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const query = params.toString();
  const { data, loading, error, reload } = useAsync(
    () => api.get('/issues', { params: { limit: 15, ...Object.fromEntries(new URLSearchParams(query)) } }).then((r) => r.data),
    [query]
  );

  useEffect(() => {
    window.addEventListener('bugboard:issues-changed', reload);
    return () => window.removeEventListener('bugboard:issues-changed', reload);
  }, [reload]);

  const toggleStatus = (id) => {
    const next = statusSel.includes(id) ? statusSel.filter((s) => s !== id) : [...statusSel, id];
    update({ status: next.join(',') });
  };

  const activeQuick = (q) => Object.entries(q).every(([k, v]) => params.get(k) === v);
  const toggleQuick = (q) => update(Object.fromEntries(Object.entries(q).map(([k, v]) => [k, activeQuick(q) ? '' : v])));

  const activeCount = FILTER_KEYS.filter((k) => params.get(k)).length;
  const clearAll = () => {
    setSearch('');
    setParams(new URLSearchParams(sort !== '-updatedAt' ? { sort } : {}), { replace: true });
  };

  const pg = data?.pagination;

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">{pg ? `${pg.total} issue${pg.total === 1 ? '' : 's'}` : 'Loading'}</span>
          <h1 className="display page-title" style={{ marginTop: 14 }}>All <span className="pop">issues</span></h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="view-toggle">
            <span className="active"><Rows3 size={16} /> Table</span>
            <Link to={`/board${params.get('project') ? `?project=${params.get('project')}` : ''}`}><Columns3 size={16} /> Board</Link>
          </div>
          <button className="btn btn-primary" onClick={() => window.dispatchEvent(new Event('bugboard:new-issue'))}><Plus /> <span className="hide-sm">New bug</span></button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search">
          <Search size={17} />
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or key (e.g. PAY-12)…" aria-label="Search issues" />
          {search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={15} /></button>}
        </div>
        <select className="select" value={params.get('project') || ''} onChange={(e) => update({ project: e.target.value })} aria-label="Project">
          <option value="">All projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.key} — {p.name}</option>)}
        </select>
        <select className="select" value={sort} onChange={(e) => update({ sort: e.target.value === '-updatedAt' ? '' : e.target.value })} aria-label="Sort">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className={`btn ${showFilters || activeCount > 1 ? 'btn-primary' : ''}`} onClick={() => setShowFilters((s) => !s)}>
          <SlidersHorizontal /> Filters {activeCount > 0 && <span className="count-pill">{activeCount}</span>}
        </button>
      </div>

      <div className="quick">
        {QUICK.filter((qf) => !(qf.id === 'mine' && user.role === 'tester')).map((qf) => (
          <button key={qf.id} className={`chip ${activeQuick(qf.q) ? 'active' : ''}`} onClick={() => toggleQuick(qf.q)}>
            <qf.icon /> {qf.label}
          </button>
        ))}
        <span className="quick-sep" />
        {STATUSES.map((s) => (
          <button key={s.id} className={`chip ${statusSel.includes(s.id) ? 'active' : ''}`} onClick={() => toggleStatus(s.id)}>{s.label}</button>
        ))}
        {activeCount > 0 && <button className="chip" onClick={clearAll} style={{ borderStyle: 'dashed' }}><X /> Clear</button>}
      </div>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div className="filters" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            <div className="filters-inner">
              <label className="field"><span className="label">Severity</span>
                <select className="select" value={params.get('severity') || ''} onChange={(e) => update({ severity: e.target.value })}>
                  <option value="">Any</option>
                  {SEVERITIES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
                </select>
              </label>
              <label className="field"><span className="label">Priority</span>
                <select className="select" value={params.get('priority') || ''} onChange={(e) => update({ priority: e.target.value })}>
                  <option value="">Any</option>
                  {PRIORITIES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
                </select>
              </label>
              <label className="field"><span className="label">Assignee</span>
                <select className="select" value={params.get('assignee') || ''} onChange={(e) => update({ assignee: e.target.value })}>
                  <option value="">Anyone</option>
                  <option value="me">Me</option>
                  <option value="none">Unassigned</option>
                  {people.filter((p) => p.role !== 'tester').map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </label>
              <label className="field"><span className="label">Reporter</span>
                <select className="select" value={params.get('reporter') || ''} onChange={(e) => update({ reporter: e.target.value })}>
                  <option value="">Anyone</option>
                  <option value="me">Me</option>
                  {people.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="table-wrap">
        {error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data ? (
          <div style={{ padding: 16 }}><SkeletonRows rows={8} /></div>
        ) : data.issues.length === 0 ? (
          <EmptyState
            title={activeCount ? 'No matches' : 'No issues yet'}
            text={activeCount ? 'Try removing a filter or two.' : 'Report the first bug and it will show up here.'}
            action={activeCount ? <button className="btn btn-sm" onClick={clearAll}>Clear filters</button> : null}
          />
        ) : (
          <table className={`issues-table ${loading ? 'is-loading' : ''}`}>
            <thead>
              <tr>
                <th style={{ width: 92 }}>Key</th>
                <th>Title</th>
                <th>Status</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th style={{ textAlign: 'right' }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.issues.map((i, idx) => (
                <motion.tr
                  key={i._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.025, duration: 0.4 }}
                  onClick={() => navigate(`/issues/${i._id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/issues/${i._id}`)}
                >
                  <td data-cell="key"><span className="key">{i.key}</span></td>
                  <td data-cell="title">
                    <span className="row-title">{i.title}</span>
                    <span className="row-sub">{i.project?.name} · by {i.reporter?.name}</span>
                  </td>
                  <td data-cell="status"><StatusBadge status={i.status} /></td>
                  <td data-cell="severity"><Severity value={i.severity} /></td>
                  <td data-cell="priority"><Priority value={i.priority} /></td>
                  <td data-cell="assignee"><Person user={i.assignee} /></td>
                  <td data-cell="updated" className="mono dim" style={{ textAlign: 'right', fontSize: 12 }} title={new Date(i.updatedAt).toLocaleString()}>
                    {formatDistanceToNowStrict(new Date(i.updatedAt), { addSuffix: true })}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pg && pg.pages > 1 && (
        <div className="pager">
          <span className="mono dim">Page {pg.page} / {pg.pages} · {pg.total} total</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-icon" disabled={page <= 1} onClick={() => update({ page: page - 1 }, false)} aria-label="Previous page"><ChevronLeft /></button>
            {Array.from({ length: pg.pages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === pg.pages || Math.abs(n - page) <= 1)
              .map((n, i, arr) => (
                <span key={n} style={{ display: 'contents' }}>
                  {i > 0 && n - arr[i - 1] > 1 && <span className="dim" style={{ alignSelf: 'center' }}>…</span>}
                  <button className={`btn btn-sm btn-icon ${n === page ? 'btn-primary' : ''}`} onClick={() => update({ page: n }, false)}>{n}</button>
                </span>
              ))}
            <button className="btn btn-sm btn-icon" disabled={page >= pg.pages} onClick={() => update({ page: page + 1 }, false)} aria-label="Next page"><ChevronRight /></button>
          </div>
        </div>
      )}
    </div>
  );
}
