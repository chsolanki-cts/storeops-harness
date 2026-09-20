import { ActivitiesRepository } from './activities.repository';
import {
  Activity,
  ActivityStatus,
  BulkStatusUpdateInput,
  BulkStatusUpdateResponse,
  CreateActivityDto,
  ListActivitiesFilters,
  UpdateActivityDto,
} from './activities.types';
import { NotFoundError, ValidationError } from '../../common/errors';
import { eventBus, Events } from '../../common/eventBus';

const VALID_STATUSES: ActivityStatus[] = ['pending', 'in_progress', 'done', 'cancelled', 'blocked'];
const BULK_ALLOWED_STATUSES = ['done', 'blocked'] as const;

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

  bulkUpdateStatus(input: BulkStatusUpdateInput): BulkStatusUpdateResponse {
    if (!Array.isArray(input.updates) || input.updates.length === 0) {
      throw new ValidationError('updates must be a non-empty array');
    }
    if (!input.updatedBy || !input.updatedBy.trim()) {
      throw new ValidationError('updatedBy is required');
    }

    const updatedActivities: Activity[] = [];
    const failureEntries: Array<{ id: string; error: string }> = [];

    for (const item of input.updates) {
      const isAllowedStatus = (BULK_ALLOWED_STATUSES as readonly string[]).includes(item.status);
      if (!isAllowedStatus) {
        failureEntries.push({ id: item.id, error: 'Invalid status: must be done or blocked' });
        continue;
      }

      const activity = this.repo.findById(item.id);
      if (!activity) {
        failureEntries.push({ id: item.id, error: 'Activity not found' });
        continue;
      }

      const updated = this.repo.update(item.id, { status: item.status });
      if (!updated) {
        failureEntries.push({ id: item.id, error: 'Activity not found' });
        continue;
      }

      this.repo.createAuditEntry({
        activityId: item.id,
        status: item.status,
        updatedBy: input.updatedBy,
        timestamp: new Date().toISOString(),
      });

      eventBus.emit(Events.ACTIVITY_UPDATED, updated);
      updatedActivities.push(updated);
    }

    eventBus.emit(Events.ACTIVITY_BULK_STATUS_UPDATED, {
      updatedBy: input.updatedBy,
      succeeded: updatedActivities,
      failed: failureEntries,
    });

    return {
      total: input.updates.length,
      succeeded: updatedActivities.length,
      failed: failureEntries.length,
      updated: updatedActivities,
      errors: failureEntries,
    };
  }
}
