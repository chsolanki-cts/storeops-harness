import { Router, Request, Response, NextFunction } from 'express';
import { ActivitiesRepository } from './activities.repository';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto, UpdateActivityDto } from './activities.types';

export function createActivitiesRouter(): Router {
  const repo = new ActivitiesRepository();
  const service = new ActivitiesService(repo);
  const router = Router();

  router.get('/', (_req: Request, res: Response): void => {
    res.json(service.listActivities());
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(service.getActivity(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.status(201).json(service.createActivity(req.body as CreateActivityDto));
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(service.updateActivity(req.params.id, req.body as UpdateActivityDto));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
