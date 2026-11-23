import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { Journal } from '../src/models/Journal.js';

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
  await Promise.all([User.deleteMany({}), Session.deleteMany({}), Journal.deleteMany({})]);
});

async function register(agent, email) {
  const csrf = await agent.get('/api/auth/csrf');
  let token = csrf.headers['set-cookie']?.[0]?.match(/mindspace_csrf=([^;]+)/)?.[1];
  if (!token) {
    const response = await agent.post('/api/auth/login').set('X-CSRF-Token', 'missing').send({});
    void response;
  }
  const response = await agent.post('/api/auth/register')
    .set('X-CSRF-Token', token)
    .send({ email, password: 'A-secure-password-2026', displayName: 'Test User' });
  if (response.status !== 201) throw new Error(response.body.error?.message || 'Registration failed');
  return response;
}

function envelope() {
  return {
    ciphertext: 'YQ'.repeat(24),
    iv: 'AAAAAAAAAAAAAAAA',
    encryptionVersion: 1,
    entryDate: '2026-11-23T12:00:00.000Z'
  };
}

function csrfFrom(response) {
  return response.headers['set-cookie']
    ?.find(cookie => cookie.startsWith('mindspace_csrf='))
    ?.match(/mindspace_csrf=([^;]+)/)?.[1];
}

describe('journal ciphertext API', () => {
  it('creates and lists only the authenticated owner entries', async () => {
    const agent = request.agent(app);
    const registration = await register(agent, 'owner@example.com');
    const token = csrfFrom(registration);

    const created = await agent.post('/api/journals')
      .set('X-CSRF-Token', token)
      .send(envelope());
    expect(created.status).toBe(201);
    expect(created.body.data.entry.ciphertext).toBeTruthy();

    const listed = await agent.get('/api/journals');
    expect(listed.status).toBe(200);
    expect(listed.body.data.entries).toHaveLength(1);
  });

  it('rejects plaintext journal fields', async () => {
    const agent = request.agent(app);
    const registration = await register(agent, 'plaintext@example.com');
    const token = csrfFrom(registration);
    const result = await agent.post('/api/journals')
      .set('X-CSRF-Token', token)
      .send({ ...envelope(), body: 'plain text must never be accepted' });
    expect(result.status).toBe(400);
  });

  it('rejects cross-account read and deletion', async () => {
    const owner = request.agent(app);
    const ownerRegistration = await register(owner, 'owner2@example.com');
    let token = csrfFrom(ownerRegistration);
    const created = await owner.post('/api/journals').set('X-CSRF-Token', token).send(envelope());

    const other = request.agent(app);
    const otherRegistration = await register(other, 'other@example.com');
    token = csrfFrom(otherRegistration);

    const update = await other.put(`/api/journals/${created.body.data.entry._id}`)
      .set('X-CSRF-Token', token)
      .send(envelope());
    const removed = await other.delete(`/api/journals/${created.body.data.entry._id}`)
      .set('X-CSRF-Token', token);
    expect(update.status).toBe(404);
    expect(removed.status).toBe(404);
  });
});
