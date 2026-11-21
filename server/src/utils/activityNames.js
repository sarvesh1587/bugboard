const User = require('../models/User');

/**
 * Assignee activities store user ids (so history survives renames).
 * For display we swap them for names in one query.
 * Works on plain objects (lean / toObject()).
 */
async function withAssigneeNames(activities) {
  const ids = activities.filter((a) => a.type === 'assignee').flatMap((a) => [a.from, a.to]).filter(Boolean);
  if (!ids.length) return activities;
  const users = await User.find({ _id: { $in: ids } }).select('name').lean();
  const names = Object.fromEntries(users.map((u) => [u._id.toString(), u.name]));
  return activities.map((a) =>
    a.type === 'assignee'
      ? { ...a, from: a.from ? names[a.from.toString()] || 'Unknown user' : null, to: a.to ? names[a.to.toString()] || 'Unknown user' : null }
      : a
  );
}

module.exports = withAssigneeNames;
