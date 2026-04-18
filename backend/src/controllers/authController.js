const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const User = require('../models/User');
const { signToken } = require('../utils/token');

const registerValidators = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('displayName').trim().isLength({ min: 1, max: 80 }).withMessage('Display name required'),
  body('role').isIn(['teacher', 'student']).withMessage('Role must be teacher or student'),
];

async function register(req, res, next) {
  try {
    const { email, password, displayName, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, displayName, role });
    const token = signToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    });
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (e) {
    return next(e);
  }
}

const loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
];

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    });
    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (e) {
    return next(e);
  }
}

async function me(req, res) {
  const user = await User.findById(req.user.userId).select('email displayName role');
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({
    user: {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
  });
}

module.exports = {
  registerValidators,
  register,
  loginValidators,
  login,
  me,
};
