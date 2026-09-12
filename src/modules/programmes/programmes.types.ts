export type ProgrammeType =
  | 'training'
  | 'compliance'
  | 'promotion'
  | 'maintenance'
  | 'customer_experience';

export type ProgrammeStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface Programme {
  id: string;
  storeId: string;
  name: string;
  description: string;
  type: ProgrammeType;
  status: ProgrammeStatus;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProgrammeDto {
  storeId: string;
  name: string;
  description: string;
  type: ProgrammeType;
  startDate: string;
  endDate?: string;
}

export interface UpdateProgrammeDto {
  name?: string;
  description?: string;
  status?: ProgrammeStatus;
  endDate?: string;
}
