import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  displayName: { type: String, required: true, trim: true },
  preferences: {
    timezone: { type: String, default: 'UTC' },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    remindersEnabled: { type: Boolean, default: false }
  },
  encryptionMetadata: {
    algorithm: String,
    version: Number,
    salt: String,
    wrappedDek: String,
    wrappedDekIv: String
  },
  passwordResetTokenHash: String,
  passwordResetExpiresAt: Date
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
