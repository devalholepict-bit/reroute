/**
 * Central Express Error Handling Middleware
 *
 * Standardizes all error responses to:
 * {
 *   "error": true,
 *   "message": "Safe human-readable message",
 *   "code": "ERROR_CODE",
 *   "details": {}
 * }
 *
 * Sanitizes outputs to ensure stack traces, DB credentials, and internal paths are never leaked.
 */
export const errorHandler = (err, req, res, _next) => {
  console.error('[errorHandler] Request Error:', err.message || err);

  // 1. Mongoose Schema Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({
      error: true,
      message: messages.join('; ') || 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: { errors: messages },
    });
  }

  // 2. Mongoose Bad ObjectId / Cast Error
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: true,
      message: `Invalid ID format for field "${err.path}"`,
      code: 'INVALID_ID_FORMAT',
      details: { field: err.path },
    });
  }

  // 3. MongoDB Duplicate Key Error
  if (err.code === 11000) {
    return res.status(409).json({
      error: true,
      message: 'Duplicate key conflict: resource already exists',
      code: 'DUPLICATE_RESOURCE',
      details: err.keyValue || {},
    });
  }

  // 4. MongoDB Disconnection / Connection Timeout
  if (
    err.name === 'MongoNotConnectedError' ||
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongooseTimeoutError' ||
    err.message?.includes('buffering timed out')
  ) {
    return res.status(503).json({
      error: true,
      message: 'Database temporarily unavailable, please try again shortly',
      code: 'MONGO_UNAVAILABLE',
      details: {},
    });
  }

  // 5. Custom status codes / Explicit errors
  const statusCode = err.statusCode || err.status || 500;
  const isInternal = statusCode === 500;

  // For 500 errors, provide a safe human-readable message without leaking internal implementation
  const safeMessage = isInternal
    ? 'An unexpected internal server error occurred'
    : err.message || 'Request failed';

  const code = err.code || (isInternal ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');

  return res.status(statusCode).json({
    error: true,
    message: safeMessage,
    code,
    details: err.details || {},
  });
};

export default errorHandler;
