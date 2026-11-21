import { useMemo } from 'react';
import api from '../api/client';
import useAsync from './useAsync';

/** Hook used by both the table and the board: projects + people for filter dropdowns */
export default function useFilterOptions() {
  const projects = useAsync(() => api.get('/projects').then((r) => r.data.projects), []);
  const people = useMemo(() => {
    const map = new Map();
    projects.data?.forEach((p) => p.members.forEach((m) => map.set(m._id, m)));
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [projects.data]);
  return { projects: projects.data || [], people };
}
