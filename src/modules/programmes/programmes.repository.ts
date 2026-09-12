import { randomUUID } from 'crypto';
import { Programme, CreateProgrammeDto } from './programmes.types';

export class ProgrammesRepository {
  private readonly store = new Map<string, Programme>();

  findAll(): Programme[] {
    return Array.from(this.store.values());
  }

  findById(id: string): Programme | undefined {
    return this.store.get(id);
  }

  create(dto: CreateProgrammeDto): Programme {
    const now = new Date().toISOString();
    const programme: Programme = {
      id: randomUUID(),
      storeId: dto.storeId,
      name: dto.name,
      description: dto.description,
      type: dto.type,
      status: 'draft',
      startDate: dto.startDate,
      endDate: dto.endDate,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(programme.id, programme);
    return programme;
  }

  update(
    id: string,
    changes: Partial<Omit<Programme, 'id' | 'createdAt'>>,
  ): Programme | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    const updated: Programme = {
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
