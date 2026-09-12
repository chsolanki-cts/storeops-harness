import { Router, Request, Response, NextFunction } from 'express';
import { ProgrammesRepository } from './programmes.repository';
import { ProgrammesService } from './programmes.service';
import { CreateProgrammeDto, UpdateProgrammeDto } from './programmes.types';

export function createProgrammesRouter(): Router {
  const repo = new ProgrammesRepository();
  const service = new ProgrammesService(repo);
  const router = Router();

  router.get('/', (_req: Request, res: Response): void => {
    res.json(service.listProgrammes());
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(service.getProgramme(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.status(201).json(service.createProgramme(req.body as CreateProgrammeDto));
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(service.updateProgramme(req.params.id, req.body as UpdateProgrammeDto));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
