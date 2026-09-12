import { ActivitiesRepository } from './activities.repository';
import { Activity, CreateActivityDto, UpdateActivityDto } from './activities.types';
import { NotFoundError, ValidationError } from '../../common/errors';
import { eventBus, Events } from '../../common/eventBus';

export class ActivitiesService {
  constructor(private readonly repo: ActivitiesRepository) {}

  listActivities(): Activity[] {
    return this.repo.findAll();
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
}
