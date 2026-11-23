import mongoose from 'mongoose';

const journalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ciphertext: { type: String, required: true },
  iv: { type: String, required: true },
  encryptionVersion: { type: Number, required: true, enum: [1] },
  entryDate: { type: Date, required: true, default: Date.now }
}, { timestamps: true });

journalSchema.index({ userId: 1, entryDate: -1 });

export const Journal = mongoose.model('Journal', journalSchema);
