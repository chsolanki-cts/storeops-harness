import { EventEmitter } from 'events';

class EventBus extends EventEmitter {}

export const eventBus = new EventBus();

export const Events = {
  ACTIVITY_CREATED: 'activity:created',
  ACTIVITY_UPDATED: 'activity:updated',
  PROGRAMME_CREATED: 'programme:created',
  ALERT_RAISED: 'alert:raised',
  STAFF_ASSIGNED: 'staff:assigned',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];
