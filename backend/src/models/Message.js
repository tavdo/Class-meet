const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true, maxlength: 80 },
    senderRole: { type: String, enum: ['teacher', 'student'], required: true },
    body: { type: String, required: true, maxlength: 4000 },
  },
  { timestamps: true }
);

messageSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
