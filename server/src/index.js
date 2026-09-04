import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Dynamic imports AFTER dotenv has loaded process.env
const { env } = await import('./config/env.js');
const { connectDB } = await import('./config/db.js');
const { default: app } = await import('./app.js');
const { seedPolicies } = await import('../../scripts/seed-policies.js');

const start = async () => {
  await connectDB();
  await seedPolicies();
  app.listen(env.PORT, () => {
    console.log(`[server] Running on http://localhost:${env.PORT}`);
  });
};

start().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
