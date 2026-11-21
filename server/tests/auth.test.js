const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, startDb, stopDb, clearDb, auth } = require('./setup');

before(startDb);
after(stopDb);
afterEach(clearDb);

describe('Auth', () => {
  const body = { name: 'Test Dev', email: 'dev@test.dev', password: 'secret123', role: 'developer' };

  it('registers a user, hashes the password and returns a JWT', async () => {
    const res = await request(app).post('/api/auth/register').send(body);
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.password, undefined);
    assert.equal(res.body.user.role, 'developer');
  });

  it('does not allow registering as admin', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...body, role: 'admin' });
    assert.equal(res.status, 400);
  });

  it('rejects duplicate emails with 409', async () => {
    await request(app).post('/api/auth/register').send(body);
    const res = await request(app).post('/api/auth/register').send(body);
    assert.equal(res.status, 409);
  });

  it('returns field level validation errors', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'nope', password: '1' });
    assert.equal(res.status, 400);
    const fields = res.body.details.map((d) => d.field);
    for (const f of ['body.name', 'body.email', 'body.password']) assert.ok(fields.includes(f), `missing ${f}`);
  });

  it('logs in with valid credentials and rejects wrong password', async () => {
    await request(app).post('/api/auth/register').send(body);
    const ok = await request(app).post('/api/auth/login').send({ email: body.email, password: body.password });
    assert.equal(ok.status, 200);
    const bad = await request(app).post('/api/auth/login').send({ email: body.email, password: 'wrong' });
    assert.equal(bad.status, 401);
  });

  it('protects routes and returns the current user from /me', async () => {
    assert.equal((await request(app).get('/api/auth/me')).status, 401);
    assert.equal((await request(app).get('/api/auth/me').set(auth('garbage'))).status, 401);
    const { body: reg } = await request(app).post('/api/auth/register').send(body);
    const me = await request(app).get('/api/auth/me').set(auth(reg.token));
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, body.email);
  });
});
