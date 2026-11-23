import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import journalRoutes from './routes/journals.js';
import moodRoutes from './routes/moods.js';
import habitRoutes from './routes/habits.js';
import aiRoutes from './routes/ai.js';
import insightsRoutes from './routes/insights.js';
import { requireAuth } from './middleware/auth.js';
import { requireCsrf, issueCsrf } from './middleware/csrf.js';
import { errorHandler, notFound } from './middleware/errors.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'same-origin' },
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
  }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origin === process.env.CLIENT_ORIGIN) return callback(null, true);
      callback(new Error('Origin not allowed'));
    },
    credentials: true
  }));
  app.use(express.json({ limit: '512kb' }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.path === '/api/auth/csrf') issueCsrf(req, res);
    next();
  });
  app.get('/api/auth/csrf', (req, res) => res.json({ success: true, data: { csrfReady: true } }));
  app.use('/api/auth', requireCsrf, authRoutes);
  app.use('/api/settings', requireAuth, requireCsrf, settingsRoutes);
  app.use('/api/journals', requireAuth, requireCsrf, journalRoutes);
  app.use('/api/moods', requireAuth, requireCsrf, moodRoutes);
  app.use('/api/habits', requireAuth, requireCsrf, habitRoutes);
  app.use('/api/ai', requireAuth, requireCsrf, aiRoutes);
  app.use('/api/insights', requireAuth, requireCsrf, insightsRoutes);

  app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
