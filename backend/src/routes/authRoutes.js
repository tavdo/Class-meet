const express = require('express');
const {
  registerValidators,
  register,
  loginValidators,
  login,
  me,
} = require('../controllers/authController');
const { handleValidation } = require('../middlewares/validate');
const { authRequired } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', registerValidators, handleValidation, register);
router.post('/login', loginValidators, handleValidation, login);
router.get('/me', authRequired, me);

module.exports = router;
