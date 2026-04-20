const express = require('express');
const {
  registerValidators,
  register,
  loginValidators,
  login,
  me,
  updateProfileValidators,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  forgotPasswordValidators,
  forgotPassword,
  resetPasswordValidators,
  resetPassword,
} = require('../controllers/authController');
const { handleValidation } = require('../middlewares/validate');
const { authRequired } = require('../middlewares/auth');
const { uploadAvatar: uploadAvatarMiddleware } = require('../middlewares/upload');

const router = express.Router();

router.post('/register', registerValidators, handleValidation, register);
router.post('/login', loginValidators, handleValidation, login);
router.post(
  '/forgot-password',
  forgotPasswordValidators,
  handleValidation,
  forgotPassword
);
router.post(
  '/reset-password',
  resetPasswordValidators,
  handleValidation,
  resetPassword
);
router.get('/me', authRequired, me);
router.put(
  '/me',
  authRequired,
  updateProfileValidators,
  handleValidation,
  updateProfile
);
router.post(
  '/avatar',
  authRequired,
  uploadAvatarMiddleware.single('avatar'),
  uploadAvatar
);
router.delete('/avatar', authRequired, removeAvatar);

module.exports = router;
