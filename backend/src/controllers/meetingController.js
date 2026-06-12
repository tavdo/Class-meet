const fs = require('fs');
const { body, param, query } = require('express-validator');
const { customAlphabet } = require('nanoid');
const { prisma } = require('../db');

const nanoidRoom = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 12);

const createValidators = [
  body('title').optional().trim().isLength({ max: 120 }).withMessage('Title too long'),
];

async function createMeeting(req, res, next) {
  try {
    let roomId = nanoidRoom();
    // Extremely unlikely collision loop
    for (let i = 0; i < 5; i += 1) {
      const exists = await prisma.meeting.findUnique({ where: { roomId }, select: { id: true } });
      if (!exists) break;
      roomId = nanoidRoom();
    }
    const meeting = await prisma.meeting.create({
      data: {
        roomId,
        title: req.body.title?.trim() || 'Meeting',
        createdById: req.user.userId,
      },
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
    const meeting = await prisma.meeting.findUnique({
      where: { roomId },
      include: { createdBy: { select: { displayName: true } } },
    });
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
    const meeting = await prisma.meeting.findUnique({ where: { roomId }, select: { id: true } });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const ordered = messages.reverse().map((m) => ({
      id: m.id,
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
    const meeting = await prisma.meeting.findUnique({ where: { roomId }, select: { id: true } });
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
