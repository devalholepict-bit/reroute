import Policy from '../models/Policy.model.js';

export const getPolicies = async (req, res) => {
  try {
    const policies = await Policy.find({}).sort({ created_at: 1 }).lean();
    return res.status(200).json(policies);
  } catch (err) {
    console.error('[policy] Error fetching policies:', err);
    return res.status(500).json({ error: 'Failed to fetch policies' });
  }
};
