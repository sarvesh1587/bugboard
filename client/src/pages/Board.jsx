import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Columns3, Inbox, Lock, Plus, Rows3, Search } from 'lucide-react';
import api, { errMsg } from '../api/client';
import useAsync from '../hooks/useAsync';
import useDebounce from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';
import { Avatar, ErrorState, Priority, Severity } from '../components/ui';
import { STATUSES, canMove } from '../lib/meta';
import useFilterOptions from '../hooks/useFilterOptions';

// Drop into the column under the pointer; fall back to overlap for keyboard drags
const collisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

function Card({ issue, overlay, dragging }) {
  return (
    <div className={`kcard ${overlay ? 'overlay' : ''} ${dragging ? 'ghost' : ''} sev-${issue.severity}`}>
      <div className="kcard-top">
        <span className="key">{issue.key}</span>
        <Severity value={issue.severity} />
      </div>
      <p className="kcard-title">{issue.title}</p>
      <div className="kcard-foot">
        <Priority value={issue.priority} />
        <Avatar user={issue.assignee} size="sm" />
      </div>
    </div>
  );
}

function DraggableCard({ issue, disabled }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: issue._id, data: { issue }, disabled });
  return (
    <motion.div
      layout
      layoutId={issue._id}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => navigate(`/issues/${issue._id}`)}
      className="kcard-wrap"
      style={{ touchAction: disabled ? 'auto' : 'manipulation' }}
    >
      <Card issue={issue} dragging={isDragging} />
      {disabled && <Lock className="kcard-lock" size={12} />}
    </motion.div>
  );
}

function Column({ status, issues, dragState, isLocked }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  const allowed = dragState?.allowed.includes(status.id);
  const isSource = dragState?.from === status.id;
  const cls = dragState ? (allowed ? 'can-drop' : isSource ? '' : 'no-drop') : '';

  return (
    <section ref={setNodeRef} className={`kcol kc-${status.id} ${cls} ${isOver && allowed ? 'over' : ''}`}>
      <header className="kcol-head">
        <span className={`status s-${status.id}`}><i />{status.label}</span>
        <span className="count">{issues.length}</span>
      </header>
      <div className="kcol-body">
        <AnimatePresence>
          {issues.map((i) => <DraggableCard key={i._id} issue={i} disabled={isLocked(i)} />)}
        </AnimatePresence>
        {issues.length === 0 && <div className="kcol-empty">{dragState && allowed ? 'Drop it here!' : 'Nothing here'}</div>}
      </div>
    </section>
  );
}

export default function Board() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { projects } = useFilterOptions();
  const [search, setSearch] = useState('');
  const [mine, setMine] = useState(false);
  const [active, setActive] = useState(null);
  const q = useDebounce(search, 300);
  const project = params.get('project') || '';

  const { data, error, reload, setData } = useAsync(
    () =>
      api
        .get('/issues', { params: { limit: 200, sort: '-priority', ...(project && { project }), ...(q && { q }), ...(mine && { assignee: 'me' }) } })
        .then((r) => r.data.issues),
    [project, q, mine]
  );

  useEffect(() => {
    window.addEventListener('bugboard:issues-changed', reload);
    return () => window.removeEventListener('bugboard:issues-changed', reload);
  }, [reload]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const columns = useMemo(() => {
    const by = Object.fromEntries(STATUSES.map((s) => [s.id, []]));
    (data || []).forEach((i) => by[i.status]?.push(i));
    return by;
  }, [data]);

  // While dragging, compute which columns this user may drop into (mirrors server rules)
  const dragState = active && {
    from: active.status,
    allowed: STATUSES.map((s) => s.id).filter((to) => canMove(user, active, to)),
  };

  // Cards the user can't move anywhere are not draggable (still clickable)
  const isLocked = (issue) => !STATUSES.some((s) => canMove(user, issue, s.id));

  const onDragEnd = async ({ active: a, over }) => {
    setActive(null);
    if (!over) return;
    const issue = a.data.current.issue;
    const to = over.id;
    if (to === issue.status) return;

    const prev = data;
    // Optimistic move — rolled back if the server rejects it
    setData((list) => list.map((i) => (i._id === issue._id ? { ...i, status: to } : i)));
    try {
      const { data: res } = await api.patch(`/issues/${issue._id}/status`, { status: to });
      setData((list) => list.map((i) => (i._id === issue._id ? { ...i, ...res.issue } : i)));
      toast.success(`${issue.key} → ${STATUSES.find((s) => s.id === to).label}`);
    } catch (err) {
      setData(prev);
      toast.error(errMsg(err));
    }
  };

  return (
    <div className="board-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Drag cards between columns</span>
          <h1 className="display page-title" style={{ marginTop: 14 }}>The <span className="pop">board</span></h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="view-toggle">
            <Link to={`/issues${project ? `?project=${project}` : ''}`}><Rows3 size={16} /> Table</Link>
            <span className="active"><Columns3 size={16} /> Board</span>
          </div>
          <button className="btn btn-primary" onClick={() => window.dispatchEvent(new Event('bugboard:new-issue'))}><Plus /> <span className="hide-sm">New bug</span></button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <Search size={17} />
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter cards…" aria-label="Filter cards" />
        </div>
        <select className="select" value={project} onChange={(e) => setParams(e.target.value ? { project: e.target.value } : {}, { replace: true })} aria-label="Project">
          <option value="">All projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.key} — {p.name}</option>)}
        </select>
        {user.role !== 'tester' && (
          <button className={`chip ${mine ? 'active' : ''}`} style={{ height: 44 }} onClick={() => setMine((m) => !m)}><Inbox /> Only mine</button>
        )}
      </div>

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={({ active: a }) => setActive(a.data.current.issue)}
          onDragCancel={() => setActive(null)}
          onDragEnd={onDragEnd}
        >
          <div className="kanban">
            {STATUSES.map((s, i) =>
              data ? (
                <Column key={s.id} status={s} issues={columns[s.id]} dragState={dragState} isLocked={isLocked} />
              ) : (
                <section key={s.id} className={`kcol kc-${s.id}`}>
                  <header className="kcol-head"><span className={`status s-${s.id}`}><i />{s.label}</span></header>
                  <div className="kcol-body">
                    {Array.from({ length: 3 - (i % 2) }).map((_, k) => <div key={k} className="skeleton" style={{ height: 112 }} />)}
                  </div>
                </section>
              )
            )}
          </div>
          <DragOverlay dropAnimation={{ duration: 320, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            {active ? <Card issue={active} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}
      <p className="board-hint">Columns you can&apos;t move a card into fade out while dragging — and the server double-checks every move.</p>
    </div>
  );
}
