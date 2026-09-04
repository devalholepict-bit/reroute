import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import Event from '../../src/models/Event.model.js';
import { isDuplicate } from '../../src/services/dedup.service.js';

describe('dedup.service', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('returns false when event ID does not exist in DB', async () => {
    jest.spyOn(Event, 'findOne').mockReturnValue({
      lean: () => ({
        select: () => Promise.resolve(null),
      }),
    });

    const duplicate = await isDuplicate('evt_fresh_001');
    expect(duplicate).toBe(false);
    expect(Event.findOne).toHaveBeenCalledWith({ id: 'evt_fresh_001' });
  });

  it('returns true when event ID already exists in DB', async () => {
    jest.spyOn(Event, 'findOne').mockReturnValue({
      lean: () => ({
        select: () => Promise.resolve({ id: 'evt_existing_001' }),
      }),
    });

    const duplicate = await isDuplicate('evt_existing_001');
    expect(duplicate).toBe(true);
    expect(Event.findOne).toHaveBeenCalledWith({ id: 'evt_existing_001' });
  });
});
