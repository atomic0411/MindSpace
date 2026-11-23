import { Session } from '../models/Session.js';
import { sha256 } from '../utils/envelope.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies?.mindspace_session;
  if (!token) return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } });

  const session = await Session.findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } });
  if (!session) return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } });
  req.userId = session.userId.toString();
  req.session = session;
  next();
}
