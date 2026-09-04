import Event from '../models/Event.model.js';
import PromiseModel from '../models/Promise.model.js';

/**
 * GET /api/metrics
 *
 * Computes executive recovery metrics via high-performance MongoDB aggregation pipelines:
 * - overall_recovery_rate (%)
 * - recovery_rate_by_cause (% per cause breakdown)
 * - total_amount_recovered (in paise, rupees, and formatted INR string)
 * - average_time_to_recovery (seconds and milliseconds)
 * - contact_cap_compliance_rate (% of cases that never triggered a stopping rule block)
 * - promise_to_paid_conversion_rate (% of created promises that were fulfilled)
 */
export const getMetrics = async (req, res, next) => {
  try {
    // 1. Run Event + Outcome + RecoveryAction + Diagnosis aggregation pipeline
    const [eventMetricsFacet] = await Event.aggregate([
      {
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
      },
      {
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
      },
      {
        $lookup: {
          from: 'recoveryactions',
          let: { eventId: '$id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$event_id', '$$eventId'] } } },
          ],
          as: 'recoveryActionDocs',
        },
      },
      {
        $addFields: {
          cause: {
            $ifNull: [
              { $arrayElemAt: ['$diagnosisDocs.cause', 0] },
              '$payload.payment.error_reason',
              'generic_decline',
            ],
          },
          outcome: { $arrayElemAt: ['$outcomeDocs.outcome', 0] },
          amountRecovered: { $ifNull: [{ $arrayElemAt: ['$outcomeDocs.amount_recovered', 0] }, 0] },
          isRecovered: {
            $cond: [
              { $eq: [{ $arrayElemAt: ['$outcomeDocs.outcome', 0] }, 'paid_immediately'] },
              1,
              0,
            ],
          },
          hasBlockedAction: {
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: '$recoveryActionDocs',
                        as: 'ra',
                        cond: { $eq: ['$$ra.status', 'blocked'] },
                      },
                    },
                  },
                  0,
                ],
              },
              1,
              0,
            ],
          },
          timeToRecoveryMs: {
            $cond: [
              { $eq: [{ $arrayElemAt: ['$outcomeDocs.outcome', 0] }, 'paid_immediately'] },
              {
                $max: [
                  0,
                  {
                    $subtract: [
                      { $arrayElemAt: ['$outcomeDocs.created_at', 0] },
                      '$created_at',
                    ],
                  },
                ],
              },
              null,
            ],
          },
        },
      },
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                total_cases: { $sum: 1 },
                total_recovered: { $sum: '$isRecovered' },
                total_amount_recovered: { $sum: '$amountRecovered' },
                blocked_cases: { $sum: '$hasBlockedAction' },
                avg_time_to_recovery_ms: { $avg: '$timeToRecoveryMs' },
              },
            },
          ],
          by_cause: [
            {
              $group: {
                _id: '$cause',
                total_cases: { $sum: 1 },
                recovered_cases: { $sum: '$isRecovered' },
                amount_recovered: { $sum: '$amountRecovered' },
                avg_time_to_recovery_ms: { $avg: '$timeToRecoveryMs' },
              },
            },
            {
              $project: {
                _id: 0,
                cause: '$_id',
                total_cases: 1,
                recovered_cases: 1,
                amount_recovered: 1,
                recovery_rate: {
                  $cond: [
                    { $gt: ['$total_cases', 0] },
                    {
                      $round: [
                        { $multiply: [{ $divide: ['$recovered_cases', '$total_cases'] }, 100] },
                        2,
                      ],
                    },
                    0,
                  ],
                },
              },
            },
            { $sort: { total_cases: -1 } },
          ],
        },
      },
    ]);

    // 2. Run Promise aggregation pipeline
    const [promiseMetrics] = await PromiseModel.aggregate([
      {
        $group: {
          _id: null,
          total_promises: { $sum: 1 },
          fulfilled_promises: {
            $sum: { $cond: [{ $eq: ['$status', 'fulfilled'] }, 1, 0] },
          },
          missed_promises: {
            $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] },
          },
          pending_promises: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          total_promised_amount: { $sum: '$amount' },
        },
      },
    ]) || [];

    const overallData = eventMetricsFacet?.overall?.[0] || {
      total_cases: 0,
      total_recovered: 0,
      total_amount_recovered: 0,
      blocked_cases: 0,
      avg_time_to_recovery_ms: 0,
    };

    const byCauseArray = eventMetricsFacet?.by_cause || [];
    const byCauseMap = {};
    for (const item of byCauseArray) {
      byCauseMap[item.cause] = {
        total_cases: item.total_cases,
        recovered_cases: item.recovered_cases,
        amount_recovered: item.amount_recovered,
        recovery_rate: item.recovery_rate,
      };
    }

    const totalCases = overallData.total_cases || 0;
    const totalRecovered = overallData.total_recovered || 0;
    const totalAmountPaise = overallData.total_amount_recovered || 0;
    const totalAmountRupees = totalAmountPaise >= 100 ? totalAmountPaise / 100 : totalAmountPaise;
    const blockedCases = overallData.blocked_cases || 0;
    const avgTimeToRecoveryMs = Math.round(overallData.avg_time_to_recovery_ms || 0);
    const avgTimeToRecoverySeconds = Number((avgTimeToRecoveryMs / 1000).toFixed(2));

    const overallRecoveryRate =
      totalCases > 0 ? Number(((totalRecovered / totalCases) * 100).toFixed(2)) : 0;

    const complianceRate =
      totalCases > 0
        ? Number((((totalCases - blockedCases) / totalCases) * 100).toFixed(2))
        : 100;

    const totalPromises = promiseMetrics?.total_promises || 0;
    const fulfilledPromises = promiseMetrics?.fulfilled_promises || 0;
    const missedPromises = promiseMetrics?.missed_promises || 0;
    const pendingPromises = promiseMetrics?.pending_promises || 0;
    const resolvedPromises = fulfilledPromises + missedPromises;

    const promiseConversionRate =
      resolvedPromises > 0
        ? Number(((fulfilledPromises / resolvedPromises) * 100).toFixed(2))
        : totalPromises > 0
        ? Number(((fulfilledPromises / totalPromises) * 100).toFixed(2))
        : 0;

    const formattedAmount = `₹${Number(totalAmountRupees).toLocaleString('en-IN')}`;

    const responseData = {
      // 1. Overall recovery rate
      overall_recovery_rate: overallRecoveryRate,
      overall_recovery_rate_decimal: Number((overallRecoveryRate / 100).toFixed(4)),

      // 2. Recovery rate by cause
      recovery_rate_by_cause: byCauseMap,
      recovery_by_cause_list: byCauseArray,

      // 3. Total amount recovered
      total_amount_recovered: totalAmountRupees,
      total_amount_recovered_paise: totalAmountPaise,
      total_amount_recovered_formatted: formattedAmount,

      // 4. Average time-to-recovery
      average_time_to_recovery: avgTimeToRecoverySeconds,
      average_time_to_recovery_seconds: avgTimeToRecoverySeconds,
      average_time_to_recovery_ms: avgTimeToRecoveryMs,

      // 5. Contact-cap compliance rate
      contact_cap_compliance_rate: complianceRate,
      contact_cap_compliance_rate_decimal: Number((complianceRate / 100).toFixed(4)),

      // 6. Promise-to-paid conversion rate
      promise_to_paid_conversion_rate: promiseConversionRate,
      promise_conversion_rate: promiseConversionRate,

      // Summary counts
      summary: {
        total_cases: totalCases,
        total_recovered: totalRecovered,
        unrecovered_cases: totalCases - totalRecovered,
        blocked_cases: blockedCases,
        total_promises: totalPromises,
        fulfilled_promises: fulfilledPromises,
        missed_promises: missedPromises,
        pending_promises: pendingPromises,
      },
    };

    return res.status(200).json(responseData);
  } catch (err) {
    return next(err);
  }
};
