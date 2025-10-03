class AppError extends Error {
  constructor(message, status = 500, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const badRequest = (message, details) => new AppError(message, 400, details);
const unauthorized = (message = 'Authentication required', details) =>
  new AppError(message, 401, details);
const forbidden = (message = 'Insufficient privileges', details) =>
  new AppError(message, 403, details);
const notFound = (message = 'Resource not found', details) =>
  new AppError(message, 404, details);

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
};
