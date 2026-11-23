import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, maxlength: 120 },
  ciphertext: String,
  iv: String,
  encryptionVersion: { type: Number, enum: [1] },
  targetDate: Date,
  status: { type: String, enum: ['active','completed','paused'], default: 'active' }
}, { timestamps: true });

export const Goal = mongoose.model('Goal', goalSchema);
