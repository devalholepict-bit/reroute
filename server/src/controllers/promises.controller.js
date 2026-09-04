import { advanceTime, getPromises } from '../services/promiseTracker.service.js';

export const advancePromiseTime = async (req, res, next) => {
  try {
    const caseId = req.body?.caseId || req.body?.case_id;
    const forceStatus = req.body?.forceStatus || req.body?.force_status;

    if (!caseId) {
      return res.status(400).json({
        error: true,
        message: 'caseId is required in request body { caseId: string, forceStatus?: "fulfilled" | "missed" }',
        code: 'VALIDATION_ERROR',
        details: {},
      });
    }

    const result = await advanceTime(caseId, { forceStatus });

    return res.status(200).json({
      success: true,
      case_id: caseId,
      resolution: result.resolution,
      event_status: result.eventStatus,
      amount_recovered: result.amount_recovered,
      promise: result.promise,
    });
  } catch (err) {
    if (err.message?.includes('No pending promise-to-pay')) {
      return res.status(404).json({
        error: true,
        message: err.message,
        code: 'PROMISE_NOT_FOUND',
        details: { case_id: req.body?.caseId || req.body?.case_id },
      });
    }
    return next(err);
  }
};

export const listPromises = async (_req, res, next) => {
  try {
    const promises = await getPromises();
    return res.status(200).json(promises);
  } catch (err) {
    return next(err);
  }
};
