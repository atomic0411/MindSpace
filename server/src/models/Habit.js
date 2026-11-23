import mongoose from 'mongoose';

const habitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  frequency: { type: [Number], default: [0,1,2,3,4,5,6] },
  archivedAt: Date
}, { timestamps: true });

export const Habit = mongoose.model('Habit', habitSchema);
