const Notification = require('../models/Notification');

/**
 * Create in-app notifications for a set of users, skipping the actor
 * (nobody needs to be notified about their own action) and duplicates.
 * Failures are logged, never thrown — a notification must not break the main action.
 */
async function notify(userIds, { actor, issue, type, message }) {
  try {
    const actorId = actor?.toString();
    const targets = [...new Set(userIds.filter(Boolean).map(String))].filter((id) => id !== actorId);
    if (!targets.length) return;
    await Notification.insertMany(targets.map((user) => ({ user, actor, issue, type, message })));
  } catch (err) {
    console.error('notify failed:', err.message);
  }
}

module.exports = notify;
