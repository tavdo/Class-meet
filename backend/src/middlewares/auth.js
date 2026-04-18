const { verifyToken } = require('../utils/token');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = verifyToken(token);
    req.user = {
      userId: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      displayName: decoded.displayName,
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authRequired };
