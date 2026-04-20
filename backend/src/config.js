require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';

function required(name, fallback = '') {
  const v = process.env[name];
  if (v !== undefined && v !== '') return v;
  if (fallback !== '') return fallback;
  if (nodeEnv === 'production') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return fallback;
}

// CORS / Socket.IO origin: supports a single origin or a comma-separated list,
// so a Netlify production URL and deploy-preview wildcards can both pass.
const rawOrigins = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const originList = rawOrigins
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

module.exports = {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/meet-app'),
  jwtSecret: required('JWT_SECRET', 'dev-only-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: originList.length === 1 ? originList[0] : originList,
  // Canonical URL used inside emails (e.g. password-reset links). Falls back to
  // the first CORS origin so local dev still works without extra config.
  appUrl: (process.env.APP_URL || originList[0] || 'http://localhost:5173').replace(/\/+$/, ''),
  maxParticipantsPerRoom: Number(process.env.MAX_PARTICIPANTS_PER_ROOM) || 50,
  passwordResetTtlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES) || 30,
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'ClassMeet <no-reply@classmeet.local>',
  },
};
