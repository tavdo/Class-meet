const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');

const config = require('./config');
const { connectDb } = require('./db');
const { errorHandler } = require('./middlewares/errorHandler');
const authRoutes = require('./routes/authRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const { UPLOADS_ROOT } = require('./middlewares/upload');
const { initSocket } = require('./sockets');

async function main() {
  await connectDb();

  const app = express();
  app.disable('x-powered-by');
  app.use(
    helmet({
      // Allow the frontend (different origin) to embed uploaded assets.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '48kb' }));

  app.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  // Public static files (uploaded attachments / avatars). URLs are unguessable
  // (nanoid) — protect sensitive content with signed URLs if you need privacy.
  app.use(
    '/uploads',
    express.static(UPLOADS_ROOT, {
      fallthrough: false,
      index: false,
      maxAge: '7d',
    })
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/meetings', meetingRoutes);

  app.use(errorHandler);

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: config.clientOrigin,
      methods: ['GET', 'POST'],
    },
  });

  initSocket(io);

  server.listen(config.port, () => {
    console.log(`Listening on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
