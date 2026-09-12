export type AlertType = 'safety' | 'compliance' | 'operational' | 'inventory' | 'security';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';

export interface Alert {
  id: string;
  storeId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
  createdAt: string;
  resolvedAt?: string;
  updatedAt: string;
}

export interface CreateAlertDto {
  storeId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
}

export interface UpdateAlertDto {
  status?: AlertStatus;
  resolvedAt?: string;
}
