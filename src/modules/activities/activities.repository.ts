import { randomUUID } from 'crypto';
import { Activity, CreateActivityDto, ListActivitiesFilters } from './activities.types';

export class ActivitiesRepository {
  private readonly store = new Map<string, Activity>();

  findAll(): Activity[] {
    return Array.from(this.store.values());
  }

  findByFilters(filters: ListActivitiesFilters): Activity[] {
    return this.findAll().filter((a) => {
      if (filters.programmeId !== undefined && a.programmeId !== filters.programmeId) return false;
      if (filters.status !== undefined && a.status !== filters.status) return false;
      return true;
    });
  }

  findById(id: string): Activity | undefined {
    return this.store.get(id);
  }

  create(dto: CreateActivityDto): Activity {
    const now = new Date().toISOString();
    const activity: Activity = {
      id: randomUUID(),
      storeId: dto.storeId,
      programmeId: dto.programmeId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      category: dto.category,
      status: 'pending',
      assignedTo: dto.assignedTo,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(activity.id, activity);
    return activity;
  }

  update(id: string, changes: Partial<Omit<Activity, 'id' | 'createdAt'>>): Activity | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    const updated: Activity = {
      ...existing,
      ...changes,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }
}
