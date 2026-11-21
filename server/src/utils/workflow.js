const { ROLES } = require('./constants');

/**
 * Status workflow: Open → In Progress → Testing → Resolved → Closed
 * plus a few intentional "backward" moves (QA rejects, reopen, etc).
 *
 * Every allowed edge lists which roles may perform it. Admin may perform
 * any *valid* edge, but can never skip the workflow (e.g. open → closed).
 */
const TRANSITIONS = {
  open: {
    in_progress: { roles: [ROLES.DEVELOPER], assigneeOnly: true, label: 'Start work' },
  },
  in_progress: {
    testing: { roles: [ROLES.DEVELOPER], assigneeOnly: true, label: 'Send to testing' },
    open: { roles: [ROLES.DEVELOPER], assigneeOnly: true, label: 'Move back to open' },
  },
  testing: {
    resolved: { roles: [ROLES.TESTER], label: 'Mark resolved' },
    in_progress: { roles: [ROLES.TESTER], label: 'Fail QA' },
  },
  resolved: {
    closed: { roles: [ROLES.TESTER], allowReporter: true, label: 'Close issue' },
    in_progress: { roles: [ROLES.TESTER], allowReporter: true, label: 'Reopen' },
  },
  closed: {
    open: { roles: [], label: 'Reopen' }, // admin only
  },
};

const idOf = (v) => (v && v._id ? v._id.toString() : v ? v.toString() : null);

/**
 * Decide whether `user` may move `issue` to `to`.
 * Returns { ok: boolean, code?: 422|403, reason?: string }
 */
function checkTransition(user, issue, to) {
  const from = issue.status;
  if (from === to) {
    return { ok: false, code: 422, reason: `Issue is already "${to}"` };
  }

  const rule = TRANSITIONS[from] && TRANSITIONS[from][to];
  if (!rule) {
    return {
      ok: false,
      code: 422,
      reason: `Invalid transition: ${from} → ${to}. Allowed: ${Object.keys(TRANSITIONS[from] || {}).join(', ') || 'none'}`,
    };
  }

  if (user.role === ROLES.ADMIN) return { ok: true };

  const userId = user._id.toString();
  const isReporter = idOf(issue.reporter) === userId;
  const isAssignee = idOf(issue.assignee) === userId;

  if (rule.allowReporter && isReporter) return { ok: true };

  if (!rule.roles.includes(user.role)) {
    return { ok: false, code: 403, reason: `Role "${user.role}" cannot perform "${rule.label}"` };
  }

  if (rule.assigneeOnly) {
    // A developer can pick up an unassigned issue — it gets auto-assigned to them
    const unassignedPickup = from === 'open' && to === 'in_progress' && !issue.assignee;
    if (!isAssignee && !unassignedPickup) {
      return { ok: false, code: 403, reason: 'Only the assigned developer can move this issue' };
    }
  }

  return { ok: true };
}

/** List of transitions `user` can perform on `issue` right now (used by the UI). */
function availableTransitions(user, issue) {
  return Object.entries(TRANSITIONS[issue.status] || {})
    .filter(([to]) => checkTransition(user, issue, to).ok)
    .map(([to, rule]) => ({ to, label: rule.label }));
}

module.exports = { TRANSITIONS, checkTransition, availableTransitions };
