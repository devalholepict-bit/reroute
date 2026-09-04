import Event from '../models/Event.model.js';
import Diagnosis from '../models/Diagnosis.model.js';
import RecoveryAction from '../models/RecoveryAction.model.js';
import Outcome from '../models/Outcome.model.js';
import PromiseModel from '../models/Promise.model.js';
import AuditLog from '../models/AuditLog.model.js';

/**
 * GET /api/cases
 * Query parameters: cause, outcome, status, limit, page
 *
 * Joins Event + latest Diagnosis + latest RecoveryAction + latest Outcome per event
 * using a high-performance MongoDB aggregation pipeline.
 */
export const listCases = async (req, res, next) => {
  try {
    const { cause, outcome, status, limit, page } = req.query;

    const pipeline = [];

    // 1. Initial Match by Event status if specified
    if (status) {
      pipeline.push({
        $match: { status },
      });
    }

    // 2. Sort chronologically descending
    pipeline.push({
      $sort: { created_at: -1 },
    });

    // 3. Lookup latest Diagnosis
    pipeline.push({
      $lookup: {
        from: 'diagnoses',
        let: { eventId: '$id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$event_id', '$$eventId'] } } },
          { $sort: { created_at: -1 } },
          { $limit: 1 },
        ],
        as: 'diagnosisDocs',
      },
    });

    // 4. Lookup latest RecoveryAction
    pipeline.push({
      $lookup: {
        from: 'recoveryactions',
        let: { eventId: '$id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$event_id', '$$eventId'] } } },
          { $sort: { created_at: -1 } },
          { $limit: 1 },
        ],
        as: 'recoveryActionDocs',
      },
    });

    // 5. Lookup latest Outcome
    pipeline.push({
      $lookup: {
        from: 'outcomes',
        let: { eventId: '$id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$event_id', '$$eventId'] } } },
          { $sort: { created_at: -1 } },
          { $limit: 1 },
        ],
        as: 'outcomeDocs',
      },
    });

    // 6. Unwrap arrays to objects
    pipeline.push({
      $addFields: {
        diagnosis: { $arrayElemAt: ['$diagnosisDocs', 0] },
        recovery_action: { $arrayElemAt: ['$recoveryActionDocs', 0] },
        outcome: { $arrayElemAt: ['$outcomeDocs', 0] },
      },
    });

    // 7. Post-lookup filtering for cause and outcome
    const postMatch = {};
    if (cause) {
      postMatch.$or = [
        { 'diagnosis.cause': cause },
        { 'payload.payment.error_reason': cause },
      ];
    }
    if (outcome) {
      postMatch['outcome.outcome'] = outcome;
    }
    if (Object.keys(postMatch).length > 0) {
      pipeline.push({ $match: postMatch });
    }

    // 8. Pagination support
    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    if (!isNaN(parsedPage) && parsedPage > 0 && !isNaN(parsedLimit) && parsedLimit > 0) {
      pipeline.push({ $skip: (parsedPage - 1) * parsedLimit });
    }
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      pipeline.push({ $limit: parsedLimit });
    }

    // 9. Project clean response shape
    pipeline.push({
      $project: {
        _id: 1,
        id: 1,
        event_id: '$id',
        source: 1,
        event: 1,
        status: 1,
        customer: 1,
        payment: '$payload.payment',
        payload: 1,
        diagnosis: 1,
        recovery_action: 1,
        outcome: 1,
        created_at: 1,
      },
    });

    const cases = await Event.aggregate(pipeline);
    return res.status(200).json(cases);
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/cases/:id
 * Returns the full lifecycle chain for one event:
 * event itself, diagnosis, all recovery actions (attempts), all outcomes, promise-to-pay, and audit trail.
 */
export const getCaseById = async (req, res, next) => {
  try {
    const caseId = req.params.id;

    const event = await Event.findOne({ id: caseId }).lean();
    if (!event) {
      return res.status(404).json({
        error: true,
        message: `Case not found with ID: "${caseId}"`,
        code: 'CASE_NOT_FOUND',
        details: { case_id: caseId },
      });
    }

    const paymentId =
      event.payload?.payment?.id ||
      event.payload?.payment?.entity?.id ||
      event.payment_id ||
      caseId;

    // Parallel fetch of all related documents
    const [diagnosis, recoveryActions, outcomes, promise, auditLogs] = await Promise.all([
      Diagnosis.findOne({ event_id: caseId }).sort({ created_at: -1 }).lean(),
      RecoveryAction.find({ event_id: caseId }).sort({ created_at: 1, attempt_number: 1 }).lean(),
      Outcome.find({ event_id: caseId }).sort({ created_at: 1 }).lean(),
      PromiseModel.findOne({ case_id: caseId }).sort({ created_at: -1 }).lean(),
      AuditLog.find({
        $or: [
          { payment_id: paymentId },
          { payment_id: caseId },
          { customer_id: event.customer?.id },
        ],
      })
        .sort({ timestamp: 1, created_at: 1 })
        .lean(),
    ]);

    const caseDetail = {
      id: event.id,
      event_id: event.id,
      event,
      diagnosis: diagnosis || null,
      recovery_actions: recoveryActions || [],
      outcomes: outcomes || [],
      promise: promise || null,
      audit_logs: auditLogs || [],
    };

    return res.status(200).json(caseDetail);
  } catch (err) {
    return next(err);
  }
};
