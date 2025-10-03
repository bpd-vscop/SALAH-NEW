const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.status = 404;
  next(error);
};

const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: {
      message: err.message || 'Unexpected server error',
      details: err.details || undefined,
      code: err.code || undefined,
    },
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
