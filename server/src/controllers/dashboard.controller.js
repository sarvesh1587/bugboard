const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const Activity = require('../models/Activity');
const ApiError = require('../utils/ApiError');
const { isAdmin, visibleProjectIds } = require('../utils/access');
const withAssigneeNames = require('../utils/activityNames');

const DAYS = 14;

// GET /api/dashboard?project=<id>
exports.summary = async (req, res) => {
  const visible = await visibleProjectIds(req.user);
  let scope;
  if (req.query.project) {
    if (!mongoose.isValidObjectId(req.query.project) || !visible.some((id) => id.equals(req.query.project))) {
      throw ApiError.notFound('Project not found');
    }
    scope = { project: new mongoose.Types.ObjectId(req.query.project) };
  } else {
    scope = isAdmin(req.user) ? {} : { project: { $in: visible } };
  }

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (DAYS - 1));

  // All counters in a single round-trip
  const [facets] = await Issue.aggregate([
    { $match: scope },
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', n: { $sum: 1 } } }],
        bySeverity: [{ $match: { status: { $nin: ['resolved', 'closed'] } } }, { $group: { _id: '$severity', n: { $sum: 1 } } }],
        byPriority: [{ $match: { status: { $nin: ['resolved', 'closed'] } } }, { $group: { _id: '$priority', n: { $sum: 1 } } }],
        critical: [{ $match: { severity: 'critical', status: { $nin: ['resolved', 'closed'] } } }, { $count: 'n' }],
        created: [
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } },
        ],
      },
    },
  ]);

  const resolvedTrend = await Activity.aggregate([
    { $match: { ...scope, type: 'status', to: 'resolved', createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } },
  ]);

  const toMap = (arr) => Object.fromEntries(arr.map((x) => [x._id, x.n]));
  const status = toMap(facets.byStatus);
  const created = toMap(facets.created);
  const resolved = toMap(resolvedTrend);

  const trend = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { date: key, created: created[key] || 0, resolved: resolved[key] || 0 };
  });

  const [myIssues, myCount, recent] = await Promise.all([
    Issue.find({ ...scope, assignee: req.user._id, status: { $nin: ['resolved', 'closed'] } })
      .sort({ updatedAt: -1 })
      .limit(6)
      .select('key title status priority severity updatedAt project')
      .populate('project', 'key name'),
    Issue.countDocuments({ ...scope, assignee: req.user._id, status: { $nin: ['resolved', 'closed'] } }),
    Activity.find(scope)
      .sort({ createdAt: -1 })
      .limit(12)
      .populate('actor', 'name role')
      .populate('issue', 'key title')
      .lean(),
  ]);

  const total = Object.values(status).reduce((a, b) => a + b, 0);

  res.json({
    success: true,
    stats: {
      total,
      open: status.open || 0,
      inProgress: status.in_progress || 0,
      testing: status.testing || 0,
      resolved: status.resolved || 0,
      closed: status.closed || 0,
      critical: facets.critical[0]?.n || 0,
      assignedToMe: myCount,
    },
    bySeverity: toMap(facets.bySeverity),
    byPriority: toMap(facets.byPriority),
    trend,
    myIssues,
    recent: await withAssigneeNames(recent.filter((a) => a.issue)), // drop entries of deleted issues
  });
};
