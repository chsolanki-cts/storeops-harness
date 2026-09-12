import { randomUUID } from 'crypto';
import { Report, GetReportQuery } from './reports.types';

export class ReportsRepository {
  private readonly store = new Map<string, Report>();

  constructor() {
    this.seed();
  }

  private seed(): void {
    const stub: Report = {
      id: randomUUID(),
      storeId: 'store-1',
      regionId: 'region-north',
      period: 'monthly',
      generatedAt: new Date().toISOString(),
      metrics: {
        activityCount: 42,
        completedActivities: 35,
        openAlerts: 3,
        criticalAlerts: 1,
        activeProgrammes: 5,
        staffCount: 12,
      },
    };
    this.store.set(stub.id, stub);
  }

  findAll(query: GetReportQuery): Report[] {
    return Array.from(this.store.values()).filter((r) => {
      if (query.storeId && r.storeId !== query.storeId) return false;
      if (query.regionId && r.regionId !== query.regionId) return false;
      if (query.period && r.period !== query.period) return false;
      return true;
    });
  }

  findById(id: string): Report | undefined {
    return this.store.get(id);
  }
}
