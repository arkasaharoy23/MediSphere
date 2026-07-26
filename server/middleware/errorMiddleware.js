function errorMiddleware(err, req, res, next) {
  console.error(err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ ok: false, message: err.message || 'Something went wrong' });
}

module.exports = errorMiddleware;