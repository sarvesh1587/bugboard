import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ArrowLeft, ArrowRight, Check, FileText, Paperclip, Pencil, Send, Trash2, Undo2, UploadCloud, X } from 'lucide-react';
import api, { errMsg } from '../api/client';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { Avatar, ErrorState, Modal, Person, Segmented, SkeletonRows, Spinner, StatusBadge, Severity, Priority } from '../components/ui';
import { PRIORITIES, SEVERITIES, STATUSES } from '../lib/meta';
import { describeActivity } from '../lib/activity';

const ORDER = STATUSES.map((s) => s.id);
const fmt = (d) => format(new Date(d), "d MMM yyyy, HH:mm");
const ago = (d) => formatDistanceToNowStrict(new Date(d), { addSuffix: true });
const kb = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

/* ------------------------------------------------------------------ */
function Stepper({ status }) {
  const idx = ORDER.indexOf(status);
  return (
    <div className="stepper">
      <div className="stepper-track">
        <motion.div className="stepper-fill" initial={false} animate={{ width: `${(idx / (ORDER.length - 1)) * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      {STATUSES.map((s, i) => (
        <div key={s.id} className={`step ${i < idx ? 'done' : ''} ${i === idx ? 'current' : ''}`}>
          <motion.span className="step-dot" animate={{ scale: i === idx ? 1.15 : 1 }}>
            {i < idx ? <Check size={12} strokeWidth={3} /> : String(i + 1)}
          </motion.span>
          <span className="step-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
function Comments({ issueId, onPosted }) {
  const { user } = useAuth();
  const { data, error, loading, reload, setData } = useAsync(() => api.get(`/issues/${issueId}/comments`).then((r) => r.data.comments), [issueId]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const send = async (e) => {
    e?.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const { data: res } = await api.post(`/issues/${issueId}/comments`, { body });
      setData((list) => [...(list || []), res.comment]);
      setBody('');
      onPosted?.();
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSending(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/comments/${id}`);
      setData((list) => list.filter((c) => c._id !== id));
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div>
      {loading && !data ? (
        <SkeletonRows rows={3} height={70} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <p className="dim" style={{ margin: '4px 0 18px' }}>No comments yet — start the conversation.</p>
      ) : (
        <ul className="comments">
          <AnimatePresence initial={false}>
            {data.map((c) => (
              <motion.li key={c._id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Avatar user={c.author} />
                <div className="comment-body">
                  <div className="comment-head">
                    <strong>{c.author?.name || 'Deleted user'}</strong>
                    {c.author && <span className={`role-tag ${c.author.role}`}>{c.author.role}</span>}
                    <time className="mono muted" title={fmt(c.createdAt)}>{ago(c.createdAt)}</time>
                    {(c.author?._id === user._id || user.role === 'admin') && (
                      <button className="comment-del" onClick={() => remove(c._id)} aria-label="Delete comment"><Trash2 size={14} /></button>
                    )}
                  </div>
                  <p>{c.body}</p>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      <div ref={endRef} />
      <form className="composer" onSubmit={send}>
        <Avatar user={user} />
        <div style={{ flex: 1 }}>
          <textarea
            className="textarea"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…  (Ctrl + Enter to send)"
            onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && send()}
            maxLength={5000}
            style={{ minHeight: 84 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button className="btn btn-primary btn-sm" disabled={sending || !body.trim()}>{sending ? <Spinner /> : <Send />} Comment</button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Timeline({ issueId, version }) {
  const { data, error, reload } = useAsync(() => api.get(`/issues/${issueId}/activity`).then((r) => r.data.activity), [issueId, version]);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <SkeletonRows rows={4} height={40} />;
  return (
    <ol className="timeline">
      {data.map((a, i) => (
        <motion.li key={a._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className={`t-${a.type}`}>
          <span className="t-dot" />
          <div>
            <p><b>{a.actor?.name || 'Someone'}</b> {describeActivity(a)}</p>
            <time className="mono muted" title={fmt(a.createdAt)}>{ago(a.createdAt)}</time>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
export default function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, error, reload, setData } = useAsync(() => api.get(`/issues/${id}`).then((r) => r.data), [id]);
  const [members, setMembers] = useState([]);
  const [busy, setBusy] = useState(null);
  const [tab, setTab] = useState('comments');
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState(null); // 'title' | 'description'
  const [draft, setDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const issue = data?.issue;
  const perms = data?.permissions;
  const projectId = issue?.project?._id;

  useEffect(() => {
    if (!projectId) return;
    api.get(`/projects/${projectId}`).then(({ data: d }) => setMembers(d.project.members)).catch(() => {});
  }, [projectId]);

  /** Every mutation returns { issue, permissions } → one place to apply it */
  const mutate = useCallback(
    async (key, request, successMsg) => {
      setBusy(key);
      try {
        const { data: res } = await request();
        setData(res);
        setVersion((v) => v + 1);
        window.dispatchEvent(new Event('bugboard:issues-changed'));
        if (successMsg) toast.success(successMsg);
        return true;
      } catch (err) {
        toast.error(errMsg(err));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [setData]
  );

  if (error && !data) {
    return (
      <div>
        <Link to="/issues" className="back"><ArrowLeft size={16} /> All issues</Link>
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }
  if (!issue) {
    return (
      <div className="detail">
        <div><div className="skeleton" style={{ height: 30, width: 140 }} /><div className="skeleton" style={{ height: 90, marginTop: 18 }} /><div className="skeleton" style={{ height: 260, marginTop: 24 }} /></div>
        <div className="skeleton" style={{ height: 420 }} />
      </div>
    );
  }

  const changeStatus = (to, label) => mutate(`status-${to}`, () => api.patch(`/issues/${id}/status`, { status: to }), `${issue.key}: ${label}`);
  const assign = (assignee) => mutate('assign', () => api.patch(`/issues/${id}/assign`, { assignee }), assignee ? 'Assignee updated' : 'Unassigned');
  const updateField = (field, value) => mutate(field, () => api.patch(`/issues/${id}`, { [field]: value }));

  const saveEdit = async () => {
    const ok = draft.trim() === issue[editing] || (await updateField(editing, draft.trim()));
    if (ok) setEditing(null);
  };

  const upload = async (files) => {
    if (!files?.length) return;
    const fd = new FormData();
    [...files].slice(0, 5).forEach((f) => fd.append('files', f));
    await mutate('upload', () => api.post(`/issues/${id}/attachments`, fd), `${files.length} file${files.length > 1 ? 's' : ''} attached`);
  };

  const removeIssue = async () => {
    setBusy('delete');
    try {
      await api.delete(`/issues/${id}`);
      toast.success(`${issue.key} deleted`);
      window.dispatchEvent(new Event('bugboard:issues-changed'));
      navigate('/issues');
    } catch (err) {
      toast.error(errMsg(err));
      setBusy(null);
    }
  };

  const assignable = members.filter((m) => ['developer', 'admin'].includes(m.role));
  const mineIsAssignee = issue.assignee?._id === user._id;
  const forward = (to) => ORDER.indexOf(to) > ORDER.indexOf(issue.status);

  return (
    <div>
      <Link to="/issues" className="back"><ArrowLeft size={16} /> All issues</Link>

      <div className="detail">
        <div className="detail-main">
          <div className="detail-top">
            <span className="key" style={{ fontSize: 14 }}>{issue.project?.name} / <span className="accent">{issue.key}</span></span>
            <StatusBadge status={issue.status} />
          </div>

          {editing === 'title' ? (
            <div className="inline-edit">
              <input className="input title-input" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus maxLength={160} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }} />
              <button className="btn btn-primary btn-sm btn-icon" onClick={saveEdit} disabled={busy === 'title'} aria-label="Save"><Check /></button>
              <button className="btn btn-sm btn-icon" onClick={() => setEditing(null)} aria-label="Cancel"><X /></button>
            </div>
          ) : (
            <h1 className="display detail-title">
              {issue.title}
              {perms.canEdit && <button className="edit-btn" onClick={() => { setDraft(issue.title); setEditing('title'); }} aria-label="Edit title"><Pencil size={16} /></button>}
            </h1>
          )}

          <Stepper status={issue.status} />

          {perms.transitions.length > 0 ? (
            <div className="transitions">
              <span className="label">Move to</span>
              {perms.transitions.map((t) => (
                <button key={t.to} className={`btn ${forward(t.to) ? 'btn-primary' : ''}`} onClick={() => changeStatus(t.to, t.label)} disabled={!!busy}>
                  {busy === `status-${t.to}` ? <Spinner /> : forward(t.to) ? <ArrowRight /> : <Undo2 />} {t.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="transitions-none">
              {issue.status === 'closed' ? 'This issue is closed — only an admin can reopen it.' : `Nothing to move right now — as a ${user.role}, this step belongs to someone else.`}
            </p>
          )}

          <section className="block">
            <div className="block-head">
              <span className="label">Description</span>
              {perms.canEdit && editing !== 'description' && (
                <button className="btn btn-ghost btn-sm" onClick={() => { setDraft(issue.description); setEditing('description'); }}><Pencil /> Edit</button>
              )}
            </div>
            {editing === 'description' ? (
              <div>
                <textarea className="textarea" rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                  <button className="btn btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={busy === 'description' || draft.trim().length < 5}>{busy === 'description' ? <Spinner /> : <Check />} Save</button>
                </div>
              </div>
            ) : (
              <p className="description">{issue.description}</p>
            )}
          </section>

          <section
            className={`block dropzone ${dragOver ? 'over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files); }}
          >
            <div className="block-head">
              <span className="label"><Paperclip size={12} style={{ verticalAlign: -1 }} /> Attachments · {issue.attachments.length}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={busy === 'upload'}>
                {busy === 'upload' ? <Spinner /> : <UploadCloud />} Upload
              </button>
              <input ref={fileRef} type="file" multiple hidden accept="image/*,.pdf,.txt,.json,.zip" onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
            </div>
            {issue.attachments.length === 0 ? (
              <p className="dim" style={{ margin: 0, fontSize: 14 }}>Drop screenshots or logs here · PNG, JPG, GIF, PDF, TXT, JSON, ZIP · max 5 MB</p>
            ) : (
              <div className="attachments">
                {issue.attachments.map((a) => (
                  <div className="attachment" key={a._id}>
                    <a href={a.url} target="_blank" rel="noreferrer" className="att-preview">
                      {a.mimetype.startsWith('image/') ? <img src={a.url} alt={a.originalName} loading="lazy" /> : <FileText size={28} />}
                    </a>
                    <div className="att-meta">
                      <a href={a.url} target="_blank" rel="noreferrer" title={a.originalName}>{a.originalName}</a>
                      <span className="mono muted">{kb(a.size)}</span>
                    </div>
                    {(user.role === 'admin' || a.uploadedBy?._id === user._id) && (
                      <button className="att-del" onClick={() => mutate('att', () => api.delete(`/issues/${id}/attachments/${a._id}`), 'Attachment removed')} aria-label="Remove attachment"><X size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="block">
            <div className="tabs">
              {['comments', 'activity'].map((t) => (
                <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
                  {tab === t && <motion.span layoutId="tab-line" className="tab-line" />}
                  {t === 'comments' ? 'Comments' : 'Activity'}
                </button>
              ))}
            </div>
            <div style={{ paddingTop: 22 }}>
              {tab === 'comments' ? <Comments issueId={id} onPosted={() => setVersion((v) => v + 1)} /> : <Timeline issueId={id} version={version} />}
            </div>
          </section>
        </div>

        {/* ---------------- Sidebar ---------------- */}
        <aside className="detail-side">
          <div className="panel">
            <dl className="props">
              <dt>Assignee</dt>
              <dd>
                {perms.canAssign ? (
                  <select className="select" value={issue.assignee?._id || ''} onChange={(e) => assign(e.target.value || null)} disabled={busy === 'assign'}>
                    <option value="">Unassigned</option>
                    {assignable.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <Person user={issue.assignee} />
                    {perms.canSelfAssign && !issue.assignee && <button className="btn btn-sm btn-primary" onClick={() => assign(user._id)} disabled={busy === 'assign'}>Assign to me</button>}
                    {perms.canSelfAssign && mineIsAssignee && <button className="btn btn-sm" onClick={() => assign(null)} disabled={busy === 'assign'}>Release</button>}
                  </div>
                )}
              </dd>

              <dt>Severity</dt>
              <dd>{perms.canEdit ? <Segmented id="sev" options={SEVERITIES} value={issue.severity} onChange={(v) => updateField('severity', v)} /> : <Severity value={issue.severity} />}</dd>

              <dt>Priority</dt>
              <dd>{perms.canEdit ? <Segmented id="prio" options={PRIORITIES} value={issue.priority} onChange={(v) => updateField('priority', v)} /> : <Priority value={issue.priority} />}</dd>

              <dt>Reporter</dt>
              <dd><Person user={issue.reporter} /></dd>

              <dt>Project</dt>
              <dd><Link to={`/issues?project=${issue.project?._id}`} className="link">{issue.project?.key} — {issue.project?.name}</Link></dd>

              <dt>Created</dt>
              <dd className="mono" style={{ fontSize: 13 }}>{fmt(issue.createdAt)} <span className="muted">· {ago(issue.createdAt)}</span></dd>

              <dt>Updated</dt>
              <dd className="mono" style={{ fontSize: 13 }}>{fmt(issue.updatedAt)} <span className="muted">· {ago(issue.updatedAt)}</span></dd>
            </dl>
          </div>

          {perms.canDelete && (
            <button className="btn btn-danger" style={{ width: '100%', marginTop: 14 }} onClick={() => setConfirmDelete(true)}><Trash2 /> Delete issue</button>
          )}
        </aside>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        eyebrow="Danger zone"
        title={`Delete ${issue.key}?`}
        width={460}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={removeIssue} disabled={busy === 'delete'}>{busy === 'delete' ? <Spinner /> : <Trash2 />} Delete forever</button>
          </>
        }
      >
        <div className="modal-body"><p className="dim" style={{ margin: 0 }}>This removes the issue together with its comments, history and attachments. It can&apos;t be undone.</p></div>
      </Modal>
    </div>
  );
}
