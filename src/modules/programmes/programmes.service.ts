import { ProgrammesRepository } from './programmes.repository';
import { Programme, CreateProgrammeDto, UpdateProgrammeDto } from './programmes.types';
import { NotFoundError, ValidationError } from '../../common/errors';
import { eventBus, Events } from '../../common/eventBus';

export class ProgrammesService {
  constructor(private readonly repo: ProgrammesRepository) {}

  listProgrammes(): Programme[] {
    return this.repo.findAll();
  }

  getProgramme(id: string): Programme {
    const programme = this.repo.findById(id);
    if (!programme) throw new NotFoundError('Programme', id);
    return programme;
  }

  createProgramme(dto: CreateProgrammeDto): Programme {
    if (!dto.name || !dto.name.trim()) throw new ValidationError('name is required');
    if (!dto.storeId || !dto.storeId.trim()) throw new ValidationError('storeId is required');
    if (!dto.startDate || !dto.startDate.trim()) throw new ValidationError('startDate is required');
    const programme = this.repo.create(dto);
    eventBus.emit(Events.PROGRAMME_CREATED, programme);
    return programme;
  }

  updateProgramme(id: string, dto: UpdateProgrammeDto): Programme {
    const existing = this.repo.findById(id);
    if (!existing) throw new NotFoundError('Programme', id);
    const updated = this.repo.update(id, dto);
    if (!updated) throw new NotFoundError('Programme', id);
    return updated;
  }
}
