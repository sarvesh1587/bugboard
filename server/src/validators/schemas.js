const { z } = require('zod');
const { ROLES, SEVERITIES, PRIORITIES, STATUSES } = require('../utils/constants');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParam = z.object({ id: objectId });

// Comma separated enum lists in query strings: ?status=open,testing
const csvEnum = (values) =>
  z
    .string()
    .transform((s) => s.split(',').map((v) => v.trim()).filter(Boolean))
    .pipe(z.array(z.enum(values)).min(1));

/* ---------- auth ---------- */
const register = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: z.email('Invalid email').transform((e) => e.toLowerCase()),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  // Admin can't be self-assigned at signup — only promoted by an existing admin
  role: z.enum([ROLES.DEVELOPER, ROLES.TESTER]).default(ROLES.DEVELOPER),
});

const login = z.object({
  email: z.email('Invalid email').transform((e) => e.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

/* ---------- users ---------- */
const updateRole = z.object({ role: z.enum(Object.values(ROLES)) });

/* ---------- projects ---------- */
const projectBase = {
  name: z.string().trim().min(2).max(80),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]{1,5}$/, 'Key must be 2–6 characters, letters/digits, starting with a letter'),
  description: z.string().trim().max(2000).optional().default(''),
  members: z.array(objectId).max(200).optional().default([]),
};
const createProject = z.object(projectBase);
const updateProject = z
  .object({
    name: projectBase.name.optional(),
    description: z.string().trim().max(2000).optional(),
    members: z.array(objectId).max(200).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, 'Nothing to update');

/* ---------- issues ---------- */
const createIssue = z.object({
  project: objectId,
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(160),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(10000),
  severity: z.enum(SEVERITIES).default('medium'),
  priority: z.enum(PRIORITIES).default('medium'),
  assignee: objectId.nullable().optional(),
});

const updateIssue = z
  .object({
    title: createIssue.shape.title.optional(),
    description: createIssue.shape.description.optional(),
    severity: z.enum(SEVERITIES).optional(),
    priority: z.enum(PRIORITIES).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, 'Nothing to update');

const changeStatus = z.object({ status: z.enum(STATUSES) });
const assign = z.object({ assignee: objectId.nullable() });

const listIssues = z.object({
  project: objectId.optional(),
  status: csvEnum(STATUSES).optional(),
  priority: csvEnum(PRIORITIES).optional(),
  severity: csvEnum(SEVERITIES).optional(),
  reporter: z.union([objectId, z.literal('me')]).optional(),
  assignee: z.union([objectId, z.literal('me'), z.literal('none')]).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z
    .enum(['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'priority', '-priority', 'severity', '-severity', 'number', '-number'])
    .default('-updatedAt'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

const comment = z.object({ body: z.string().trim().min(1, 'Comment cannot be empty').max(5000) });

module.exports = {
  objectId,
  idParam,
  register,
  login,
  updateRole,
  createProject,
  updateProject,
  createIssue,
  updateIssue,
  changeStatus,
  assign,
  listIssues,
  comment,
};
