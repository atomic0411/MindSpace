import { Router } from 'express';
import { z } from 'zod';
import { Journal } from '../models/Journal.js';

const router = Router();
const envelopeSchema = z.object({
  ciphertext: z.string().min(32).max(1_500_000),
  iv: z.string().length(16),
  encryptionVersion: z.literal(1),
  entryDate: z.string().datetime().optional()
}).strict();

function validate(schema, body) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw Object.assign(new Error(parsed.error.issues[0]?.message || 'Invalid input.'), { status: 400 });
  return parsed.data;
}

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      Journal.find({ userId: req.userId }).sort({ entryDate: -1 }).skip(skip).limit(limit).lean(),
      Journal.countDocuments({ userId: req.userId })
    ]);
    res.json({ success: true, data: { entries, pagination: { page, limit, total } } });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = validate(envelopeSchema, req.body);
    const entry = await Journal.create({
      userId: req.userId,
      ciphertext: data.ciphertext,
      iv: data.iv,
      encryptionVersion: data.encryptionVersion,
      entryDate: data.entryDate ? new Date(data.entryDate) : new Date()
    });
    res.status(201).json({ success: true, data: { entry } });
  } catch (error) { next(error); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = validate(envelopeSchema, req.body);
    const entry = await Journal.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ciphertext: data.ciphertext, iv: data.iv, encryptionVersion: data.encryptionVersion, entryDate: data.entryDate ? new Date(data.entryDate) : undefined },
      { new: true, runValidators: true }
    );
    if (!entry) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Journal entry not found.' } });
    res.json({ success: true, data: { entry } });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const entry = await Journal.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!entry) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Journal entry not found.' } });
    res.json({ success: true, data: { deleted: true } });
  } catch (error) { next(error); }
});

export default router;
