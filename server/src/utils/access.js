const Project = require('../models/Project');
const Issue = require('../models/Issue');
const ApiError = require('./ApiError');
const { ROLES } = require('./constants');

const isAdmin = (user) => user.role === ROLES.ADMIN;

/** Mongo filter for projects the user may see */
const projectScope = (user) => (isAdmin(user) ? {} : { members: user._id });

/** IDs of all projects visible to the user (used to scope issue queries) */
async function visibleProjectIds(user) {
  const projects = await Project.find(projectScope(user)).select('_id').lean();
  return projects.map((p) => p._id);
}

/**
 * Loads a project the user is allowed to access.
 * Non-members get 404 (not 403) so project existence is not leaked.
 */
async function loadProjectFor(user, projectId) {
  const project = await Project.findById(projectId);
  if (!project || (!isAdmin(user) && !project.hasMember(user._id))) {
    throw ApiError.notFound('Project not found');
  }
  return project;
}

/** Loads an issue + its project, enforcing project membership */
async function loadIssueFor(user, issueId) {
  const issue = await Issue.findById(issueId);
  if (!issue) throw ApiError.notFound('Issue not found');
  const project = await Project.findById(issue.project);
  if (!project || (!isAdmin(user) && !project.hasMember(user._id))) {
    throw ApiError.notFound('Issue not found');
  }
  return { issue, project };
}

module.exports = { isAdmin, projectScope, visibleProjectIds, loadProjectFor, loadIssueFor };
