import { Router, Request, Response, NextFunction } from 'express';
import { AlertsRepository } from './alerts.repository';
import { AlertsService } from './alerts.service';
import { CreateAlertDto, UpdateAlertDto } from './alerts.types';

export function createAlertsRouter(): Router {
  const repo = new AlertsRepository();
  const service = new AlertsService(repo);
  const router = Router();

  router.get('/', (_req: Request, res: Response): void => {
    res.json(service.listAlerts());
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(service.getAlert(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.status(201).json(service.raiseAlert(req.body as CreateAlertDto));
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(service.updateAlert(req.params.id, req.body as UpdateAlertDto));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
