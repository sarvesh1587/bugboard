const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');

// GET /api/notifications
exports.list = async (req, res) => {
  const [notifications, unread] = await Promise.all([
    Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('actor', 'name')
      .populate('issue', 'key title'),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ success: true, notifications, unread });
};

// PATCH /api/notifications/:id/read
exports.markRead = async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { returnDocument: 'after' });
  if (!n) throw ApiError.notFound('Notification not found');
  res.json({ success: true, notification: n });
};

// PATCH /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  const result = await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true, updated: result.modifiedCount });
};
