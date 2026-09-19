import { Router, Request, Response, NextFunction } from 'express';
import { ActivitiesRepository } from './activities.repository';
import { ActivitiesService } from './activities.service';
import { ActivityStatus, CreateActivityDto, UpdateActivityDto } from './activities.types';

export function createActivitiesRouter(): Router {
  const repo = new ActivitiesRepository();
  const service = new ActivitiesService(repo);
  const router = Router();

  router.get('/', (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { programme, status } = req.query;
      res.json(
        service.listActivities({
          programmeId: typeof programme === 'string' ? programme : undefined,
          status: typeof status === 'string' ? (status as ActivityStatus) : undefined,
        }),
      );
    } catch (err) {
      next(err);
    }
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

  router.delete('/:id', (req: Request, res: Response, next: NextFunction): void => {
    try {
      service.deleteActivity(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
