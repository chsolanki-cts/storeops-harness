export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ActivityPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Activity {
  id: string;
  storeId: string;
  title: string;
  description: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityDto {
  storeId: string;
  title: string;
  description: string;
  priority: ActivityPriority;
  assignedTo?: string;
}

export interface UpdateActivityDto {
  title?: string;
  description?: string;
  status?: ActivityStatus;
  priority?: ActivityPriority;
  assignedTo?: string;
}
