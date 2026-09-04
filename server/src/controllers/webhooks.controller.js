/**
 * Webhook controller — handles POST /api/webhooks/razorpay
 *
 * Phase 6: validates → normalizes → dedup → persists → diagnoses → applies policy → executes outreach & outcome.
 */

import { normalize } from '../services/eventNormalizer.service.js';
import { isDuplicate } from '../services/dedup.service.js';
import { diagnoseEvent } from '../services/diagnosisClient.service.js';
import { selectPolicy } from '../services/policyEngine.service.js';
import { sendSimulated } from '../services/channelSimulator.service.js';
import { simulateOutcome } from '../services/outcomeSimulator.service.js';
import Event from '../models/Event.model.js';
import Diagnosis from '../models/Diagnosis.model.js';

export const receiveRazorpayWebhook = async (req, res) => {
  try {
    const raw = req.body;
    console.log(
      `[webhook] Razorpay event received: event="${raw?.event || 'unknown'}" entity_id="${raw?.payload?.payment?.entity?.id || raw?.id || 'unknown'}"`
    );


    // Normalize
    const normalized = normalize(raw, 'razorpay_test');

    // Dedup — duplicate is a no-op 200, not an error
    if (await isDuplicate(normalized.id)) {
      console.log(`[webhook] Duplicate event ${normalized.id}, skipping`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    // Persist
    const saved = await Event.create(normalized);
    console.log(`[webhook] Event ${normalized.id} saved with status: ${normalized.status}`);

    // Diagnose & Apply Policy & Execute
    try {
      const diagResult = await diagnoseEvent(saved.toObject());

      await Diagnosis.create({
        event_id: saved.id,
        cause: diagResult.cause,
        self_recovers_likely: diagResult.self_recovers_likely,
        confidence: diagResult.confidence,
        diagnosis_method: diagResult.diagnosis_method,
        model_version: diagResult.model_version,
      });

      await Event.updateOne({ id: saved.id }, { status: 'diagnosed' });
      console.log(`[webhook] Event ${normalized.id} diagnosed: ${diagResult.cause} (${diagResult.diagnosis_method})`);

      // Apply Recovery Policy
      const recoveryAction = await selectPolicy({
        event_id: saved.id,
        cause: diagResult.cause,
      });

      await Event.updateOne({ id: saved.id }, { status: 'policy_applied' });
      console.log(`[webhook] Event ${normalized.id} policy applied: action=${recoveryAction.action}`);

      // If allowed, execute simulated outreach & simulate outcome
      if (recoveryAction.status === 'allowed') {
        const execResult = await sendSimulated(recoveryAction.toObject(), {
          event: saved.toObject(),
          cause: diagResult.cause,
        });

        if (execResult.executed) {
          await simulateOutcome(execResult.recoveryAction, {
            event: saved.toObject(),
            cause: diagResult.cause,
          });
        }
      }
    } catch (err) {
      console.error(`[webhook] Pipeline execution failed for ${normalized.id}:`, err.message);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    // Always return 200 to Razorpay to prevent retry storms
    console.error('[webhook] Error processing Razorpay event:', err);
    return res.status(200).json({ received: true });
  }
};
