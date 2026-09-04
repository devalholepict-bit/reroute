import AuditLog from '../models/AuditLog.model.js';

/**
 * GET /api/audit
 * Query params: cause, outcome, from, to, payment_id, customer_id, limit
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { cause, outcome, from, to, payment_id, customer_id, limit } = req.query;
    const filter = {};

    if (cause) {
      filter.cause = cause;
    }
    if (outcome) {
      filter.outcome = outcome;
    }
    if (payment_id) {
      filter.payment_id = payment_id;
    }
    if (customer_id) {
      filter.customer_id = customer_id;
    }

    if (from || to) {
      filter.timestamp = {};
      if (from) {
        filter.timestamp.$gte = new Date(from);
      }
      if (to) {
        filter.timestamp.$lte = new Date(to);
      }
    }

    let query = AuditLog.find(filter).sort({ timestamp: 1, created_at: 1 });
    if (limit && Number.isInteger(Number(limit))) {
      query = query.limit(Number(limit));
    }

    const logs = await query.lean();
    return res.status(200).json(logs);
  } catch (err) {
    return next(err);
  }
};
