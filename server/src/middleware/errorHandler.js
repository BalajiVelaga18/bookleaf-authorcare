import { errorResponse } from '../utils/apiResponse.js';

export function notFoundHandler(req, res, next) {
  res.status(404).json(errorResponse(`Route not found: ${req.method} ${req.originalUrl}`, null, 404));
}

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  }

  // Avoid leaking sensitive details in production
  const response = errorResponse(message, null, statusCode);
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
