const fs = require('fs');
const { body, param, query } = require('express-validator');
const { customAlphabet } = require('nanoid');
const Meeting = require('../models/Meeting');
const Message = require('../models/Message');

const nanoidRoom = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 12);

const createValidators = [
  body('title').optional().trim().isLength({ max: 120 }).withMessage('Title too long'),
];

async function createMeeting(req, res, next) {
  try {
    let roomId = nanoidRoom();
    // Extremely unlikely collision loop
    for (let i = 0; i < 5; i += 1) {
      const exists = await Meeting.exists({ roomId });
      if (!exists) break;
      roomId = nanoidRoom();
    }
    const meeting = await Meeting.create({
      roomId,
      title: req.body.title?.trim() || 'Meeting',
      createdBy: req.user.userId,
    });
    return res.status(201).json({
      meeting: {
        roomId: meeting.roomId,
        title: meeting.title,
        createdAt: meeting.createdAt,
      },
    });
  } catch (e) {
    return next(e);
  }
}

const getValidators = [param('roomId').trim().isLength({ min: 8, max: 32 })];

async function getMeeting(req, res, next) {
  try {
    const { roomId } = req.params;
    const meeting = await Meeting.findOne({ roomId }).populate('createdBy', 'displayName email');
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    return res.json({
      meeting: {
        roomId: meeting.roomId,
        title: meeting.title,
        createdAt: meeting.createdAt,
        host: meeting.createdBy
          ? {
              displayName: meeting.createdBy.displayName,
            }
          : null,
      },
    });
  } catch (e) {
    return next(e);
  }
}

const messagesValidators = [
  param('roomId').trim().isLength({ min: 8, max: 32 }),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

async function listMessages(req, res, next) {
  try {
    const { roomId } = req.params;
    const limit = req.query.limit || 50;
    const meeting = await Meeting.findOne({ roomId }).select('_id');
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    const messages = await Message.find({ roomId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    const ordered = messages.reverse().map((m) => ({
      id: m._id,
      roomId: m.roomId,
      body: m.body,
      senderName: m.senderName,
      senderRole: m.senderRole,
      senderId: m.senderId,
      attachment: m.attachment || null,
      createdAt: m.createdAt,
    }));
    return res.json({ messages: ordered });
  } catch (e) {
    return next(e);
  }
}

const uploadValidators = [param('roomId').trim().isLength({ min: 8, max: 32 })];

async function uploadAttachment(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const { roomId } = req.params;
    const meeting = await Meeting.findOne({ roomId }).select('_id');
    if (!meeting) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Meeting not found' });
    }
    return res.status(201).json({
      attachment: {
        url: `/uploads/attachments/${req.file.filename}`,
        name: req.file.originalname,
        size: req.file.size,
        mime: req.file.mimetype,
      },
    });
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  createValidators,
  createMeeting,
  getValidators,
  getMeeting,
  messagesValidators,
  listMessages,
  uploadValidators,
  uploadAttachment,
};
