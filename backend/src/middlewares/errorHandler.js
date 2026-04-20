function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  // Multer converts things like oversized uploads to MulterError with a `.code`.
  let status = err.status || err.statusCode || 500;
  if (err.name === 'MulterError') {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  } else if (err.message === 'File type not allowed' || err.message === 'Avatar must be an image') {
    status = 415;
  }
  const message =
    status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';
  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
