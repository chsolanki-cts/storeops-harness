export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
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
