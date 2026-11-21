const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const Project = require('../models/Project');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const notify = require('../utils/notify');
const { ROLES, PRIORITIES, SEVERITIES } = require('../utils/constants');
const { checkTransition, availableTransitions } = require('../utils/workflow');
const { isAdmin, visibleProjectIds, loadProjectFor, loadIssueFor } = require('../utils/access');
const { UPLOAD_DIR } = require('../middleware/upload');
const withAssigneeNames = require('../utils/activityNames');

const USER_FIELDS = 'name email role';
const { ObjectId } = mongoose.Types;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const STATUS_LABEL = { open: 'Open', in_progress: 'In Progress', testing: 'Testing', resolved: 'Resolved', closed: 'Closed' };

/* ------------------------------------------------------------------ */
/* Permission helpers — single source of truth for UI + API            */
/* ------------------------------------------------------------------ */

const isReporter = (user, issue) => issue.reporter && (issue.reporter._id || issue.reporter).toString() === user._id.toString();

function permissionsFor(user, issue) {
  const locked = issue.status === 'closed';
  return {
    canEdit: isAdmin(user) || (isReporter(user, issue) && !locked),
    canAssign: !locked && [ROLES.ADMIN, ROLES.TESTER].includes(user.role),
    canSelfAssign: ['open', 'in_progress'].includes(issue.status) && user.role === ROLES.DEVELOPER,
    canDelete: isAdmin(user),
    transitions: availableTransitions(user, issue),
  };
}

/** Assignee rule: must be a member of the project AND a developer or admin */
async function assertAssignable(project, assigneeId) {
  if (!project.hasMember(assigneeId)) {
    throw ApiError.unprocessable('Assignee must be a member of this project');
  }
  const assignee = await User.findById(assigneeId).select('role name');
  if (!assignee) throw ApiError.unprocessable('Assignee does not exist');
  if (![ROLES.DEVELOPER, ROLES.ADMIN].includes(assignee.role)) {
    throw ApiError.unprocessable('Only developers (or admins) can be assigned to issues');
  }
  return assignee;
}

const populateIssue = (doc) =>
  doc.populate([
    { path: 'reporter', select: USER_FIELDS },
    { path: 'assignee', select: USER_FIELDS },
    { path: 'project', select: 'name key' },
    { path: 'attachments.uploadedBy', select: 'name' },
  ]);

/* ------------------------------------------------------------------ */
/* GET /api/issues  — filters, search, sorting, pagination            */
/* ------------------------------------------------------------------ */
exports.list = async (req, res) => {
  const { project, status, priority, severity, reporter, assignee, q, sort, page, limit } = req.validatedQuery;
  const visible = await visibleProjectIds(req.user);

  const match = {};
  if (project) {
    if (!visible.some((id) => id.equals(project))) throw ApiError.notFound('Project not found');
    match.project = new ObjectId(project);
  } else if (!isAdmin(req.user)) {
    match.project = { $in: visible };
  }
  if (status) match.status = { $in: status };
  if (priority) match.priority = { $in: priority };
  if (severity) match.severity = { $in: severity };
  if (reporter) match.reporter = reporter === 'me' ? req.user._id : new ObjectId(reporter);
  if (assignee === 'me') match.assignee = req.user._id;
  else if (assignee === 'none') match.assignee = null;
  else if (assignee) match.assignee = new ObjectId(assignee);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    match.$or = [{ title: rx }, { key: rx }];
  }

  // priority/severity are enums → sort by their logical rank, not alphabetically
  const dir = sort.startsWith('-') ? -1 : 1;
  const field = sort.replace('-', '');
  const sortStage =
    field === 'priority' ? { _rank: dir, updatedAt: -1 } : field === 'severity' ? { _rank: dir, updatedAt: -1 } : { [field]: dir, _id: -1 };

  const pipeline = [{ $match: match }];
  if (field === 'priority' || field === 'severity') {
    pipeline.push({ $addFields: { _rank: { $indexOfArray: [field === 'priority' ? PRIORITIES : SEVERITIES, `$${field}`] } } });
  }
  pipeline.push(
    { $sort: sortStage },
    {
      $facet: {
        items: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: { _rank: 0, description: 0, attachments: 0 } }],
        total: [{ $count: 'n' }],
      },
    }
  );

  const [result] = await Issue.aggregate(pipeline);
  const items = await Issue.populate(result.items, [
    { path: 'reporter', select: USER_FIELDS },
    { path: 'assignee', select: USER_FIELDS },
    { path: 'project', select: 'name key' },
  ]);
  const total = result.total[0]?.n || 0;

  res.json({
    success: true,
    issues: items,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
};

/* GET /api/issues/:id */
exports.get = async (req, res) => {
  const { issue } = await loadIssueFor(req.user, req.params.id);
  await populateIssue(issue);
  res.json({ success: true, issue, permissions: permissionsFor(req.user, issue) });
};

/* POST /api/issues */
exports.create = async (req, res) => {
  const { project: projectId, title, description, severity, priority, assignee } = req.body;
  const project = await loadProjectFor(req.user, projectId);

  if (assignee) {
    // Developers may only assign a new bug to themselves
    if (req.user.role === ROLES.DEVELOPER && assignee !== req.user._id.toString()) {
      throw ApiError.forbidden('Developers can only assign issues to themselves');
    }
    await assertAssignable(project, assignee);
  }

  // Atomic per-project counter → collision-free keys like PAY-42
  const { issueSeq } = await Project.findByIdAndUpdate(project._id, { $inc: { issueSeq: 1 } }, { returnDocument: 'after', select: '+issueSeq' });

  const issue = await Issue.create({
    project: project._id,
    number: issueSeq,
    key: `${project.key}-${issueSeq}`,
    title,
    description,
    severity,
    priority,
    reporter: req.user._id,
    assignee: assignee || null,
  });

  await Activity.create({ issue: issue._id, project: project._id, actor: req.user._id, type: 'created', to: issue.key });
  if (assignee) {
    await Activity.create({ issue: issue._id, project: project._id, actor: req.user._id, type: 'assignee', from: null, to: assignee });
    await notify([assignee], { actor: req.user._id, issue: issue._id, type: 'assigned', message: `${req.user.name} assigned you ${issue.key}: ${issue.title}` });
  }

  await populateIssue(issue);
  res.status(201).json({ success: true, issue, permissions: permissionsFor(req.user, issue) });
};

/* PATCH /api/issues/:id  — title, description, severity, priority */
exports.update = async (req, res) => {
  const { issue } = await loadIssueFor(req.user, req.params.id);
  const perms = permissionsFor(req.user, issue);
  if (!perms.canEdit) {
    throw ApiError.forbidden(issue.status === 'closed' ? 'Closed issues can only be edited by an admin' : 'Only the reporter or an admin can edit this issue');
  }

  const activities = [];
  for (const [field, value] of Object.entries(req.body)) {
    if (issue[field] === value) continue;
    // Long text fields: record that they changed, not the full text
    const longText = field === 'description';
    activities.push({ issue: issue._id, project: issue.project, actor: req.user._id, type: 'field', field, from: longText ? null : issue[field], to: longText ? null : value });
    issue[field] = value;
  }

  if (activities.length) {
    await issue.save();
    await Activity.insertMany(activities);
  }

  await populateIssue(issue);
  res.json({ success: true, issue, permissions: permissionsFor(req.user, issue) });
};

/* PATCH /api/issues/:id/status  — workflow enforced server-side */
exports.changeStatus = async (req, res) => {
  const { issue, project } = await loadIssueFor(req.user, req.params.id);
  const { status: to } = req.body;

  const check = checkTransition(req.user, issue, to);
  if (!check.ok) throw new ApiError(check.code, check.reason);

  const from = issue.status;
  const activities = [];

  // Developer picking up an unassigned bug → auto-assign (documented rule)
  if (from === 'open' && to === 'in_progress' && !issue.assignee) {
    if (req.user.role === ROLES.ADMIN) {
      throw ApiError.unprocessable('Assign a developer before starting work on this issue');
    }
    await assertAssignable(project, req.user._id);
    issue.assignee = req.user._id;
    activities.push({ issue: issue._id, project: project._id, actor: req.user._id, type: 'assignee', from: null, to: req.user._id });
  }

  issue.status = to;
  await issue.save();
  activities.push({ issue: issue._id, project: project._id, actor: req.user._id, type: 'status', field: 'status', from, to });
  await Activity.insertMany(activities);

  await notify([issue.reporter, issue.assignee], {
    actor: req.user._id,
    issue: issue._id,
    type: 'status',
    message: `${req.user.name} moved ${issue.key} to ${STATUS_LABEL[to]}`,
  });

  await populateIssue(issue);
  res.json({ success: true, issue, permissions: permissionsFor(req.user, issue) });
};

/* PATCH /api/issues/:id/assign */
exports.assign = async (req, res) => {
  const { issue, project } = await loadIssueFor(req.user, req.params.id);
  const { assignee } = req.body;
  const perms = permissionsFor(req.user, issue);
  const me = req.user._id.toString();
  const current = issue.assignee ? issue.assignee.toString() : null;

  if (issue.status === 'closed') throw ApiError.unprocessable('Closed issues cannot be reassigned');

  if (!perms.canAssign) {
    // Developers: take an unassigned issue, or release their own — only before QA
    if (req.user.role === ROLES.DEVELOPER && !perms.canSelfAssign) {
      throw ApiError.unprocessable('Issues in testing or later cannot be taken or released by developers');
    }
    const takingUnassigned = assignee === me && current === null;
    const releasingOwn = assignee === null && current === me;
    if (!(perms.canSelfAssign && (takingUnassigned || releasingOwn))) {
      throw ApiError.forbidden('Developers can only take unassigned issues or release their own');
    }
  }

  if (assignee === current) throw ApiError.unprocessable('Issue already has this assignee');
  if (assignee) await assertAssignable(project, assignee);

  issue.assignee = assignee;
  await issue.save();
  await Activity.create({ issue: issue._id, project: project._id, actor: req.user._id, type: 'assignee', from: current, to: assignee });

  if (assignee) {
    await notify([assignee], { actor: req.user._id, issue: issue._id, type: 'assigned', message: `${req.user.name} assigned you ${issue.key}: ${issue.title}` });
  }

  await populateIssue(issue);
  res.json({ success: true, issue, permissions: permissionsFor(req.user, issue) });
};

/* DELETE /api/issues/:id  (admin) */
exports.remove = async (req, res) => {
  const { issue } = await loadIssueFor(req.user, req.params.id);
  await Promise.all([
    Comment.deleteMany({ issue: issue._id }),
    Activity.deleteMany({ issue: issue._id }),
    Notification.deleteMany({ issue: issue._id }),
    ...issue.attachments.map((a) => fs.unlink(path.join(UPLOAD_DIR, a.filename)).catch(() => {})),
  ]);
  await issue.deleteOne();
  res.status(204).end();
};

/* POST /api/issues/:id/attachments  (multipart, field "files") */
exports.addAttachments = async (req, res) => {
  const files = req.files || [];
  const cleanup = () => Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));

  let loaded;
  try {
    loaded = await loadIssueFor(req.user, req.params.id);
  } catch (err) {
    await cleanup(); // never keep files for issues the user can't access
    throw err;
  }
  const { issue, project } = loaded;
  if (!files.length) throw ApiError.badRequest('No files uploaded');
  if (issue.attachments.length + files.length > 10) {
    await cleanup();
    throw ApiError.unprocessable('An issue can have at most 10 attachments');
  }

  const added = files.map((f) => ({
    filename: f.filename,
    originalName: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
    url: `/uploads/${f.filename}`,
    uploadedBy: req.user._id,
  }));
  issue.attachments.push(...added);
  await issue.save();
  await Activity.create({ issue: issue._id, project: project._id, actor: req.user._id, type: 'attachment', to: added.map((a) => a.originalName).join(', ') });

  await populateIssue(issue);
  res.status(201).json({ success: true, issue, permissions: permissionsFor(req.user, issue) });
};

/* DELETE /api/issues/:id/attachments/:attachmentId  (uploader or admin) */
exports.removeAttachment = async (req, res) => {
  const { issue } = await loadIssueFor(req.user, req.params.id);
  const att = issue.attachments.id(req.params.attachmentId);
  if (!att) throw ApiError.notFound('Attachment not found');
  if (!isAdmin(req.user) && att.uploadedBy?.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the uploader or an admin can remove this attachment');
  }
  await fs.unlink(path.join(UPLOAD_DIR, att.filename)).catch(() => {});
  att.deleteOne();
  await issue.save();
  await populateIssue(issue);
  res.json({ success: true, issue, permissions: permissionsFor(req.user, issue) });
};

/* GET /api/issues/:id/activity */
exports.activity = async (req, res) => {
  const { issue } = await loadIssueFor(req.user, req.params.id);
  const activity = await Activity.find({ issue: issue._id }).sort({ createdAt: -1 }).limit(100).populate('actor', 'name role').lean();

  res.json({ success: true, activity: await withAssigneeNames(activity) });
};
