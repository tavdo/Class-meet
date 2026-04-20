const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { customAlphabet } = require('nanoid');

const safeId = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 16);

const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');
const ATTACHMENTS_DIR = path.join(UPLOADS_ROOT, 'attachments');
const AVATARS_DIR = path.join(UPLOADS_ROOT, 'avatars');

[UPLOADS_ROOT, ATTACHMENTS_DIR, AVATARS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3 MB

// Block clearly dangerous executable/script mime types. Allow everything else.
const BLOCKED_MIME_PREFIXES = [
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-sh',
  'application/x-bat',
  'application/x-executable',
  'application/x-dosexec',
];

function safeFilename(original) {
  const ext = path.extname(original || '').slice(0, 10).replace(/[^A-Za-z0-9.]/g, '');
  return `${Date.now()}-${safeId()}${ext.toLowerCase()}`;
}

const attachmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ATTACHMENTS_DIR),
  filename: (_req, file, cb) => cb(null, safeFilename(file.originalname)),
});

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
  filename: (_req, file, cb) => cb(null, safeFilename(file.originalname)),
});

function rejectBlocked(_req, file, cb) {
  if (BLOCKED_MIME_PREFIXES.some((prefix) => file.mimetype?.startsWith(prefix))) {
    return cb(new Error('File type not allowed'));
  }
  return cb(null, true);
}

function rejectNonImage(_req, file, cb) {
  if (!file.mimetype?.startsWith('image/')) {
    return cb(new Error('Avatar must be an image'));
  }
  return cb(null, true);
}

const uploadAttachment = multer({
  storage: attachmentStorage,
  limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 },
  fileFilter: rejectBlocked,
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
  fileFilter: rejectNonImage,
});

module.exports = {
  uploadAttachment,
  uploadAvatar,
  UPLOADS_ROOT,
  MAX_ATTACHMENT_BYTES,
  MAX_AVATAR_BYTES,
};
