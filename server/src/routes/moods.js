import { Router } from 'express';
import { z } from 'zod';
import { Mood } from '../models/Mood.js';

const router = Router();
const emotions = ['happy','calm','excited','motivated','grateful','anxious','stressed','lonely','sad','frustrated','overwhelmed','tired'];

router.get('/', async (req, res, next) => {
  try {
    const entries = await Mood.find({ userId: req.userId }).sort({ recordedAt: -1 }).limit(366).lean();
    res.json({ success: true, data: { entries } });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = z.object({
      score: z.number().int().min(1).max(5),
      intensity: z.number().int().min(1).max(5).optional(),
      emotions: z.array(z.enum(emotions)).max(12).optional(),
      ciphertext: z.string().max(1_500_000).optional(),
      iv: z.string().max(64).optional(),
      encryptionVersion: z.literal(1).optional(),
      recordedAt: z.string().datetime().optional()
    }).strict().safeParse(req.body);
    if (!parsed.success) throw Object.assign(new Error(parsed.error.issues[0]?.message || 'Invalid input.'), { status: 400 });
    if (parsed.data.ciphertext && !parsed.data.iv) throw Object.assign(new Error('Encrypted notes require an IV.'), { status: 400 });
    const entry = await Mood.create({ userId: req.userId, ...parsed.data, recordedAt: parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : new Date() });
    res.status(201).json({ success: true, data: { entry } });
  } catch (error) { next(error); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const parsed = z.object({
      score: z.number().int().min(1).max(5).optional(),
      intensity: z.number().int().min(1).max(5).optional(),
      emotions: z.array(z.enum(emotions)).max(12).optional(),
      ciphertext: z.string().max(1_500_000).optional(),
      iv: z.string().max(64).optional(),
      encryptionVersion: z.literal(1).optional(),
      recordedAt: z.string().datetime().optional()
    }).strict().safeParse(req.body);
    if (!parsed.success) throw Object.assign(new Error(parsed.error.issues[0]?.message || 'Invalid input.'), { status: 400 });
    const update = { ...parsed.data };
    if (update.recordedAt) update.recordedAt = new Date(update.recordedAt);
    const entry = await Mood.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, update, { new: true, runValidators: true });
    if (!entry) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mood check-in not found.' } });
    res.json({ success: true, data: { entry } });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const entry = await Mood.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!entry) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mood check-in not found.' } });
    res.json({ success: true, data: { deleted: true } });
  } catch (error) { next(error); }
});

export default router;
