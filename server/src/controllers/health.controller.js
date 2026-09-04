import mongoose from 'mongoose';

export const getHealth = async (_req, res) => {
  let dbStatus = 'disconnected';

  try {
    if (mongoose.connection.readyState === 1) {
      // Lightweight ping to verify real connectivity
      await mongoose.connection.db.admin().ping();
      dbStatus = 'connected';
    }
  } catch {
    dbStatus = 'disconnected';
  }

  res.json({
    status: 'ok',
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
};
