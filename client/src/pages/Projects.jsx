import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowUpRight, Check, FolderPlus, Pencil, Search } from 'lucide-react';
import api, { errMsg, fieldErrors } from '../api/client';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { Avatar, CountUp, EmptyState, ErrorState, Field, Modal, SkeletonRows, Spinner } from '../components/ui';

function ProjectModal({ open, onClose, project, onSaved }) {
  const isEdit = Boolean(project);
  const [form, setForm] = useState({ name: '', key: '', description: '', members: [] });
  const [errors, setErrors] = useState({});
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setFilter('');
    setForm(
      project
        ? { name: project.name, key: project.key, description: project.description || '', members: project.members.map((m) => m._id) }
        : { name: '', key: '', description: '', members: [] }
    );
    api.get('/users').then(({ data }) => setUsers(data.users)).catch((e) => toast.error(errMsg(e)));
  }, [open, project]);

  const set = (k) => (e) => {
    let v = e.target.value;
    if (k === 'key') v = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };
  const toggle = (id) => setForm((f) => ({ ...f, members: f.members.includes(id) ? f.members.filter((m) => m !== id) : [...f.members, id] }));

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (form.name.trim().length < 2) local.name = 'Name is required';
    if (!isEdit && !/^[A-Z][A-Z0-9]{1,5}$/.test(form.key)) local.key = '2–6 chars, starts with a letter';
    if (Object.keys(local).length) return setErrors(local);
    setSaving(true);
    try {
      const payload = isEdit ? { name: form.name, description: form.description, members: form.members } : form;
      const { data } = isEdit ? await api.patch(`/projects/${project._id}`, payload) : await api.post('/projects', payload);
      toast.success(isEdit ? 'Project updated' : `${data.project.key} created`);
      onSaved();
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const visible = users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={isEdit ? `Edit ${project.key}` : 'New project'}
      title={isEdit ? 'Edit project' : <>Start a <span className="pop">project</span></>}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="project-form" disabled={saving}>{saving ? <Spinner /> : <Check />} {isEdit ? 'Save changes' : 'Create project'}</button>
        </>
      }
    >
      <form id="project-form" className="modal-body" onSubmit={submit} noValidate>
        <div className="grid-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <Field label="Name" error={errors.name} htmlFor="p-name">
            <input id="p-name" className={`input ${errors.name ? 'has-error' : ''}`} value={form.name} onChange={set('name')} placeholder="Payments Gateway" autoFocus />
          </Field>
          <Field label="Key" error={errors.key} htmlFor="p-key">
            <input id="p-key" className={`input mono ${errors.key ? 'has-error' : ''}`} value={form.key} onChange={set('key')} placeholder="PAY" disabled={isEdit} title={isEdit ? 'Keys are permanent — issue keys depend on them' : ''} />
          </Field>
        </div>
        <Field label="Description" htmlFor="p-desc">
          <textarea id="p-desc" className="textarea" rows={3} value={form.description} onChange={set('description')} placeholder="What is this project about?" style={{ minHeight: 80 }} />
        </Field>
        <Field label={`Members · ${form.members.length} selected`} error={errors.members}>
          <div className="search" style={{ marginBottom: 8 }}>
            <Search size={16} />
            <input className="input" placeholder="Filter people…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
          <div className="member-picker">
            {visible.map((u) => {
              const on = form.members.includes(u._id);
              return (
                <button type="button" key={u._id} className={`member ${on ? 'on' : ''}`} onClick={() => toggle(u._id)}>
                  <Avatar user={u} size="sm" />
                  <span className="member-name">{u.name}<small>{u.email}</small></span>
                  <span className={`role-tag ${u.role}`}>{u.role}</span>
                  <span className="member-check">{on && <Check size={13} strokeWidth={3} />}</span>
                </button>
              );
            })}
          </div>
        </Field>
      </form>
    </Modal>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const { data, error, reload } = useAsync(() => api.get('/projects').then((r) => r.data.projects), []);
  const [modal, setModal] = useState({ open: false, project: null });

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">{isAdmin ? 'All projects' : 'Projects you belong to'}</span>
          <h1 className="display page-title" style={{ marginTop: 14 }}>Your <span className="pop">projects</span></h1>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={() => setModal({ open: true, project: null })}><FolderPlus /> New project</button>}
      </div>

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <SkeletonRows rows={3} height={150} />
      ) : data.length === 0 ? (
        <EmptyState
          title="No projects yet"
          text={isAdmin ? 'Create the first project and add your team.' : 'An admin needs to add you to a project before you can report bugs.'}
          action={isAdmin && <button className="btn btn-primary btn-sm" onClick={() => setModal({ open: true, project: null })}><FolderPlus /> New project</button>}
        />
      ) : (
        <div className="project-list">
          {data.map((p, i) => (
            <motion.article key={p._id} className="project-row" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <div className="project-key display">{p.key}</div>
              <div className="project-info">
                <h2 className="display">{p.name}</h2>
                <p className="dim">{p.description || 'No description'}</p>
                <div className="avatar-stack" style={{ marginTop: 14 }}>
                  {p.members.slice(0, 7).map((m) => <Avatar key={m._id} user={m} size="sm" />)}
                  {p.members.length > 7 && <span className="mono dim" style={{ marginLeft: 8, fontSize: 12 }}>+{p.members.length - 7}</span>}
                </div>
              </div>
              <div className="project-stats">
                <div><span className="display"><CountUp value={p.openCount} pad={2} /></span><span className="label">Active</span></div>
                <div><span className="display"><CountUp value={p.issueCount} pad={2} /></span><span className="label">Total</span></div>
              </div>
              <div className="project-actions">
                <Link to={`/board?project=${p._id}`} className="btn btn-sm">Board <ArrowUpRight /></Link>
                <Link to={`/issues?project=${p._id}`} className="btn btn-sm">Issues <ArrowUpRight /></Link>
                {isAdmin && <button className="btn btn-sm btn-ghost" onClick={() => setModal({ open: true, project: p })}><Pencil /> Edit</button>}
              </div>
            </motion.article>
          ))}
        </div>
      )}

      {isAdmin && <ProjectModal open={modal.open} project={modal.project} onClose={() => setModal({ open: false, project: null })} onSaved={reload} />}
    </div>
  );
}
