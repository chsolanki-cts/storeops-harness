export type StaffRole =
  | 'store_manager'
  | 'department_manager'
  | 'supervisor'
  | 'associate'
  | 'cashier';

export type StaffStatus = 'active' | 'inactive' | 'on_leave';

export interface StaffMember {
  id: string;
  storeId: string;
  name: string;
  role: StaffRole;
  email: string;
  department?: string;
  status: StaffStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffDto {
  storeId: string;
  name: string;
  role: StaffRole;
  email: string;
  department?: string;
}

export interface UpdateStaffDto {
  name?: string;
  role?: StaffRole;
  status?: StaffStatus;
  department?: string;
}
