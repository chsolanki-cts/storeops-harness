# Sprint 1 Contract: Shift Handover Bulk Status Update

**STATUS: DONE**

---

## 1. Sprint Objectives & Scope

**Sprint Goal**: Deliver `PATCH /api/activities/bulk-status` so outgoing shift staff can mark multiple operational activities as `done` or `blocked` in a single request, with partial-failure tolerance and a per-item audit entry.

**In-Scope:**
- Rename the existing `ActivityStatus` value `'completed'` to `'done'` everywhere it appears in `src/modules/activities/` (types, repository seed data, existing tests, any other references), and add `'blocked'` as a new value. The resulting union is `'pending' | 'in_progress' | 'done' | 'cancelled' | 'blocked'` (no `'completed'`).
- New types: `BulkStatusUpdateItem`, `BulkStatusUpdateInput`, `BulkStatusUpdateError`, `BulkStatusUpdateResponse`, `AuditEntry`.
- New repository method `createAuditEntry()` and `findAuditEntriesByActivityId()` on `ActivitiesRepository`.
- New service method `bulkUpdateStatus()` on `ActivitiesService` with partial-failure handling, audit recording, and event emission.
- New route `PATCH /bulk-status` wired before the existing `PATCH /:id` handler on the activities router.
- Add `ACTIVITY_BULK_STATUS_UPDATED` constant to `src/common/eventBus.ts` Events object.
- Emit `activity:updated` per successfully updated item and `activity:bulk_status_updated` once per operation.
- Unit tests in `tests/activities.test.ts` covering all acceptance criteria below.

**Out-of-Scope:**
- Authentication / role-based access control.
- `GET /api/activities/audit` or any endpoint exposing audit history.
- Validating `updatedBy` against the `staff` module.
- Status transition guards (e.g. blocking re-opening of a `done` task).
- Wiring a subscriber to `activity:bulk_status_updated` in `src/app.ts`.
- Rate limiting or maximum-items guard on the bulk endpoint.

---

## 2. Acceptance Criteria (GIVEN / WHEN / THEN)

### AC1: Successful bulk update — all items valid
- GIVEN activities with IDs `id-A` and `id-B` exist with status `pending`
- WHEN `PATCH /api/activities/bulk-status` is called with `{ updates: [{ id: "id-A", status: "done" }, { id: "id-B", status: "blocked" }], updatedBy: "staff-1" }`
- THEN the response is `200` with body `{ total: 2, succeeded: 2, failed: 0, updated: [<Activity id-A with status "done">, <Activity id-B with status "blocked">], errors: [] }`

### AC2: Partial failure — one activity not found
- GIVEN activity with ID `id-A` exists; `id-MISSING` does not exist
- WHEN `PATCH /api/activities/bulk-status` is called with `{ updates: [{ id: "id-A", status: "done" }, { id: "id-MISSING", status: "done" }], updatedBy: "staff-1" }`
- THEN the response is `200` with `succeeded: 1`, `failed: 1`, `updated` contains the updated `id-A` Activity, and `errors` contains `{ id: "id-MISSING", error: "Activity not found" }`

### AC3: Partial failure — one item has invalid status
- GIVEN activity with ID `id-A` exists
- WHEN `PATCH /api/activities/bulk-status` is called with `{ updates: [{ id: "id-A", status: "done" }, { id: "id-A", status: "in_progress" }], updatedBy: "staff-1" }`
- THEN the response is `200` with `succeeded: 1`, `failed: 1`, `errors` contains an entry for the second item with an error message indicating the status is invalid, and `updated` contains the Activity with `status: "done"`

### AC4: Audit entry created per successful update
- GIVEN an activity with ID `id-A` exists
- WHEN `PATCH /api/activities/bulk-status` is called with `{ updates: [{ id: "id-A", status: "done" }], updatedBy: "staff-42" }`
- THEN an `AuditEntry` with `activityId: "id-A"`, `status: "done"`, `updatedBy: "staff-42"`, and a non-empty `timestamp` is stored in the repository

### AC5: `activity:updated` event emitted per successful item
- GIVEN an activity with ID `id-A` exists
- WHEN `PATCH /api/activities/bulk-status` is called with `{ updates: [{ id: "id-A", status: "blocked" }], updatedBy: "staff-1" }`
- THEN the `eventBus` emits `activity:updated` exactly once with the updated Activity object as payload

### AC6: `activity:bulk_status_updated` event emitted once per operation
- GIVEN two activities `id-A` and `id-B` exist
- WHEN `PATCH /api/activities/bulk-status` is called with both IDs
- THEN the `eventBus` emits `activity:bulk_status_updated` exactly once, with payload containing `updatedBy`, `succeeded` (array of updated Activities), and `failed` (array of error entries)

### AC7: Request-level validation — empty updates array
- GIVEN any state
- WHEN `PATCH /api/activities/bulk-status` is called with `{ updates: [], updatedBy: "staff-1" }`
- THEN the response is `400` with `error.code: "VALIDATION_ERROR"` and a message indicating updates must be non-empty

### AC8: Request-level validation — missing updates field
- GIVEN any state
- WHEN `PATCH /api/activities/bulk-status` is called with `{ updatedBy: "staff-1" }` (no `updates` key)
- THEN the response is `400` with `error.code: "VALIDATION_ERROR"`

### AC9: Request-level validation — missing updatedBy field
- GIVEN any state
- WHEN `PATCH /api/activities/bulk-status` is called with `{ updates: [{ id: "id-A", status: "done" }] }` (no `updatedBy`)
- THEN the response is `400` with `error.code: "VALIDATION_ERROR"`

### AC10: Request-level validation — blank updatedBy string
- GIVEN any state
- WHEN `PATCH /api/activities/bulk-status` is called with `{ updates: [{ id: "id-A", status: "done" }], updatedBy: "   " }` (whitespace-only)
- THEN the response is `400` with `error.code: "VALIDATION_ERROR"`

### AC11: All-items-failed response is still 200
- GIVEN no activities exist
- WHEN `PATCH /api/activities/bulk-status` is called with `{ updates: [{ id: "ghost-1", status: "done" }, { id: "ghost-2", status: "blocked" }], updatedBy: "staff-1" }`
- THEN the response is `200` with `total: 2`, `succeeded: 0`, `failed: 2`, `updated: []`, and `errors` containing two entries

### AC12: Static route takes precedence over `:id` parameter
- GIVEN any state
- WHEN `PATCH /api/activities/bulk-status` is called
- THEN Express routes to the bulk-status handler, not to the single-item update handler (verified by correct response shape `{ total, succeeded, failed, updated, errors }`)

### AC13: Response `total` equals `succeeded + failed`
- GIVEN a mix of valid and invalid items in a bulk request
- WHEN `PATCH /api/activities/bulk-status` is called
- THEN `response.total === response.succeeded + response.failed` in every response

---

### Normalized Endpoint Contract Table

| Method | Normalized Path | Success Status | Error Status(es) | Required Response Properties |
| --- | --- | --- | --- | --- |
| `PATCH` | `/api/activities/bulk-status` | 200 | 400 | `total`, `succeeded`, `failed`, `updated`, `errors` |

---

### Event Payload Schemas

| Event Type | Event Constant | Publisher Module | Subscriber Module(s) | Payload Shape (TS interface) |
| --- | --- | --- | --- | --- |
| `activity:updated` | `Events.ACTIVITY_UPDATED` | `activities` | (existing subscribers, unchanged) | `Activity` (existing type — no change) |
| `activity:bulk_status_updated` | `Events.ACTIVITY_BULK_STATUS_UPDATED` | `activities` | (none wired this sprint) | `{ updatedBy: string; succeeded: Activity[]; failed: BulkStatusUpdateError[] }` |

---

### Negative & Boundary Test Matrix

| Endpoint | Invalid ID / Not Found | Malformed Body | Missing Field | Domain Violation | All Items Fail |
| --- | --- | --- | --- | --- | --- |
| `PATCH /api/activities/bulk-status` | AC2 (not found → item-level error) | AC8 (missing `updates` key → 400) | AC9, AC10 (`updatedBy` missing/blank → 400) | AC3 (invalid status value → item-level error) | AC11 (all ghost IDs → 200 with `succeeded: 0`) |

*AC7 (empty array) also covers a boundary case — zero-length `updates` as request-level error.*

---

## 3. Downstream Agent Work Breakdown

### A. Code Generation Agent Tasks (Ordered Sequence)

1. **Types & DTOs** (`src/modules/activities/activities.types.ts`):
   - Rename `'completed'` to `'done'` in the `ActivityStatus` union and add `'blocked'`. The final union must be `'pending' | 'in_progress' | 'done' | 'cancelled' | 'blocked'` — `'completed'` must not appear anywhere.
   - Rename every other occurrence of `'completed'` in `src/modules/activities/` (repository seed data, existing tests, etc.) to `'done'`.
   - Add `BulkStatusUpdateItem`, `BulkStatusUpdateInput`, `BulkStatusUpdateError`, `BulkStatusUpdateResponse`, `AuditEntry` interfaces.

2. **EventBus** (`src/common/eventBus.ts`):
   - Add `ACTIVITY_BULK_STATUS_UPDATED: 'activity:bulk_status_updated'` to the `Events` const object.

3. **Repository** (`src/modules/activities/activities.repository.ts`):
   - Add `private readonly auditStore: AuditEntry[] = []`.
   - Add `createAuditEntry(entry: Omit<AuditEntry, 'id'>): AuditEntry` — generates an `id` (using `randomUUID()`), pushes to `auditStore`, returns the entry.
   - Add `findAuditEntriesByActivityId(activityId: string): AuditEntry[]` — returns filtered shallow copy.

4. **Service** (`src/modules/activities/activities.service.ts`):
   - Add `bulkUpdateStatus(input: BulkStatusUpdateInput): BulkStatusUpdateResponse` method implementing the business rules in Spec §3 (validation, per-item processing, audit recording, event emission).

5. **Routes** (`src/modules/activities/activities.routes.ts`):
   - Register `router.patch('/bulk-status', ...)` BEFORE the existing `router.patch('/:id', ...)` handler.
   - Parse `req.body` as `BulkStatusUpdateInput`, call `service.bulkUpdateStatus()`, respond `200` with the result.

6. **App wiring** (`src/app.ts`):
   - No changes required this sprint (no new subscriber for `activity:bulk_status_updated`).

### B. Code Evaluator Agent Tasks & Test Plan

Verification is governed by the fixed policy in `.harness/skills/evaluation-strategy/SKILL.md`; this section maps sprint-specific detail into that policy.

1. **Unit / Integration Tests** (`tests/activities.test.ts`):
   - Add a new `describe('PATCH /api/activities/bulk-status')` block.
   - Implement one test per AC above (AC1–AC13), using `createApp()` and `supertest`.
   - For event-emission tests (AC5, AC6): spy on `eventBus.emit` within the test, assert call arguments.

2. **AC Verification Matrix** (satisfies `D1-C2` / `D1-G3`):

   | AC | Test description | Check ID(s) |
   | --- | --- | --- |
   | AC1 | All-valid bulk update returns 200 with correct shape | D1-C1, D1-C2, D1-C3 |
   | AC2 | Partial failure: not-found item in errors[] | D1-C2, D1-C4 |
   | AC3 | Partial failure: invalid status in errors[] | D1-C2, D1-C4 |
   | AC4 | Audit entry stored per successful update | D1-C2 |
   | AC5 | `activity:updated` emitted per successful item | D2-C3 |
   | AC6 | `activity:bulk_status_updated` emitted once per operation | D2-C3 |
   | AC7 | Empty updates array → 400 VALIDATION_ERROR | D1-C4, D4-C2 |
   | AC8 | Missing updates field → 400 VALIDATION_ERROR | D1-C4, D4-C2 |
   | AC9 | Missing updatedBy → 400 VALIDATION_ERROR | D1-C4, D4-C2 |
   | AC10 | Blank updatedBy → 400 VALIDATION_ERROR | D1-C4, D4-C2 |
   | AC11 | All items fail → 200 with succeeded: 0 | D1-C2, D1-C3 |
   | AC12 | Static route not shadowed by `:id` | D1-C1 |
   | AC13 | total === succeeded + failed | D1-C2, D1-C3 |

3. **Negative & Boundary Coverage** (satisfies `D1-C4` / `D4-C2`):
   All five mandatory negative categories are covered: invalid ID / not found (AC2), malformed body (AC8), missing field (AC9, AC10), domain violation (AC3), all-items-fail (AC11).

4. **Event-Bus Verification** (satisfies `D2-C3`):
   - `activity:updated` — emitted once per successfully updated item (AC5).
   - `activity:bulk_status_updated` — emitted once per operation with correct payload shape (AC6).
   - Both events use the `Events` constants from `src/common/eventBus.ts` — no magic strings in production code.

5. **Lint & Typecheck Verification** (satisfies `D3-C1` / `D3-C2`):
   - `npm run typecheck` must exit 0 with zero diagnostics.
   - `npm run lint` must exit 0 with zero errors and zero warnings.
   - No `@ts-ignore`, `@ts-nocheck`, or explicit `any` in generated code.

6. **Architecture Compliance** (satisfies `D2-G1` / `D2-G2`):
   - `npm run depcruise` must exit 0 with zero `error`-severity violations.
   - The `activities` module must not import any other module's `repository.ts`.
   - No raw `throw new Error(...)` in production code.

---

## 4. Definition of Done (DoD)

- [ ] All Acceptance Criteria (AC1–AC13) verified with passing automated tests.
- [ ] TypeScript strict mode checks pass (`npm run typecheck`).
- [ ] ESLint passes with no warnings or errors (`npm run lint`).
- [ ] `npm run depcruise` passes with zero `error`-severity violations.
- [ ] `activity:updated` and `activity:bulk_status_updated` events emitted with correct payload shapes as declared in the Event Payload Schemas table above.
- [ ] Layering and module boundary rules verified against `architecture-principles` (Routes → Service → Repository, no cross-module repository imports, no raw `Error` throws).
- [ ] Route ordering verified: `PATCH /bulk-status` handler registered before `PATCH /:id`.
- [ ] Evaluator verdict in `.harness/reviews/sprint-1-evaluator-feedback.md` is `PASS` (score ≥85/100, zero hard-gate failures) per `.harness/skills/evaluation-strategy/SKILL.md`.
- [ ] Human developer signs off on implementation.
