const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 32,
    },
    title: { type: String, default: 'Meeting', trim: true, maxlength: 120 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Meeting', meetingSchema);
