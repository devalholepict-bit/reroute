import { isDBConnected } from '../config/db.js';

/**
 * Fast-fail middleware for database-dependent routes.
 * Immediately returns HTTP 503 instead of letting requests hang in Mongoose query buffers.
 */
export const dbGuard = (_req, res, next) => {
  if (!isDBConnected()) {
    return res.status(503).json({
      error: true,
      message: 'Database temporarily unavailable, please try again shortly',
      code: 'MONGO_UNAVAILABLE',
      details: {},
    });
  }
  next();
};

export default dbGuard;
