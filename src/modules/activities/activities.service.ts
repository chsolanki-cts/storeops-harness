import { ActivitiesRepository } from './activities.repository';
import {
  Activity,
  ActivityStatus,
  CreateActivityDto,
  ListActivitiesFilters,
  UpdateActivityDto,
} from './activities.types';
import { NotFoundError, ValidationError } from '../../common/errors';
import { eventBus, Events } from '../../common/eventBus';

const VALID_STATUSES: ActivityStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];

export class ActivitiesService {
  constructor(private readonly repo: ActivitiesRepository) {}

  listActivities(filters: ListActivitiesFilters = {}): Activity[] {
    if (filters.status !== undefined && !VALID_STATUSES.includes(filters.status)) {
      throw new ValidationError(`Invalid status value: ${filters.status}`);
    }
    return this.repo.findByFilters(filters);
  }

  getActivity(id: string): Activity {
    const activity = this.repo.findById(id);
    if (!activity) throw new NotFoundError('Activity', id);
    return activity;
  }

  createActivity(dto: CreateActivityDto): Activity {
    if (!dto.title || !dto.title.trim()) throw new ValidationError('title is required');
    if (!dto.storeId || !dto.storeId.trim()) throw new ValidationError('storeId is required');
    const activity = this.repo.create(dto);
    eventBus.emit(Events.ACTIVITY_CREATED, activity);
    return activity;
  }

  updateActivity(id: string, dto: UpdateActivityDto): Activity {
    const existing = this.repo.findById(id);
    if (!existing) throw new NotFoundError('Activity', id);
    const updated = this.repo.update(id, dto);
    if (!updated) throw new NotFoundError('Activity', id);
    eventBus.emit(Events.ACTIVITY_UPDATED, updated);
    return updated;
  }

  deleteActivity(id: string): void {
    const existing = this.repo.findById(id);
    if (!existing) throw new NotFoundError('Activity', id);
    this.repo.delete(id);
    eventBus.emit(Events.ACTIVITY_DELETED, { id });
  }
}
