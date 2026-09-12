import { randomUUID } from 'crypto';
import { StaffMember, CreateStaffDto } from './staff.types';

export class StaffRepository {
  private readonly store = new Map<string, StaffMember>();

  findAll(): StaffMember[] {
    return Array.from(this.store.values());
  }

  findById(id: string): StaffMember | undefined {
    return this.store.get(id);
  }

  findByStoreId(storeId: string): StaffMember[] {
    return Array.from(this.store.values()).filter((s) => s.storeId === storeId);
  }

  create(dto: CreateStaffDto): StaffMember {
    const now = new Date().toISOString();
    const member: StaffMember = {
      id: randomUUID(),
      storeId: dto.storeId,
      name: dto.name,
      role: dto.role,
      email: dto.email,
      department: dto.department,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(member.id, member);
    return member;
  }

  update(
    id: string,
    changes: Partial<Omit<StaffMember, 'id' | 'createdAt'>>,
  ): StaffMember | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    const updated: StaffMember = {
      ...existing,
      ...changes,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return updated;
  }
}
