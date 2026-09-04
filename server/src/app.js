import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import simulatorRoutes from './routes/simulator.routes.js';
import webhooksRoutes from './routes/webhooks.routes.js';
import policyRoutes from './routes/policy.routes.js';
import promisesRoutes from './routes/promises.routes.js';
import auditRoutes from './routes/audit.routes.js';
import casesRoutes from './routes/cases.routes.js';
import metricsRoutes from './routes/metrics.routes.js';
import { dbGuard } from './middleware/dbGuard.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

const corsOrigin = (env.CLIENT_ORIGIN || 'http://localhost:5173').includes(',')
  ? env.CLIENT_ORIGIN.split(',').map((s) => s.trim())
  : env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);


// 1. Health Probe (always responds even if DB is down)
app.use('/api/health', healthRoutes);

// 2. Webhooks Ingestion (responds 200 safely to prevent external retry storms)
app.use('/api/webhooks', webhooksRoutes);

// 3. Database-Dependent Endpoints (guarded with fast-fail 503 if MongoDB is unavailable)
app.use('/api/simulator', dbGuard, simulatorRoutes);
app.use('/api/policies', dbGuard, policyRoutes);
app.use('/api/promises', dbGuard, promisesRoutes);
app.use('/api/audit', dbGuard, auditRoutes);
app.use('/api/cases', dbGuard, casesRoutes);
app.use('/api/metrics', dbGuard, metricsRoutes);

// 4. 404 Catch-All Handler for Unknown Routes
app.use((req, res) => {
  return res.status(404).json({
    error: true,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
    details: { method: req.method, path: req.originalUrl },
  });
});

// 5. Central Error Handler
app.use(errorHandler);

export default app;
