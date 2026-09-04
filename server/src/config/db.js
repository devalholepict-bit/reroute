import mongoose from 'mongoose';
import { env } from './env.js';

// Setup Mongoose connection event listeners
mongoose.connection.on('connected', () => {
  console.log('[db] MongoDB connected successfully');
});

mongoose.connection.on('disconnected', () => {
  console.warn('[db] MongoDB disconnected — operating in degraded mode');
});

mongoose.connection.on('error', (err) => {
  console.error('[db] MongoDB connection error:', err.message);
});

mongoose.connection.on('reconnected', () => {
  console.log('[db] MongoDB reconnected successfully');
});

/**
 * Connect to MongoDB instance without exiting on initial failure
 */
export const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
  } catch (err) {
    console.error('[db] Initial MongoDB connection error:', err.message);
    // Don't exit process — health endpoint will report "disconnected"
  }
};

/**
 * Returns true if the database connection is fully active
 */
export const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};
