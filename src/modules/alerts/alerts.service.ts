import { AlertsRepository } from './alerts.repository';
import { Alert, CreateAlertDto, UpdateAlertDto } from './alerts.types';
import { NotFoundError, ValidationError } from '../../common/errors';
import { eventBus, Events } from '../../common/eventBus';

export class AlertsService {
  constructor(private readonly repo: AlertsRepository) {}

  listAlerts(): Alert[] {
    return this.repo.findAll();
  }

  getAlert(id: string): Alert {
    const alert = this.repo.findById(id);
    if (!alert) throw new NotFoundError('Alert', id);
    return alert;
  }

  raiseAlert(dto: CreateAlertDto): Alert {
    if (!dto.message || !dto.message.trim()) throw new ValidationError('message is required');
    if (!dto.storeId || !dto.storeId.trim()) throw new ValidationError('storeId is required');
    const alert = this.repo.create(dto);
    eventBus.emit(Events.ALERT_RAISED, alert);
    return alert;
  }

  updateAlert(id: string, dto: UpdateAlertDto): Alert {
    const existing = this.repo.findById(id);
    if (!existing) throw new NotFoundError('Alert', id);
    const updated = this.repo.update(id, dto);
    if (!updated) throw new NotFoundError('Alert', id);
    return updated;
  }
}
