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

module.exports = {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/meet-app'),
  jwtSecret: required('JWT_SECRET', 'dev-only-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  maxParticipantsPerRoom: Number(process.env.MAX_PARTICIPANTS_PER_ROOM) || 50,
};
