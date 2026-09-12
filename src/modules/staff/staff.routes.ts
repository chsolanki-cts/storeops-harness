import { Router, Request, Response, NextFunction } from 'express';
import { StaffRepository } from './staff.repository';
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto } from './staff.types';

export function createStaffRouter(): Router {
  const repo = new StaffRepository();
  const service = new StaffService(repo);
  const router = Router();

  router.get('/', (_req: Request, res: Response): void => {
    res.json(service.listStaff());
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(service.getStaffMember(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.status(201).json(service.createStaffMember(req.body as CreateStaffDto));
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(service.updateStaffMember(req.params.id, req.body as UpdateStaffDto));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
