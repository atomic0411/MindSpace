import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { Journal } from '../models/Journal.js';
import { Mood } from '../models/Mood.js';
import { Habit } from '../models/Habit.js';
import { HabitLog } from '../models/HabitLog.js';
import { Goal } from '../models/Goal.js';

const router = Router();

function validate(schema, body) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw Object.assign(new Error(parsed.error.issues[0]?.message || 'Invalid input.'), { status: 400 });
  return parsed.data;
}

router.get('/', async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('displayName preferences');
    res.json({ success: true, data: { settings: user } });
  } catch (error) { next(error); }
});

router.put('/', async (req, res, next) => {
  try {
    const data = validate(z.object({
      displayName: z.string().trim().min(1).max(80).optional(),
      preferences: z.object({
        timezone: z.string().max(100).optional(),
        theme: z.enum(['light', 'dark', 'system']).optional(),
        remindersEnabled: z.boolean().optional()
      }).strict().optional()
    }).strict(), req.body);
    const user = await User.findById(req.userId);
    if (data.displayName) user.displayName = data.displayName;
    if (data.preferences) user.preferences = { ...user.preferences.toObject(), ...data.preferences };
    await user.save();
    res.json({ success: true, data: { settings: { displayName: user.displayName, preferences: user.preferences } } });
  } catch (error) { next(error); }
});

router.delete('/account', async (req, res, next) => {
  try {
    await Promise.all([
      Session.deleteMany({ userId: req.userId }),
      Journal.deleteMany({ userId: req.userId }),
      Mood.deleteMany({ userId: req.userId }),
      Habit.deleteMany({ userId: req.userId }),
      HabitLog.deleteMany({ userId: req.userId }),
      Goal.deleteMany({ userId: req.userId }),
      User.findByIdAndDelete(req.userId)
    ]);
    res.clearCookie('mindspace_session', { path: '/' });
    res.json({
      success: true,
      data: {
        deleted: true,
        backupRetention: 'Encrypted backups, if configured, may remain for up to 30 days before permanent purge.'
      }
    });
  } catch (error) { next(error); }
});

export default router;
