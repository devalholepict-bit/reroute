import { env } from '../config/env.js';

/**
 * Lightweight developer shared-secret access control middleware for simulator and admin routes.
 *
 * NOTE: This is a lightweight dev token protection for hackathon demo use,
 * not a full RBAC/session authentication system.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function devAuthGuard(req, res, next) {
  const secretHeader = req.headers['x-dev-secret'];
  const expectedSecret = env.SIMULATOR_DEV_SECRET || 'dev_secret_reroute_2026';

  if (!secretHeader || secretHeader !== expectedSecret) {
    return res.status(401).json({
      error: true,
      message: 'Unauthorized: Missing or invalid developer secret (X-Dev-Secret header)',
      code: 'UNAUTHORIZED',
      details: { header: 'x-dev-secret' },
    });
  }

  next();
}

export default devAuthGuard;
