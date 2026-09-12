import { Router, Request, Response, NextFunction } from 'express';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';
import { GetReportQuery, ReportPeriod } from './reports.types';

export function createReportsRouter(): Router {
  const repo = new ReportsRepository();
  const service = new ReportsService(repo);
  const router = Router();

  router.get('/', (req: Request, res: Response): void => {
    const query: GetReportQuery = {
      storeId: req.query.storeId as string | undefined,
      regionId: req.query.regionId as string | undefined,
      period: req.query.period as ReportPeriod | undefined,
    };
    res.json(service.getReports(query));
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(service.getReport(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
