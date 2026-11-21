import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import api, { errMsg } from '../api/client';
import useAsync from '../hooks/useAsync';
import useDebounce from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';
import { Avatar, EmptyState, ErrorState, SkeletonRows } from '../components/ui';

/** Admin-only: list users and change roles */
export default function Team() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 300);
  const { data, error, reload, setData } = useAsync(() => api.get('/users', { params: debounced ? { q: debounced } : {} }).then((r) => r.data.users), [debounced]);

  const changeRole = async (id, role) => {
    try {
      const { data: res } = await api.patch(`/users/${id}/role`, { role });
      setData((list) => list.map((u) => (u._id === id ? res.user : u)));
      toast.success(`${res.user.name} is now ${role}`);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const counts = (data || []).reduce((acc, u) => ({ ...acc, [u.role]: (acc[u.role] || 0) + 1 }), {});

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">{data ? `${data.length} people · ${counts.admin || 0} admin · ${counts.developer || 0} dev · ${counts.tester || 0} QA` : 'Loading'}</span>
          <h1 className="display page-title" style={{ marginTop: 14 }}>The <span className="pop">team</span></h1>
        </div>
        <div className="search" style={{ minWidth: 260 }}>
          <Search size={17} />
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" />
        </div>
      </div>

      <div className="table-wrap">
        {error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data ? (
          <div style={{ padding: 16 }}><SkeletonRows rows={5} /></div>
        ) : data.length === 0 ? (
          <EmptyState title="No one found" />
        ) : (
          <table className="issues-table team-table">
            <thead>
              <tr><th>Person</th><th>Email</th><th>Joined</th><th style={{ width: 180 }}>Role</th></tr>
            </thead>
            <tbody>
              {data.map((u, i) => (
                <motion.tr key={u._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} style={{ cursor: 'default' }}>
                  <td data-cell="title"><span className="person"><Avatar user={u} /><strong>{u.name}</strong>{u._id === user._id && <span className="role-tag">you</span>}</span></td>
                  <td data-cell="email" className="dim">{u.email}</td>
                  <td data-cell="updated" className="mono dim" style={{ fontSize: 12 }}>{format(new Date(u.createdAt), 'd MMM yyyy')}</td>
                  <td data-cell="role">
                    <select className="select" value={u.role} disabled={u._id === user._id} onChange={(e) => changeRole(u._id, e.target.value)} title={u._id === user._id ? "You can't change your own role" : ''}>
                      <option value="admin">Admin</option>
                      <option value="developer">Developer</option>
                      <option value="tester">Tester</option>
                    </select>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
