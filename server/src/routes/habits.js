import { Router } from 'express';
import { z } from 'zod';
import { Habit } from '../models/Habit.js';
import { HabitLog } from '../models/HabitLog.js';
import { Goal } from '../models/Goal.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const habits = await Habit.find({ userId: req.userId, archivedAt: { $exists: false } }).sort({ createdAt: -1 }).lean();
    const logs = await HabitLog.find({ userId: req.userId }).sort({ completionDate: -1 }).limit(500).lean();
    const goals = await Goal.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: { habits, logs, goals } });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = z.object({ name: z.string().trim().min(1).max(100), frequency: z.array(z.number().int().min(0).max(6)).min(1).max(7) }).strict().safeParse(req.body);
    if (!parsed.success) throw Object.assign(new Error(parsed.error.issues[0]?.message || 'Invalid input.'), { status: 400 });
    const habit = await Habit.create({ userId: req.userId, ...parsed.data });
    res.status(201).json({ success: true, data: { habit } });
  } catch (error) { next(error); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const parsed = z.object({ name: z.string().trim().min(1).max(100).optional(), frequency: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(), archive: z.boolean().optional() }).strict().safeParse(req.body);
    if (!parsed.success) throw Object.assign(new Error(parsed.error.issues[0]?.message || 'Invalid input.'), { status: 400 });
    const update = { ...parsed.data };
    if (update.archive) update.archivedAt = new Date();
    delete update.archive;
    const habit = await Habit.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, update, { new: true, runValidators: true });
    if (!habit) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Habit not found.' } });
    res.json({ success: true, data: { habit } });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!habit) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Habit not found.' } });
    await HabitLog.deleteMany({ userId: req.userId, habitId: habit._id });
    res.json({ success: true, data: { deleted: true } });
  } catch (error) { next(error); }
});

router.post('/logs', async (req, res, next) => {
  try {
    const parsed = z.object({ habitId: z.string(), completionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), completed: z.boolean() }).strict().safeParse(req.body);
    if (!parsed.success) throw Object.assign(new Error(parsed.error.issues[0]?.message || 'Invalid input.'), { status: 400 });
    const owned = await Habit.findOne({ _id: parsed.data.habitId, userId: req.userId });
    if (!owned) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Habit not found.' } });
    const log = await HabitLog.findOneAndUpdate(
      { userId: req.userId, habitId: owned._id, completionDate: parsed.data.completionDate },
      { completed: parsed.data.completed },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    res.json({ success: true, data: { log } });
  } catch (error) { next(error); }
});

router.post('/goals', async (req, res, next) => {
  try {
    const parsed = z.object({ title: z.string().trim().min(1).max(120), targetDate: z.string().datetime().optional(), status: z.enum(['active','completed','paused']).optional() }).strict().safeParse(req.body);
    if (!parsed.success) throw Object.assign(new Error(parsed.error.issues[0]?.message || 'Invalid input.'), { status: 400 });
    const goal = await Goal.create({ userId: req.userId, title: parsed.data.title, targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : undefined, status: parsed.data.status || 'active' });
    res.status(201).json({ success: true, data: { goal } });
  } catch (error) { next(error); }
});

export default router;
