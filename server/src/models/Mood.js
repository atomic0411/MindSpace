import mongoose from 'mongoose';

const moodSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  score: { type: Number, required: true, min: 1, max: 5 },
  intensity: { type: Number, min: 1, max: 5 },
  emotions: [{ type: String, enum: ['happy','calm','excited','motivated','grateful','anxious','stressed','lonely','sad','frustrated','overwhelmed','tired'] }],
  ciphertext: { type: String, default: '' },
  iv: { type: String, default: '' },
  encryptionVersion: { type: Number, enum: [1] },
  recordedAt: { type: Date, required: true, default: Date.now }
}, { timestamps: true });

moodSchema.index({ userId: 1, recordedAt: -1 });

export const Mood = mongoose.model('Mood', moodSchema);
