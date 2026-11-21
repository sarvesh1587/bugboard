const Comment = require('../models/Comment');
const Activity = require('../models/Activity');
const ApiError = require('../utils/ApiError');
const notify = require('../utils/notify');
const { isAdmin, loadIssueFor } = require('../utils/access');

// GET /api/issues/:id/comments
exports.list = async (req, res) => {
  const { issue } = await loadIssueFor(req.user, req.params.id);
  const comments = await Comment.find({ issue: issue._id }).sort({ createdAt: 1 }).populate('author', 'name role');
  res.json({ success: true, comments });
};

// POST /api/issues/:id/comments
exports.create = async (req, res) => {
  const { issue, project } = await loadIssueFor(req.user, req.params.id);
  const comment = await Comment.create({ issue: issue._id, author: req.user._id, body: req.body.body });
  await comment.populate('author', 'name role');

  // Touch the issue so "recently updated" sorting reflects discussion
  await issue.updateOne({ $currentDate: { updatedAt: true } });
  await Activity.create({ issue: issue._id, project: project._id, actor: req.user._id, type: 'comment' });
  await notify([issue.reporter, issue.assignee], {
    actor: req.user._id,
    issue: issue._id,
    type: 'comment',
    message: `${req.user.name} commented on ${issue.key}`,
  });

  res.status(201).json({ success: true, comment });
};

// DELETE /api/comments/:id  (author or admin)
exports.remove = async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw ApiError.notFound('Comment not found');
  await loadIssueFor(req.user, comment.issue); // access check
  if (!isAdmin(req.user) && comment.author.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only delete your own comments');
  }
  await comment.deleteOne();
  res.status(204).end();
};
