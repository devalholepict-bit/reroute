/**
 * Loads and validates required environment variables.
 * Fails fast with a clear message if any are missing.
 */

const REQUIRED_VARS = ['MONGO_URI', 'PORT'];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    `\n❌  Missing required environment variables:\n` +
      missing.map((v) => `   - ${v}`).join('\n') +
      `\n\nCreate a .env file in server/ with these variables. See .env.example.\n`
  );
  process.exit(1);
}

export const env = Object.freeze({
  MONGO_URI: process.env.MONGO_URI,
  PORT: parseInt(process.env.PORT, 10) || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:5001',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || 'sample_webhook_secret_key_12345',
  SIMULATOR_DEV_SECRET: process.env.SIMULATOR_DEV_SECRET || 'dev_secret_reroute_2026',
});

