process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

let mongo;

// Uses an in-memory MongoDB by default. Set MONGO_TEST_URI to run against
// a real instance instead (e.g. in CI or Docker).
async function startDb() {
  let uri = process.env.MONGO_TEST_URI;
  if (!uri) {
    mongo = await MongoMemoryServer.create();
    uri = mongo.getUri();
  }
  await mongoose.connect(uri);
}

async function stopDb() {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}

async function clearDb() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

/** Creates a user directly (so we can create admins) and returns { user, token } */
async function createUser(role, name = role) {
  const email = `${name}-${Math.random().toString(36).slice(2, 8)}@test.dev`;
  const user = await User.create({ name, email, password: 'secret123', role });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'secret123' });
  return { user, token: res.body.token };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { app, request, startDb, stopDb, clearDb, createUser, auth };
