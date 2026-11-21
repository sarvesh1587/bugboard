import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bug } from 'lucide-react';
import api, { errMsg, fieldErrors } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PRIORITIES, SEVERITIES } from '../lib/meta';
import { Field, Modal, Segmented, Spinner } from './ui';

const empty = { project: '', title: '', description: '', severity: 'medium', priority: 'medium', assignee: '' };

export default function NewIssueModal({ open, onClose, defaultProject }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    api
      .get('/projects')
      .then(({ data }) => {
        setProjects(data.projects);
        setForm({ ...empty, project: defaultProject || data.projects[0]?._id || '' });
      })
      .catch((e) => toast.error(errMsg(e)));
  }, [open, defaultProject]);

  const project = projects?.find((p) => p._id === form.project);
  // Assignment rule mirrors the API: project members who are developers/admins
  const assignable = useMemo(() => {
    const devs = (project?.members || []).filter((m) => ['developer', 'admin'].includes(m.role));
    return user.role === 'developer' ? devs.filter((m) => m._id === user._id) : devs;
  }, [project, user]);

  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v, ...(k === 'project' ? { assignee: '' } : {}) }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (!form.project) local.project = 'Pick a project';
    if (form.title.trim().length < 3) local.title = 'Title must be at least 3 characters';
    if (form.description.trim().length < 5) local.description = 'Describe the bug (min 5 characters)';
    if (Object.keys(local).length) return setErrors(local);

    setSaving(true);
    try {
      const { data } = await api.post('/issues', { ...form, assignee: form.assignee || null });
      toast.success(`${data.issue.key} reported`);
      window.dispatchEvent(new Event('bugboard:issues-changed'));
      onClose();
      navigate(`/issues/${data.issue._id}`);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="New issue"
      title={<>Report a <span className="pop">bug</span></>}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">Cancel</button>
          <button className="btn btn-primary" form="new-issue" disabled={saving || !projects?.length}>
            {saving ? <Spinner /> : <Bug />} Create issue
          </button>
        </>
      }
    >
      {projects && projects.length === 0 ? (
        <div className="modal-body">
          <p className="dim">You are not a member of any project yet. Ask an admin to add you to one.</p>
        </div>
      ) : (
        <form id="new-issue" className="modal-body" onSubmit={submit} noValidate>
          <div className="grid-2">
            <Field label="Project" error={errors.project} htmlFor="ni-project">
              <select id="ni-project" className={`select ${errors.project ? 'has-error' : ''}`} value={form.project} onChange={set('project')} disabled={!projects}>
                {!projects && <option>Loading…</option>}
                {projects?.map((p) => (
                  <option key={p._id} value={p._id}>{p.key} — {p.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Assignee" error={errors.assignee} htmlFor="ni-assignee">
              <select id="ni-assignee" className="select" value={form.assignee} onChange={set('assignee')}>
                <option value="">Unassigned</option>
                {assignable.map((m) => (
                  <option key={m._id} value={m._id}>{m.name}{m._id === user._id ? ' (me)' : ''}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Title" error={errors.title} htmlFor="ni-title">
            <input id="ni-title" className={`input ${errors.title ? 'has-error' : ''}`} value={form.title} onChange={set('title')} placeholder="e.g. Checkout fails when coupon is applied" maxLength={160} autoFocus />
          </Field>
          <Field label="Description" error={errors.description} htmlFor="ni-desc">
            <textarea
              id="ni-desc"
              className={`textarea ${errors.description ? 'has-error' : ''}`}
              value={form.description}
              onChange={set('description')}
              placeholder={'Steps to reproduce:\n1. …\n\nExpected:\nActual:'}
              rows={6}
            />
          </Field>
          <div className="grid-2">
            <Field label="Severity">
              <Segmented id="ni-sev" options={SEVERITIES} value={form.severity} onChange={set('severity')} />
            </Field>
            <Field label="Priority">
              <Segmented id="ni-prio" options={PRIORITIES} value={form.priority} onChange={set('priority')} />
            </Field>
          </div>
        </form>
      )}
    </Modal>
  );
}
