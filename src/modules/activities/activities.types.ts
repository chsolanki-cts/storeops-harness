export type ActivityStatus = 'pending' | 'in_progress' | 'done' | 'cancelled' | 'blocked';
export type ActivityPriority = 'low' | 'medium' | 'high' | 'critical';
export type ActivityCategory =
  | 'restocking'
  | 'planogram'
  | 'compliance'
  | 'cleaning'
  | 'maintenance'
  | 'customer_service'
  | 'training'
  | 'other';

export interface Activity {
  id: string;
  storeId: string;
  programmeId?: string;
  title: string;
  description: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  category?: ActivityCategory;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityDto {
  storeId: string;
  programmeId?: string;
  title: string;
  description: string;
  priority: ActivityPriority;
  category?: ActivityCategory;
  assignedTo?: string;
}

export interface UpdateActivityDto {
  title?: string;
  description?: string;
  status?: ActivityStatus;
  priority?: ActivityPriority;
  category?: ActivityCategory;
  assignedTo?: string;
}

export interface ListActivitiesFilters {
  programmeId?: string;
  status?: ActivityStatus;
}

export interface BulkStatusUpdateItem {
  id: string;
  status: 'done' | 'blocked';
}

export interface BulkStatusUpdateInput {
  updates: BulkStatusUpdateItem[];
  updatedBy: string;
}

export interface BulkStatusUpdateError {
  id: string;
  error: string;
}

export interface BulkStatusUpdateResponse {
  total: number;
  succeeded: number;
  failed: number;
  updated: Activity[];
  errors: BulkStatusUpdateError[];
}

export interface AuditEntry {
  id: string;
  activityId: string;
  status: ActivityStatus;
  updatedBy: string;
  timestamp: string;
}
