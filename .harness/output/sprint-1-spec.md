# Specification Document: Shift Handover Bulk Status Update

**STATUS: APPROVED**
*Note: This specification has been reviewed and approved by the human developer.*

---

## 1. Executive Summary & Problem Statement

During shift handover in retail store operations, outgoing staff need to batch-update multiple operational activity statuses in a single API call. Currently, the activities module only supports single-item PATCH updates (`PATCH /api/activities/:id`), requiring N round-trips for N activities — an impractical workflow during time-sensitive handover windows.

This sprint adds `PATCH /api/activities/bulk-status`, allowing an outgoing shift member to mark multiple activities as `done` or `blocked` atomically-per-item (partial failures are tolerated — valid items are updated even if some fail) and records an audit entry for each successfully updated activity so handover accountability is preserved.

**Target actors**: Outgoing shift staff (store operational roles).

**Expected system impact**:
- New route and service method added to the `activities` module.
- The existing `ActivityStatus` value `'completed'` is renamed to `'done'` everywhere it appears in `src/modules/activities/` (types, repository seed data, existing tests, etc.), and `'blocked'` is added as a new value.
- A new `AuditEntry` type stored within the `activities` module repository.
- A new `activity.bulk_status_updated` event emitted on the `EventBus` after each successful bulk operation, allowing downstream modules (e.g. `alerts`, `reports`) to react without coupling.

---

## 2. User Stories & Structured Intent

## Story: Bulk activity status update during shift handover

As an outgoing shift staff member, I want to mark multiple operational activities as `done` or `blocked` in a single API request, so that I can complete shift handover quickly and accurately without making individual updates per task.

**Assumptions:**
- "Audit entry per updated task" means storing a lightweight audit record (`AuditEntry`) inside the `activities` module repository. A separate audit module is out of scope for this sprint.
- The `updatedBy` field in the request body is an unvalidated staff identifier string (foreign-key validation against the `staff` module is out of scope for this sprint — no cross-module service call is required at this stage).
- The only statuses permitted by the bulk endpoint are `done` and `blocked`; attempting any other status value is a validation error for the affected item (counted as a failure, not a request-level 400).
- An empty `updates` array is a request-level validation error (400) — a bulk operation with zero items is meaningless.
- Activities in a terminal status (`done`, `cancelled`) may still be re-marked (e.g. re-marking a `done` task as `blocked`) — no domain-transition guard is applied in this sprint. (`done` replaces the former `completed` status; `cancelled` is unchanged.)
- The `AuditEntry` is an append-only record; no endpoint to read audit history is delivered in this sprint.
- The `activity.bulk_status_updated` event is the only new event; `activity:updated` is also emitted per item (reusing the existing event type) so existing subscribers are not broken.

**Out-of-scope:**
- Authentication / role-based access control.
- Reading audit history via a new endpoint.
- Validating `updatedBy` against the staff module.
- Status transition guards (e.g. preventing re-opening a `done` task).
- Pagination or filtering on the bulk endpoint response.

---

## 3. Architecture & Module Design

### Target Module(s)
All logic lives within the `activities` module (`src/modules/activities/`). No new module is created.

### Layering

#### Routes (`activities.routes.ts`)
- Register `PATCH /bulk-status` on the activities router.
- Mounted at `/api/activities`, so the full path is `PATCH /api/activities/bulk-status`.
- **Ordering constraint**: this static route segment (`bulk-status`) MUST be registered in the router BEFORE the existing dynamic `PATCH /:id` handler to avoid Express matching `bulk-status` as an `:id` parameter.
- Extract `req.body` as `BulkStatusUpdateInput` and delegate to the service; no validation logic in the route.
- On success, respond `200` with `BulkStatusUpdateResponse`.
- Errors propagate via `next(err)` to the global `errorHandler`.

#### Service (`activities.service.ts`)
New method: `bulkUpdateStatus(input: BulkStatusUpdateInput): BulkStatusUpdateResponse`

Business rules:
1. Validate that `input.updates` is a non-empty array; throw `ValidationError('updates must be a non-empty array')` if empty or missing.
2. Validate that `input.updatedBy` is a non-empty string; throw `ValidationError('updatedBy is required')` if missing/blank.
3. For each item in `input.updates`:
   a. Validate that `item.status` is one of `['done', 'blocked']`; if not, record a failure entry (`{ id: item.id, error: 'Invalid status: must be done or blocked' }`).
   b. Look up the activity by `item.id` via the repository; if not found, record a failure entry (`{ id: item.id, error: 'Activity not found' }`).
   c. If valid and found: call `repo.update(item.id, { status: item.status })` and `repo.createAuditEntry({ activityId: item.id, status: item.status, updatedBy: input.updatedBy, timestamp })`.
   d. Emit `eventBus.emit(Events.ACTIVITY_UPDATED, updatedActivity)` per successful item (preserves existing subscriber contracts).
4. After processing all items, emit `eventBus.emit(Events.ACTIVITY_BULK_STATUS_UPDATED, { updatedBy: input.updatedBy, succeeded: updatedActivities, failed: failureEntries })` once.
5. Return a `BulkStatusUpdateResponse` with `total`, `succeeded`, `failed`, `updated[]`, `errors[]`.

**No raw `throw new Error(...)` anywhere** — only `ValidationError` and `NotFoundError` from `src/common/errors.ts`.

#### Repository (`activities.repository.ts`)
- Add a `private readonly auditStore: AuditEntry[]` array for append-only audit records.
- Add `createAuditEntry(entry: Omit<AuditEntry, 'id'>): AuditEntry` method.
- Add `findAuditEntriesByActivityId(activityId: string): AuditEntry[]` method (future-proofing; not exposed via route in this sprint).
- The existing `update()` method is reused unchanged.

### Cross-Module Communication

#### Direct read-only lookups
None. `updatedBy` is an opaque string this sprint; no `StaffService` lookup required.

#### Event bus events
Two events are emitted by the service:

| Event constant | Event type string | When emitted |
| --- | --- | --- |
| `Events.ACTIVITY_UPDATED` | `'activity:updated'` | Once per successfully updated activity (reuses existing event — no subscriber changes needed) |
| `Events.ACTIVITY_BULK_STATUS_UPDATED` | `'activity:bulk_status_updated'` | Once per bulk operation, after all items processed |

`Events.ACTIVITY_BULK_STATUS_UPDATED` must be added to the `Events` const object in `src/common/eventBus.ts`. No subscriber is wired in this sprint (no handler registered in `src/app.ts`), but the event is published so future subscribers can react without modifying the activities module.

### Error Handling

| Condition | Error type | HTTP status |
| --- | --- | --- |
| `updates` missing or empty array | `ValidationError` | 400 |
| `updatedBy` missing or blank | `ValidationError` | 400 |
| Per-item: `status` not `done`/`blocked` | Recorded as item-level failure; no thrown error | (counted in `errors[]`) |
| Per-item: activity not found | Recorded as item-level failure; no thrown error | (counted in `errors[]`) |

Item-level failures never abort the entire request — partial success is the intended behavior. Request-level validation errors (`ValidationError`) do abort immediately with 400.

---

## 4. Data Models & API Contracts

### New / Modified TypeScript Types (`activities.types.ts`)

**Rename `'completed'` → `'done'` and add `'blocked'`** in `ActivityStatus` (the old `'completed'` member is removed):
```typescript
export type ActivityStatus = 'pending' | 'in_progress' | 'done' | 'cancelled' | 'blocked';
```
All existing occurrences of `'completed'` in `src/modules/activities/` (seed data, tests, any existing references) must be renamed to `'done'` as part of this task.

**New types:**
```typescript
export interface BulkStatusUpdateItem {
  id: string;
  status: 'done' | 'blocked';
}

export interface BulkStatusUpdateInput {
  updates: BulkStatusUpdateItem[];
  updatedBy: string;
}

export interface BulkStatusUpdateError {
  id: string;
  error: string;
}

export interface BulkStatusUpdateResponse {
  total: number;
  succeeded: number;
  failed: number;
  updated: Activity[];
  errors: BulkStatusUpdateError[];
}

export interface AuditEntry {
  id: string;
  activityId: string;
  status: ActivityStatus;
  updatedBy: string;
  timestamp: string;
}
```

### REST Endpoint Specification

**`PATCH /api/activities/bulk-status`**

| Property | Value |
| --- | --- |
| Method | `PATCH` |
| Path | `/api/activities/bulk-status` |
| Content-Type | `application/json` |
| Request body | `BulkStatusUpdateInput` |
| Success status | `200 OK` |
| Error statuses | `400 Bad Request` |

Request body schema:
```json
{
  "updates": [
    { "id": "string", "status": "done | blocked" },
    ...
  ],
  "updatedBy": "string"
}
```

Success response body (`BulkStatusUpdateResponse`):
```json
{
  "total": 3,
  "succeeded": 2,
  "failed": 1,
  "updated": [ /* Activity objects */ ],
  "errors": [
    { "id": "missing-id", "error": "Activity not found" }
  ]
}
```

Error response body (request-level validation failure):
```json
{
  "error": { "code": "VALIDATION_ERROR", "message": "updates must be a non-empty array" }
}
```

### Normalized Endpoint Contract Table

| Method | Normalized Path | Success Status | Error Status(es) | Required Response Properties |
| --- | --- | --- | --- | --- |
| `PATCH` | `/api/activities/bulk-status` | 200 | 400 | `total`, `succeeded`, `failed`, `updated`, `errors` |

*Note: 404 is never returned at the request level — not-found activities are reported as item-level failures inside `errors[]`. The only request-level error is 400 (validation).*

---

## 5. Security & Edge Case Considerations

### Validation Boundaries
- Maximum items per request: not capped in this sprint (no DOS protection — out of scope for a stub API).
- `updates` must be an array (even if Express parses a non-array JSON value, the service validates the shape).
- `id` values that are non-string or empty strings are treated as not-found (no special pre-validation; the repository lookup will return `undefined`).

### Concurrent / Duplicate State Handling
- Duplicate `id` values within a single request are processed sequentially; the second occurrence will find the activity already updated and will succeed (re-writing the same or a new status). This is acceptable in-memory behavior for this sprint.
- No optimistic locking or concurrency control is applied.

### Route Ordering
- The static `PATCH /bulk-status` route must be declared before `PATCH /:id` in the router to prevent Express from treating `bulk-status` as an activity ID. This is an ordering constraint, not a security issue, but is flagged here as it is a common mistake.

### No Credentials or Secrets
- `updatedBy` is stored as plain string. No tokens, passwords, or PII are written to the audit store in this sprint.
