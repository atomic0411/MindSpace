import { randomToken, sha256 } from '../utils/envelope.js';

export function issueCsrf(req, res) {
  let token = req.cookies?.mindspace_csrf;
  if (!token) {
    token = randomToken();
    res.cookie('mindspace_csrf', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
  }
  res.locals.csrfToken = token;
  return token;
}

export function requireCsrf(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const cookieToken = req.cookies?.mindspace_csrf;
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken || sha256(cookieToken) !== sha256(headerToken)) {
    return res.status(403).json({ success: false, error: { code: 'CSRF_REJECTED', message: 'Please refresh and try again.' } });
  }
  next();
}
