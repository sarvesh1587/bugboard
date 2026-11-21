const Project = require('../models/Project');
const Issue = require('../models/Issue');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { projectScope, loadProjectFor } = require('../utils/access');

const MEMBER_FIELDS = 'name email role';

async function assertUsersExist(ids) {
  if (!ids.length) return;
  const count = await User.countDocuments({ _id: { $in: ids } });
  if (count !== new Set(ids).size) throw ApiError.badRequest('One or more members do not exist');
}

// GET /api/projects — only projects the user may access
exports.list = async (req, res) => {
  const projects = await Project.find(projectScope(req.user))
    .populate('members', MEMBER_FIELDS)
    .sort({ createdAt: -1 })
    .lean();

  // One aggregation for issue counts of all listed projects (no N+1)
  const counts = await Issue.aggregate([
    { $match: { project: { $in: projects.map((p) => p._id) } } },
    {
      $group: {
        _id: '$project',
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 0, 1] } },
      },
    },
  ]);
  const byId = Object.fromEntries(counts.map((c) => [c._id.toString(), c]));

  res.json({
    success: true,
    projects: projects.map((p) => ({
      ...p,
      issueCount: byId[p._id.toString()]?.total || 0,
      openCount: byId[p._id.toString()]?.open || 0,
    })),
  });
};

// GET /api/projects/:id
exports.get = async (req, res) => {
  const project = await loadProjectFor(req.user, req.params.id);
  await project.populate('members', MEMBER_FIELDS);
  res.json({ success: true, project });
};

// POST /api/projects  (admin)
exports.create = async (req, res) => {
  const { name, key, description } = req.body;
  // Creator is always a member so they can be assigned too
  const members = [...new Set([...req.body.members, req.user._id.toString()])];
  await assertUsersExist(members);

  if (await Project.exists({ key })) throw ApiError.conflict(`Project key "${key}" is already taken`);

  const project = await Project.create({ name, key, description, members, createdBy: req.user._id });
  await project.populate('members', MEMBER_FIELDS);
  res.status(201).json({ success: true, project });
};

// PATCH /api/projects/:id  (admin)
exports.update = async (req, res) => {
  const project = await loadProjectFor(req.user, req.params.id);
  const { name, description, members } = req.body;

  if (name !== undefined) project.name = name;
  if (description !== undefined) project.description = description;
  if (members !== undefined) {
    const unique = [...new Set(members)];
    await assertUsersExist(unique);

    // Business rule: can't remove someone who still owns active issues here
    const removed = project.members.map(String).filter((id) => !unique.includes(id));
    if (removed.length) {
      const blocking = await Issue.countDocuments({
        project: project._id,
        assignee: { $in: removed },
        status: { $nin: ['resolved', 'closed'] },
      });
      if (blocking) {
        throw ApiError.unprocessable(`Cannot remove members who are assigned to ${blocking} active issue(s). Reassign them first.`);
      }
    }
    project.members = unique;
  }

  await project.save();
  await project.populate('members', MEMBER_FIELDS);
  res.json({ success: true, project });
};
