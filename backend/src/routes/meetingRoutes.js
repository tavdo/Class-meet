const express = require('express');
const {
  createValidators,
  createMeeting,
  getValidators,
  getMeeting,
  messagesValidators,
  listMessages,
} = require('../controllers/meetingController');
const { handleValidation } = require('../middlewares/validate');
const { authRequired } = require('../middlewares/auth');

const router = express.Router();

router.post('/', authRequired, createValidators, handleValidation, createMeeting);
router.get('/:roomId/messages', authRequired, messagesValidators, handleValidation, listMessages);
router.get('/:roomId', getValidators, handleValidation, getMeeting);

module.exports = router;
