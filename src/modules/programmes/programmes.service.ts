import { ProgrammesRepository } from './programmes.repository';
import {
  Programme,
  CreateProgrammeDto,
  UpdateProgrammeDto,
  AddProgrammeMemberDto,
} from './programmes.types';
import { NotFoundError, ValidationError, ConflictError } from '../../common/errors';
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

  addMember(programmeId: string, dto: AddProgrammeMemberDto): Programme {
    const programme = this.repo.findById(programmeId);
    if (!programme) throw new NotFoundError('Programme', programmeId);
    if (!dto.staffId || !dto.staffId.trim()) throw new ValidationError('staffId is required');
    if (!dto.role) throw new ValidationError('role is required');
    const alreadyMember = programme.members.some((m) => m.staffId === dto.staffId);
    if (alreadyMember) {
      throw new ConflictError(`Staff member '${dto.staffId}' is already in this programme`);
    }
    const updated = this.repo.addMember(programmeId, {
      staffId: dto.staffId,
      role: dto.role,
      joinedAt: new Date().toISOString(),
    });
    if (!updated) throw new NotFoundError('Programme', programmeId);
    eventBus.emit(Events.PROGRAMME_MEMBER_ADDED, { programmeId, staffId: dto.staffId, role: dto.role });
    return updated;
  }
}
