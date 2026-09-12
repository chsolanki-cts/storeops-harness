import { randomUUID } from 'crypto';
import { Alert, CreateAlertDto } from './alerts.types';

export class AlertsRepository {
  private readonly store = new Map<string, Alert>();

  findAll(): Alert[] {
    return Array.from(this.store.values());
  }

  findById(id: string): Alert | undefined {
    return this.store.get(id);
  }

  create(dto: CreateAlertDto): Alert {
    const now = new Date().toISOString();
    const alert: Alert = {
      id: randomUUID(),
      storeId: dto.storeId,
      type: dto.type,
      severity: dto.severity,
      message: dto.message,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(alert.id, alert);
    return alert;
  }

  update(id: string, changes: Partial<Omit<Alert, 'id' | 'createdAt'>>): Alert | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    const updated: Alert = {
      ...existing,
      ...changes,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return updated;
  }
}
