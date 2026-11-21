export const STATUSES = [
  { id: 'open', label: 'Open', short: 'OPEN' },
  { id: 'in_progress', label: 'In Progress', short: 'DOING' },
  { id: 'testing', label: 'Testing', short: 'QA' },
  { id: 'resolved', label: 'Resolved', short: 'FIXED' },
  { id: 'closed', label: 'Closed', short: 'DONE' },
];
export const STATUS = Object.fromEntries(STATUSES.map((s) => [s.id, s]));

export const SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Client mirror of the server workflow — only used to give instant visual
 * feedback while dragging on the board. The server remains the authority.
 */
const FLOW = {
  open: { in_progress: ['developer'] },
  in_progress: { testing: ['developer'], open: ['developer'] },
  testing: { resolved: ['tester'], in_progress: ['tester'] },
  resolved: { closed: ['tester', 'reporter'], in_progress: ['tester', 'reporter'] },
  closed: { open: [] },
};

export function canMove(user, issue, to) {
  const rule = FLOW[issue.status]?.[to];
  if (!rule) return false;
  if (user.role === 'admin') return !(issue.status === 'open' && !issue.assignee);
  const me = user._id;
  const isReporter = (issue.reporter?._id || issue.reporter) === me;
  const isAssignee = (issue.assignee?._id || issue.assignee) === me;
  if (rule.includes('reporter') && isReporter) return true;
  if (!rule.includes(user.role)) return false;
  if (user.role === 'developer') return isAssignee || (issue.status === 'open' && !issue.assignee);
  return true;
}

const AVATAR_TONES = ['#ffd7c4', '#ffe9a8', '#bfebd3', '#cfe5ff', '#ffd0da', '#dcefb0'];
export const toneFor = (id = '') => AVATAR_TONES[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
export const initials = (name = '?') => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
