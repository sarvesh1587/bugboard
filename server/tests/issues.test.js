const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, startDb, stopDb, clearDb, createUser, auth } = require('./setup');

before(startDb);
after(stopDb);

let admin, dev, dev2, tester, outsider, project;

beforeEach(async () => {
  await clearDb();
  admin = await createUser('admin', 'admin');
  dev = await createUser('developer', 'dev');
  dev2 = await createUser('developer', 'dev2');
  tester = await createUser('tester', 'tester');
  outsider = await createUser('developer', 'outsider');

  const res = await request(app)
    .post('/api/projects')
    .set(auth(admin.token))
    .send({ name: 'Payments', key: 'pay', members: [dev.user.id, dev2.user.id, tester.user.id] });
  project = res.body.project;
});

const createIssue = (who, extra = {}) =>
  request(app)
    .post('/api/issues')
    .set(auth(who.token))
    .send({ project: project._id, title: 'Checkout crashes', description: 'Steps to reproduce…', severity: 'critical', priority: 'urgent', ...extra });

const move = (who, id, status) => request(app).patch(`/api/issues/${id}/status`).set(auth(who.token)).send({ status });

describe('Projects & access control', () => {
  it('uppercases the key and adds the creator as a member', () => {
    assert.equal(project.key, 'PAY');
    assert.ok(project.members.map((m) => m._id).includes(admin.user.id));
  });

  it('only admins can create projects (enforced on the server)', async () => {
    const res = await request(app).post('/api/projects').set(auth(dev.token)).send({ name: 'X', key: 'XX' });
    assert.equal(res.status, 403);
  });

  it('non-members cannot see the project or its issues', async () => {
    const list = await request(app).get('/api/projects').set(auth(outsider.token));
    assert.equal(list.body.projects.length, 0);
    const one = await request(app).get(`/api/projects/${project._id}`).set(auth(outsider.token));
    assert.equal(one.status, 404);

    const { body } = await createIssue(tester);
    const issue = await request(app).get(`/api/issues/${body.issue._id}`).set(auth(outsider.token));
    assert.equal(issue.status, 404);
  });

  it('rejects a duplicate project key with 409', async () => {
    const res = await request(app).post('/api/projects').set(auth(admin.token)).send({ name: 'Other', key: 'PAY' });
    assert.equal(res.status, 409);
  });
});

describe('Issues', () => {
  it('creates sequential keys per project', async () => {
    const a = await createIssue(tester);
    const b = await createIssue(tester);
    assert.equal(a.status, 201);
    assert.equal(a.body.issue.key, 'PAY-1');
    assert.equal(b.body.issue.key, 'PAY-2');
    assert.equal(a.body.issue.reporter.name, 'tester');
  });

  it('rejects an assignee that is not a project member', async () => {
    const res = await createIssue(tester, { assignee: outsider.user.id });
    assert.equal(res.status, 422);
  });

  it('rejects assigning to a tester', async () => {
    const res = await createIssue(admin, { assignee: tester.user.id });
    assert.equal(res.status, 422);
  });

  it('walks the full workflow with the right roles', async () => {
    const { body } = await createIssue(tester, { assignee: dev.user.id });
    const id = body.issue._id;

    assert.equal((await move(dev, id, 'in_progress')).status, 200);
    assert.equal((await move(dev, id, 'testing')).status, 200);
    assert.equal((await move(tester, id, 'resolved')).status, 200);
    const closed = await move(tester, id, 'closed');
    assert.equal(closed.status, 200);
    assert.equal(closed.body.issue.status, 'closed');

    const history = await request(app).get(`/api/issues/${id}/activity`).set(auth(admin.token));
    const statusChanges = history.body.activity.filter((a) => a.type === 'status');
    assert.equal(statusChanges.length, 4);
  });

  it('rejects skipping workflow steps with 422', async () => {
    const { body } = await createIssue(tester, { assignee: dev.user.id });
    const res = await move(admin, body.issue._id, 'closed');
    assert.equal(res.status, 422);
    assert.match(res.body.message, /Invalid transition/);
  });

  it('blocks role-inappropriate transitions with 403', async () => {
    const { body } = await createIssue(tester, { assignee: dev.user.id });
    const id = body.issue._id;
    // tester cannot start work
    assert.equal((await move(tester, id, 'in_progress')).status, 403);
    // another developer cannot move someone else's issue
    assert.equal((await move(dev2, id, 'in_progress')).status, 403);
    await move(dev, id, 'in_progress');
    await move(dev, id, 'testing');
    // developer cannot mark their own fix as resolved
    assert.equal((await move(dev, id, 'resolved')).status, 403);
  });

  it('auto-assigns a developer who starts an unassigned issue', async () => {
    const { body } = await createIssue(tester);
    const res = await move(dev2, body.issue._id, 'in_progress');
    assert.equal(res.status, 200);
    assert.equal(res.body.issue.assignee._id, dev2.user.id);
  });

  it('only reporter/admin can edit fields', async () => {
    const { body } = await createIssue(tester);
    const id = body.issue._id;
    assert.equal((await request(app).patch(`/api/issues/${id}`).set(auth(dev.token)).send({ priority: 'low' })).status, 403);
    const ok = await request(app).patch(`/api/issues/${id}`).set(auth(tester.token)).send({ priority: 'low' });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.issue.priority, 'low');
  });

  it('developers can only self-assign', async () => {
    const { body } = await createIssue(tester);
    const id = body.issue._id;
    const other = await request(app).patch(`/api/issues/${id}/assign`).set(auth(dev.token)).send({ assignee: dev2.user.id });
    assert.equal(other.status, 403);
    const self = await request(app).patch(`/api/issues/${id}/assign`).set(auth(dev.token)).send({ assignee: dev.user.id });
    assert.equal(self.status, 200);
  });

  it('filters, searches and paginates through query params', async () => {
    await createIssue(tester, { title: 'Login button broken', severity: 'low', priority: 'low' });
    await createIssue(tester, { title: 'Crash on payment', assignee: dev.user.id });
    await createIssue(tester, { title: 'Another crash', assignee: dev.user.id, severity: 'high' });

    const crit = await request(app).get('/api/issues?severity=critical').set(auth(dev.token));
    assert.equal(crit.body.issues.length, 1);

    const mine = await request(app).get('/api/issues?assignee=me').set(auth(dev.token));
    assert.equal(mine.body.pagination.total, 2);

    const search = await request(app).get('/api/issues?q=crash').set(auth(dev.token));
    assert.equal(search.body.issues.length, 2);

    const paged = await request(app).get('/api/issues?limit=2&page=2').set(auth(dev.token));
    assert.equal(paged.body.issues.length, 1);
    assert.equal(paged.body.pagination.pages, 2);

    const bad = await request(app).get('/api/issues?status=done').set(auth(dev.token));
    assert.equal(bad.status, 400);
  });

  it('adds comments, records activity and notifies the assignee', async () => {
    const { body } = await createIssue(tester, { assignee: dev.user.id });
    const id = body.issue._id;
    const c = await request(app).post(`/api/issues/${id}/comments`).set(auth(tester.token)).send({ body: 'Any update?' });
    assert.equal(c.status, 201);
    assert.equal(c.body.comment.author.name, 'tester');

    const n = await request(app).get('/api/notifications').set(auth(dev.token));
    assert.equal(n.body.unread, 2); // assigned + comment
  });

  it('dashboard returns counts scoped to the user', async () => {
    await createIssue(tester, { assignee: dev.user.id });
    await createIssue(tester, { severity: 'low' });
    const res = await request(app).get('/api/dashboard').set(auth(dev.token));
    assert.equal(res.status, 200);
    assert.deepEqual({ ...res.body.stats, ...{ total: 2, open: 2, critical: 1, assignedToMe: 1 } }, res.body.stats);
    const outsiderDash = await request(app).get('/api/dashboard').set(auth(outsider.token));
    assert.equal(outsiderDash.body.stats.total, 0);
  });
});
