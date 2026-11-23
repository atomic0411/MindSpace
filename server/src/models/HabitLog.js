import mongoose from 'mongoose';

const habitLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  habitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', required: true, index: true },
  completionDate: { type: String, required: true },
  completed: { type: Boolean, default: true }
}, { timestamps: true });

habitLogSchema.index({ userId: 1, habitId: 1, completionDate: 1 }, { unique: true });
export const HabitLog = mongoose.model('HabitLog', habitLogSchema);
