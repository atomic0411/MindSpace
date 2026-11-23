import { Router } from 'express';
import { Mood } from '../models/Mood.js';
import { Journal } from '../models/Journal.js';
import { Habit } from '../models/Habit.js';
import { HabitLog } from '../models/HabitLog.js';

const router = Router();

async function summary(req, days) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days + 1);
  start.setUTCHours(0,0,0,0);
  const end = new Date();
  const [moods, journalCount, habits, logs] = await Promise.all([
    Mood.find({ userId: req.userId, recordedAt: { $gte: start, $lte: end } }).sort({ recordedAt: 1 }).lean(),
    Journal.countDocuments({ userId: req.userId, entryDate: { $gte: start, $lte: end } }),
    Habit.countDocuments({ userId: req.userId, archivedAt: { $exists: false } }),
    HabitLog.countDocuments({ userId: req.userId, completionDate: { $gte: start.toISOString().slice(0,10), $lte: end.toISOString().slice(0,10) }, completed: true })
  ]);
  const emotionCounts = {};
  moods.forEach(mood => mood.emotions?.forEach(name => { emotionCounts[name] = (emotionCounts[name] || 0) + 1; }));
  return {
    range: { start: start.toISOString(), end: end.toISOString(), days },
    coverage: { moodCheckIns: moods.length, journalEntries: journalCount, activeHabits: habits, habitCompletions: logs, possibleDays: days },
    moods: moods.map(({ score, emotions, recordedAt }) => ({ score, emotions, recordedAt })),
    frequentlySelectedEmotions: Object.entries(emotionCounts).sort((a,b) => b[1]-a[1]).map(([name,count]) => ({ name,count }))
  };
}

router.get('/weekly', async (req, res, next) => {
  try { res.json({ success: true, data: await summary(req, 7) }); } catch (error) { next(error); }
});

router.get('/monthly', async (req, res, next) => {
  try { res.json({ success: true, data: await summary(req, 30) }); } catch (error) { next(error); }
});

export default router;
