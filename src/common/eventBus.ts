import { EventEmitter } from 'events';

class EventBus extends EventEmitter {}

export const eventBus = new EventBus();

export const Events = {
  ACTIVITY_CREATED: 'activity:created',
  ACTIVITY_UPDATED: 'activity:updated',
  ACTIVITY_DELETED: 'activity:deleted',
  PROGRAMME_CREATED: 'programme:created',
  PROGRAMME_MEMBER_ADDED: 'programme:member_added',
  ALERT_RAISED: 'alert:raised',
  STAFF_ASSIGNED: 'staff:assigned',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];
