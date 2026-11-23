import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';

let mongo;
let app;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Session.deleteMany({});
});

async function register(agent, overrides = {}) {
  const csrf = await agent.get('/api/auth/csrf');
  const token = csrf.headers['set-cookie'][0].match(/mindspace_csrf=([^;]+)/)?.[1];
  const input = {
    email: 'person@example.com',
    password: 'A-secure-password-2026',
    displayName: 'Morgan',
    ...overrides
  };
  return agent.post('/api/auth/register').set('X-CSRF-Token', token).send(input);
}

describe('authentication', () => {
  it('registers, creates a session and retrieves the account', async () => {
    const agent = request.agent(app);
    const response = await register(agent);
    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe('person@example.com');
    expect(response.body.data.user).not.toHaveProperty('passwordHash');

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.displayName).toBe('Morgan');
  });

  it('stores only an Argon2 password hash', async () => {
    await register(request.agent(app));
    const user = await User.findOne({ email: 'person@example.com' });
    expect(user.passwordHash).toMatch(/^\$argon2(id)?\$/);
  });

  it('rejects duplicate email registration', async () => {
    await register(request.agent(app));
    const second = await register(request.agent(app));
    expect(second.status).toBe(409);
  });

  it('rejects invalid login credentials', async () => {
    await register(request.agent(app));
    const agent = request.agent(app);
    const csrf = await agent.get('/api/auth/csrf');
    const token = csrf.headers['set-cookie'][0].match(/mindspace_csrf=([^;]+)/)?.[1];
    const response = await agent.post('/api/auth/login').set('X-CSRF-Token', token).send({
      email: 'person@example.com',
      password: 'wrong-password'
    });
    expect(response.status).toBe(401);
  });

  it('logs out and invalidates the session', async () => {
    const agent = request.agent(app);
    const registered = await register(agent);
    const token = registered.headers['set-cookie']
      ?.find(cookie => cookie.startsWith('mindspace_csrf='))
      ?.match(/mindspace_csrf=([^;]+)/)?.[1];
    await agent.post('/api/auth/logout').set('X-CSRF-Token', token).send({});
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });

  it('rejects unauthenticated settings access', async () => {
    const response = await request(app).get('/api/settings');
    expect(response.status).toBe(401);
  });
});
