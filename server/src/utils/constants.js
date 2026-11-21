const ROLES = Object.freeze({
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  TESTER: 'tester',
});

const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['open', 'in_progress', 'testing', 'resolved', 'closed'];

module.exports = { ROLES, SEVERITIES, PRIORITIES, STATUSES };
