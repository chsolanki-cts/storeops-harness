import { StaffRepository } from './staff.repository';
import { StaffMember, CreateStaffDto, UpdateStaffDto } from './staff.types';
import { NotFoundError, ValidationError } from '../../common/errors';
import { eventBus, Events } from '../../common/eventBus';

export class StaffService {
  constructor(private readonly repo: StaffRepository) {}

  listStaff(): StaffMember[] {
    return this.repo.findAll();
  }

  getStaffMember(id: string): StaffMember {
    const member = this.repo.findById(id);
    if (!member) throw new NotFoundError('StaffMember', id);
    return member;
  }

  createStaffMember(dto: CreateStaffDto): StaffMember {
    if (!dto.name || !dto.name.trim()) throw new ValidationError('name is required');
    if (!dto.email || !dto.email.trim()) throw new ValidationError('email is required');
    if (!dto.storeId || !dto.storeId.trim()) throw new ValidationError('storeId is required');
    const member = this.repo.create(dto);
    eventBus.emit(Events.STAFF_ASSIGNED, member);
    return member;
  }

  updateStaffMember(id: string, dto: UpdateStaffDto): StaffMember {
    const existing = this.repo.findById(id);
    if (!existing) throw new NotFoundError('StaffMember', id);
    const updated = this.repo.update(id, dto);
    if (!updated) throw new NotFoundError('StaffMember', id);
    return updated;
  }
}
