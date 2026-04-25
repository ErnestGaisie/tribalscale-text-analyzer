import express, { Application } from 'express';
import analyzeRouter from './routes/analyze';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): Application {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api', analyzeRouter);

  app.use(errorHandler);

  return app;
}
