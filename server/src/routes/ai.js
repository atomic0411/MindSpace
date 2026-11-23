import { Router } from 'express';
import { z } from 'zod';
import { GeminiProvider } from '../services/ai/GeminiProvider.js';
import { MockProvider } from '../services/ai/MockProvider.js';
import { assessCrisis, crisisResponse } from '../services/ai/safety.js';

const router = Router();
const provider = process.env.GEMINI_API_KEY
  ? new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL })
  : new MockProvider();

router.post('/chat', async (req, res, next) => {
  try {
    const parsed = z.object({
      message: z.string().trim().min(1).max(4000),
      mode: z.enum(['Talk','Reflect','Unwind','Reframe','Journal Companion']).default('Talk'),
      sharedJournalText: z.string().max(4000).optional(),
      consentConfirmed: z.boolean().optional()
    }).strict().safeParse(req.body);
    if (!parsed.success) throw Object.assign(new Error(parsed.error.issues[0]?.message || 'Invalid input.'), { status: 400 });
    if (parsed.data.sharedJournalText && parsed.data.consentConfirmed !== true) {
      throw Object.assign(new Error('Explicit consent is required before selected journal text can be shared.'), { status: 400 });
    }
    if (assessCrisis(parsed.data.message) || (parsed.data.sharedJournalText && assessCrisis(parsed.data.sharedJournalText))) {
      return res.json({ success: true, data: { response: crisisResponse(), safety: 'crisis', provider: 'safety-layer' } });
    }
    let response;
    try {
      response = await provider.chat(parsed.data);
    } catch (error) {
      console.error('AI provider request failed', {
        provider: process.env.GEMINI_API_KEY ? 'gemini' : 'mock',
        errorName: error?.name || 'Error',
        errorCode: error?.code ?? null,
        errorStatus: error?.status ?? null
      });
      return res.status(503).json({ success: false, error: { code: 'AI_UNAVAILABLE', message: 'The AI companion is unavailable. You can still journal, track moods and use mindfulness tools.' } });
    }
    res.json({ success: true, data: { response, safety: 'general', provider: process.env.GEMINI_API_KEY ? 'gemini' : 'mock' } });
  } catch (error) { next(error); }
});

export default router;
