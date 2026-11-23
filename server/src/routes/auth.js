import { Router } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { requireAuth } from '../middleware/auth.js';
import { issueCsrf } from '../middleware/csrf.js';
import { cookieOptions, randomToken, sha256 } from '../utils/envelope.js';

const router = Router();

function validate(schema, body) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const error = new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    error.status = 400;
    throw error;
  }
  return parsed.data;
}

async function createSession(res, user) {
  const token = randomToken();
  await Session.create({
    tokenHash: sha256(token),
    userId: user._id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  res.cookie('mindspace_session', token, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
  return issueCsrf({ cookies: {} }, res);
}

router.post('/register', async (req, res, next) => {
  try {
    const data = validate(z.object({
      email: z.string().email().max(254),
      password: z.string().min(12).max(128),
      displayName: z.string().trim().min(1).max(80)
    }), req.body);
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      const error = new Error('An account with this email already exists.');
      error.status = 409;
      throw error;
    }
    const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 3, parallelism: 1 });
    const user = await User.create({ email: data.email, passwordHash, displayName: data.displayName });
    await createSession(res, user);
    res.status(201).json({
      success: true,
      data: { user: { id: user.id, email: user.email, displayName: user.displayName, preferences: user.preferences, encryptionMetadata: user.encryptionMetadata } }
    });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const data = validate(z.object({ email: z.string().email(), password: z.string().min(1).max(128) }), req.body);
    const user = await User.findOne({ email: data.email.toLowerCase() });
    const ok = user ? await argon2.verify(user.passwordHash, data.password) : false;
    if (!ok) {
      await argon2.verify('$argon2id$v=19$m=19456,t=3,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', data.password).catch(() => {});
      const error = new Error('Email or password is incorrect.');
      error.status = 401;
      throw error;
    }
    await createSession(res, user);
    res.json({
      success: true,
      data: { user: { id: user.id, email: user.email, displayName: user.displayName, preferences: user.preferences, encryptionMetadata: user.encryptionMetadata } }
    });
  } catch (error) { next(error); }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await Session.deleteOne({ _id: req.session._id });
    res.clearCookie('mindspace_session', cookieOptions());
    res.json({ success: true, data: { loggedOut: true } });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash -passwordResetTokenHash');
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Account not found.' } });
    res.json({ success: true, data: { user } });
  } catch (error) { next(error); }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const data = validate(z.object({ email: z.string().email() }), req.body);
    const user = await User.findOne({ email: data.email.toLowerCase() });
    if (user) {
      const resetToken = randomToken();
      user.passwordResetTokenHash = sha256(resetToken);
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      // Intentionally do not expose the reset token over the API. A mail adapter should deliver it.
      if (process.env.NODE_ENV !== 'production') console.info('Password reset requested:', user.email);
    }
    res.json({ success: true, data: { message: 'If an account exists, password reset instructions will be sent.' } });
  } catch (error) { next(error); }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const data = validate(z.object({ token: z.string().min(20), password: z.string().min(12).max(128) }), req.body);
    const tokenHash = sha256(data.token);
    const user = await User.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() } });
    if (!user) {
      const error = new Error('The reset link is invalid or has expired.');
      error.status = 400;
      throw error;
    }
    user.passwordHash = await argon2.hash(data.password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 3, parallelism: 1 });
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();
    await Session.deleteMany({ userId: user._id });
    res.json({ success: true, data: { message: 'Password updated. Please sign in again.' } });
  } catch (error) { next(error); }
});

router.put('/encryption', requireAuth, async (req, res, next) => {
  try {
    const data = validate(z.object({
      algorithm: z.literal('AES-256-GCM'),
      version: z.literal(1),
      salt: z.string().min(16).max(128),
      wrappedDek: z.string().min(32).max(4096),
      wrappedDekIv: z.string().length(16)
    }).strict(), req.body);
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Account not found.' } });
    if (user.encryptionMetadata?.wrappedDek) {
      const error = new Error('Encryption metadata is already configured.');
      error.status = 409;
      throw error;
    }
    user.encryptionMetadata = data;
    await user.save();
    res.json({ success: true, data: { encryptionMetadata: user.encryptionMetadata } });
  } catch (error) { next(error); }
});

export default router;
