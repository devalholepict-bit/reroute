/**
 * Simulator controller — handles POST /api/simulator/events
 *
 * Phase 6: generates events → normalizes → dedup → persists → diagnoses → applies policy → simulates execution & outcome.
 */

import { generateEvent, generateBatch, VALID_CAUSES } from '../../../simulator/generateEvents.js';
import { getDemoEvents } from '../../../simulator/scenarios/demoScenario.js';
import { normalize } from '../services/eventNormalizer.service.js';
import { isDuplicate } from '../services/dedup.service.js';
import { diagnoseEvent } from '../services/diagnosisClient.service.js';
import { selectPolicy } from '../services/policyEngine.service.js';
import { sendSimulated } from '../services/channelSimulator.service.js';
import { simulateOutcome } from '../services/outcomeSimulator.service.js';
import Event from '../models/Event.model.js';
import Diagnosis from '../models/Diagnosis.model.js';

/**
 * Process a single event through the full pipeline:
 * normalize → dedup → persist → diagnose → apply policy → execute message → simulate outcome
 */
async function processEvent(raw) {
  const normalized = normalize(raw, 'simulator');

  if (await isDuplicate(normalized.id)) {
    return { id: normalized.id, skipped: true };
  }

  // Persist with pending_diagnosis
  const saved = await Event.create(normalized);

  try {
    // 1. Diagnose
    const diagResult = await diagnoseEvent(saved.toObject());

    const diagnosis = await Diagnosis.create({
      event_id: saved.id,
      cause: diagResult.cause,
      self_recovers_likely: diagResult.self_recovers_likely,
      confidence: diagResult.confidence,
      diagnosis_method: diagResult.diagnosis_method,
      model_version: diagResult.model_version,
    });

    await Event.updateOne({ id: saved.id }, { status: 'diagnosed' });

    // 2. Apply Recovery Policy (checks compliance & sets allowed/blocked)
    const recoveryAction = await selectPolicy({
      event_id: saved.id,
      cause: diagResult.cause,
    });

    await Event.updateOne({ id: saved.id }, { status: 'policy_applied' });

    let finalAction = recoveryAction.toObject();
    let outcomeData = null;

    // 3. If allowed, execute simulated outreach & generate outcome
    if (recoveryAction.status === 'allowed') {
      const execResult = await sendSimulated(recoveryAction.toObject(), {
        event: saved.toObject(),
        cause: diagResult.cause,
      });

      if (execResult.executed) {
        finalAction = execResult.recoveryAction;

        // 4. Simulate recovery outcome & update Event status (executed vs resolved)
        const outcomeResult = await simulateOutcome(finalAction, {
          event: saved.toObject(),
          cause: diagResult.cause,
          forced_outcome: raw.forced_outcome || raw.payload?.forced_outcome,
        });

        outcomeData = outcomeResult.outcomeRecord;
      }
    }

    const updatedEvent = await Event.findOne({ id: saved.id }).lean();
    return {
      id: normalized.id,
      skipped: false,
      event: updatedEvent,
      diagnosis: diagnosis.toObject(),
      recovery_action: finalAction,
      outcome: outcomeData,
    };
  } catch (err) {
    console.error(`[simulator] Pipeline processing failed for ${saved.id}:`, err.message);
    const currentEvent = await Event.findOne({ id: saved.id }).lean();
    return { id: normalized.id, skipped: false, event: currentEvent || saved.toObject() };
  }
}

/**
 * POST /api/simulator/events
 * Body: { cause, eventType?, count? }
 * Response: 200 { created: [...eventIds] }
 */
export const createSimulatorEvents = async (req, res, next) => {
  try {
    const { cause, eventType, count } = req.body || {};
    let rawEvents;

    if (cause && !count) {
      rawEvents = [generateEvent(cause, eventType)];
    } else if (count && Number.isInteger(count) && count > 0) {
      let distribution;
      if (cause) distribution = { [cause]: 1 };
      rawEvents = generateBatch(count, distribution);
    } else {
      return res.status(400).json({
        error: true,
        message: 'Provide { cause, eventType?, count? }. Valid causes: ' + VALID_CAUSES.join(', '),
        code: 'VALIDATION_ERROR',
        details: { valid_causes: VALID_CAUSES },
      });
    }

    const createdIds = [];
    const skippedIds = [];

    for (const raw of rawEvents) {
      const result = await processEvent(raw);
      if (result.skipped) {
        skippedIds.push(result.id);
      } else {
        createdIds.push(result.id);
      }
    }

    return res.status(200).json({
      created: createdIds,
      ...(skippedIds.length > 0 && { duplicates_skipped: skippedIds }),
    });
  } catch (err) {
    if (err.message?.includes('Unrecognized cause')) {
      return res.status(400).json({
        error: true,
        message: err.message,
        code: 'VALIDATION_ERROR',
        details: { valid_causes: VALID_CAUSES },
      });
    }
    return next(err);
  }
};

/**
 * POST /api/simulator/events/full
 * Same as above but returns full payloads, recovery actions, messages, and outcomes.
 */
export const createSimulatorEventsWithPayload = async (req, res, next) => {
  try {
    const { cause, eventType, count } = req.body || {};
    let rawEvents;

    if (cause && !count) {
      rawEvents = [generateEvent(cause, eventType)];
    } else if (count && Number.isInteger(count) && count > 0) {
      let distribution;
      if (cause) distribution = { [cause]: 1 };
      rawEvents = generateBatch(count, distribution);
    } else {
      return res.status(400).json({
        error: true,
        message: 'Provide { cause, eventType?, count? }. Valid causes: ' + VALID_CAUSES.join(', '),
        code: 'VALIDATION_ERROR',
        details: { valid_causes: VALID_CAUSES },
      });
    }

    const createdIds = [];
    const skippedIds = [];
    const events = [];
    const recoveryActions = [];
    const outcomes = [];

    for (const raw of rawEvents) {
      const result = await processEvent(raw);
      if (result.skipped) {
        skippedIds.push(result.id);
      } else {
        createdIds.push(result.id);
        events.push(result.event);
        if (result.recovery_action) {
          recoveryActions.push(result.recovery_action);
        }
        if (result.outcome) {
          outcomes.push(result.outcome);
        }
      }
    }

    return res.status(200).json({
      created: createdIds,
      events,
      recovery_actions: recoveryActions,
      outcomes,
      ...(skippedIds.length > 0 && { duplicates_skipped: skippedIds }),
    });
  } catch (err) {
    if (err.message?.includes('Unrecognized cause')) {
      return res.status(400).json({
        error: true,
        message: err.message,
        code: 'VALIDATION_ERROR',
        details: { valid_causes: VALID_CAUSES },
      });
    }
    return next(err);
  }
};

/**
 * POST /api/simulator/run
 * Runs the fixed, deterministic 5-event demo scenario (Phase 16).
 */
export const runDemoBatch = async (req, res, next) => {
  try {
    const rawEvents = getDemoEvents();
    const createdIds = [];
    const skippedIds = [];
    const events = [];
    const recoveryActions = [];
    const outcomes = [];

    for (const raw of rawEvents) {
      const result = await processEvent(raw);
      if (result.skipped) {
        skippedIds.push(result.id);
      } else {
        createdIds.push(result.id);
        events.push(result.event);
        if (result.recovery_action) {
          recoveryActions.push(result.recovery_action);
        }
        if (result.outcome) {
          outcomes.push(result.outcome);
        }
      }
    }

    return res.status(200).json({
      success: true,
      count: createdIds.length,
      created: createdIds,
      events,
      recovery_actions: recoveryActions,
      outcomes,
      ...(skippedIds.length > 0 && { duplicates_skipped: skippedIds }),
    });
  } catch (err) {
    return next(err);
  }
};
