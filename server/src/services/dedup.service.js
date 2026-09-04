/**
 * Deduplication Service
 *
 * Checks whether an event with the given id already exists in MongoDB.
 */

import Event from '../models/Event.model.js';

/**
 * Check if an event with this id already exists.
 * @param {string} eventId
 * @returns {Promise<boolean>} true if a document with this id already exists
 */
export async function isDuplicate(eventId) {
  const existing = await Event.findOne({ id: eventId }).lean().select('id');
  return !!existing;
}
