const express = require('express');
const {
  createValidators,
  createMeeting,
  getValidators,
  getMeeting,
  messagesValidators,
  listMessages,
  uploadValidators,
  uploadAttachment,
} = require('../controllers/meetingController');
const { handleValidation } = require('../middlewares/validate');
const { authRequired } = require('../middlewares/auth');
const { uploadAttachment: uploadAttachmentMiddleware } = require('../middlewares/upload');

const router = express.Router();

router.post('/', authRequired, createValidators, handleValidation, createMeeting);
router.get('/:roomId/messages', authRequired, messagesValidators, handleValidation, listMessages);
router.post(
  '/:roomId/attachments',
  authRequired,
  uploadValidators,
  handleValidation,
  uploadAttachmentMiddleware.single('file'),
  uploadAttachment
);
router.get('/:roomId', getValidators, handleValidation, getMeeting);

module.exports = router;
