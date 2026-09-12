import express, { Request, Response, NextFunction } from 'express';
import { createActivitiesRouter } from './modules/activities/activities.routes';
import { createProgrammesRouter } from './modules/programmes/programmes.routes';
import { createStaffRouter } from './modules/staff/staff.routes';
import { createAlertsRouter } from './modules/alerts/alerts.routes';
import { createReportsRouter } from './modules/reports/reports.routes';
import { AppError } from './common/errors';

export function createApp(): express.Application {
  const app = express();

  app.use(express.json());

  app.use('/api/activities', createActivitiesRouter());
  app.use('/api/programmes', createProgrammesRouter());
  app.use('/api/staff', createStaffRouter());
  app.use('/api/alerts', createAlertsRouter());
  app.use('/api/reports', createReportsRouter());

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: { code: err.code, message: err.message },
      });
      return;
    }
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  });

  return app;
}

export const app = createApp();
