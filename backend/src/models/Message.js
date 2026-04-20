const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, maxlength: 512 },
    name: { type: String, required: true, maxlength: 255 },
    size: { type: Number, required: true, min: 0 },
    mime: { type: String, required: true, maxlength: 120 },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true, maxlength: 80 },
    senderRole: { type: String, enum: ['teacher', 'student'], required: true },
    body: { type: String, default: '', maxlength: 4000 },
    attachment: { type: attachmentSchema, default: null },
  },
  { timestamps: true }
);

// Require at least text body or an attachment.
messageSchema.pre('validate', function ensureContent(next) {
  if (!this.body?.trim() && !this.attachment) {
    return next(new Error('Message must have body or attachment'));
  }
  return next();
});

messageSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
