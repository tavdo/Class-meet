const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const User = require('../models/User');
const config = require('../config');
const { signToken } = require('../utils/token');
const { sendMail } = require('../utils/mailer');

function hashResetToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    avatarUrl: user.avatarUrl || '',
    bio: user.bio || '',
  };
}

function tokenPayload(user) {
  return {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    displayName: user.displayName,
  };
}

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
    const token = signToken(tokenPayload(user));
    return res.status(201).json({ token, user: publicUser(user) });
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
    const token = signToken(tokenPayload(user));
    return res.json({ token, user: publicUser(user) });
  } catch (e) {
    return next(e);
  }
}

async function me(req, res) {
  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: publicUser(user) });
}

const updateProfileValidators = [
  body('displayName').optional().trim().isLength({ min: 1, max: 80 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('bio').optional().isString().isLength({ max: 280 }),
  body('currentPassword').optional().isString(),
  body('newPassword').optional().isLength({ min: 8 }),
];

async function updateProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { displayName, email, bio, currentPassword, newPassword } = req.body;

    if (typeof displayName === 'string' && displayName.trim()) {
      user.displayName = displayName.trim();
    }

    if (typeof bio === 'string') {
      user.bio = bio.trim();
    }

    if (typeof email === 'string' && email !== user.email) {
      const taken = await User.findOne({ email }).select('_id');
      if (taken && taken._id.toString() !== user._id.toString()) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      user.email = email;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password required' });
      }
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ error: 'Current password incorrect' });
      }
      user.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    await user.save();
    // Re-issue a fresh JWT so the updated displayName/email flow through socket auth.
    const token = signToken(tokenPayload(user));
    return res.json({ token, user: publicUser(user) });
  } catch (e) {
    return next(e);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const user = await User.findById(req.user.userId);
    if (!user) {
      // Orphan upload — clean up.
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove previous avatar file if stored locally.
    if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/avatars/')) {
      const prevPath = path.join(
        __dirname,
        '..',
        '..',
        user.avatarUrl.replace(/^\/+/, '')
      );
      fs.unlink(prevPath, () => {});
    }

    const url = `/uploads/avatars/${req.file.filename}`;
    user.avatarUrl = url;
    await user.save();
    return res.json({ user: publicUser(user) });
  } catch (e) {
    return next(e);
  }
}

async function removeAvatar(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/avatars/')) {
      const prevPath = path.join(
        __dirname,
        '..',
        '..',
        user.avatarUrl.replace(/^\/+/, '')
      );
      fs.unlink(prevPath, () => {});
    }
    user.avatarUrl = '';
    await user.save();
    return res.json({ user: publicUser(user) });
  } catch (e) {
    return next(e);
  }
}

const forgotPasswordValidators = [
  body('email').isEmail().normalizeEmail(),
];

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Generic response regardless of whether the email exists — prevents
    // attackers from enumerating registered accounts.
    const genericResponse = {
      ok: true,
      message:
        'If an account exists for this email, password reset instructions have been sent.',
    };

    if (!user) return res.json(genericResponse);

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashResetToken(rawToken);
    user.passwordResetExpires = new Date(
      Date.now() + config.passwordResetTtlMinutes * 60_000
    );
    await user.save();

    const resetUrl = `${config.appUrl}/reset-password/${rawToken}`;
    const ttlMin = config.passwordResetTtlMinutes;
    const text = [
      `Hi ${user.displayName || ''},`,
      '',
      `We received a request to reset the password on your ClassMeet account.`,
      `Open the link below within ${ttlMin} minutes to choose a new password:`,
      '',
      resetUrl,
      '',
      `If you didn't make this request you can safely ignore this email — your password will stay the same.`,
    ].join('\n');

    const html = `
      <div style="font-family:system-ui,Segoe UI,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0f172a">
        <h2 style="margin:0 0 12px">Reset your ClassMeet password</h2>
        <p>Hi ${user.displayName || 'there'},</p>
        <p>We received a request to reset the password on your ClassMeet account. Click the button below within <strong>${ttlMin} minutes</strong> to choose a new password.</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="background:#6366f1;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600">Reset password</a>
        </p>
        <p style="word-break:break-all;color:#475569;font-size:12px">Or paste this URL into your browser: <br/><a href="${resetUrl}">${resetUrl}</a></p>
        <p style="color:#64748b;font-size:12px">If you didn't request this, you can ignore this email.</p>
      </div>
    `;

    try {
      await sendMail({
        to: user.email,
        subject: 'Reset your ClassMeet password',
        text,
        html,
      });
    } catch (mailErr) {
      console.error('[forgotPassword] mail send failed:', mailErr?.message || mailErr);
    }

    // In development we also return the raw link in the response so the UI
    // can surface it — easier than scraping the server log. Never do this in prod.
    if (config.nodeEnv !== 'production' && !config.smtp.host) {
      return res.json({ ...genericResponse, devResetUrl: resetUrl });
    }
    return res.json(genericResponse);
  } catch (e) {
    return next(e);
  }
}

const resetPasswordValidators = [
  body('token').isString().isLength({ min: 32, max: 128 }),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const tokenHash = hashResetToken(token);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpires');

    if (!user) {
      return res
        .status(400)
        .json({ error: 'This reset link is invalid or has expired.' });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    await user.save();

    const newToken = signToken(tokenPayload(user));
    return res.json({ token: newToken, user: publicUser(user) });
  } catch (e) {
    return next(e);
  }
}

module.exports = {
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
};
