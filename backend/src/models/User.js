const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    role: {
      type: String,
      enum: ['teacher', 'student'],
      required: true,
    },
    avatarUrl: { type: String, default: '', maxlength: 512 },
    bio: { type: String, default: '', trim: true, maxlength: 280 },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
