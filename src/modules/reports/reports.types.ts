export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface StoreMetrics {
  activityCount: number;
  completedActivities: number;
  openAlerts: number;
  criticalAlerts: number;
  activeProgrammes: number;
  staffCount: number;
}

export interface Report {
  id: string;
  storeId: string;
  regionId?: string;
  period: ReportPeriod;
  generatedAt: string;
  metrics: StoreMetrics;
}

export interface GetReportQuery {
  storeId?: string;
  regionId?: string;
  period?: ReportPeriod;
}
