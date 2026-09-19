---
name: architecture-principles
description: Defines the StoreOps Routes -> Service -> Repository layering, module boundary rules (read-only lookups, semantic predicates, event bus side effects), wiring in src/app.ts, and the typed error hierarchy. Use when adding functionality, wiring modules together, or reviewing code for architecture compliance.
---
 
# StoreOps Architecture Principles
 
For what each module is responsible for, see [app-context](../app-context/SKILL.md). This skill defines the structural rules every module must follow.
 
## Layering: Routes -> Service -> Repository
Each module lives under `src/modules/<name>/` and follows a strict **Routes → Service → Repository** layering (see [src/modules/activities/](../../../src/modules/activities/) as the reference implementation):
 
- **routes.ts** — Express `Router`, takes the service via constructor-style function injection, no validation logic.
- **service.ts** — business rules and validation (throw `ValidationError`/`NotFoundError` from [src/common/errors.ts](../../../src/common/errors.ts) for bad input or missing entities), assigns IDs via `createId()` from [src/common/id.ts](../../../src/common/id.ts), publishes domain events after mutations.
- **repository.ts** — in-memory array storage only (no DB); `list()`-style methods return a shallow copy (`[...array]`) to prevent external mutation. Data resets on every process restart.
 
## Module Boundary Rules
Cross-module communication follows two rules:
 
1. **Read-only lookups go through direct service calls.** A module may take another module's `Service` as a constructor dependency and call its `list()`/`findById()`-style methods. Example: `programmes` takes `StaffService` to validate a `staffId` before adding a `ProjectMember`; `reports` takes `ActivityService`, `ProgrammeService`, and `StaffService` to aggregate metrics — it never calls their mutating methods and never writes to their repositories. Domain classifications (e.g. "is this user a store manager?") are exposed as a semantic predicate method on the owning module's service (e.g. `StaffService.isStoreManager(user)`), never inlined as a consuming module comparing a field against the owning module's enum literal (e.g. `staff.role === 'STORE_MANAGER'` inside `activities`) — that would leak `StaffRole`'s possible values across the module boundary.
2. **Event-driven side effects go through the event bus, never a direct import.** Mutating a module's own state and notifying another module of that fact is done by publishing on the shared [src/common/event-bus.ts](../../../src/common/event-bus.ts) `EventBus` (pub/sub, event shape `{ type: 'entity.action', payload }`). Example: `activities` publishes `task.overdue` when a `CRITICAL` task is marked overdue; `programmes` publishes `project.closed` when a programme closes. Subscribers are wired in [src/app.ts](../../../src/app.ts), not inside the publishing module: `alerts` subscribes to `task.overdue` to raise an `SLA_BREACH` notification, and `reports` subscribes to `project.closed` to generate a `STORE_SUMMARY` report.
 
Only modules that mutate state and need to notify others (`activities`, `alerts`, `programmes`) take an `EventBus` in their service constructor. `staff` mutates its own state (registration, tokens) but has no side effects to publish, so it takes no `EventBus`. `reports` is read-only/aggregation-only and takes the other modules' `Service` instances instead of an `EventBus`.
 
No module ever imports another module's `repository.ts`, and there are no circular imports. Cross-module *type* imports (e.g. importing another module's domain type for an event payload) are fine — they're data contracts, not functional coupling. `staff` is read-only from every other module's perspective — no module calls a `StaffService` method that mutates staff state.

## Dependency Analysis with dependency-cruiser

The project uses [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) (`npm run depcruise`) to mechanically enforce the module boundary rules above. The configuration lives in [.dependency-cruiser.js](../../../.dependency-cruiser.js) and defines the following **error-severity** StoreOps rules (on top of the standard init rules):

| Rule name | What it enforces |
| --- | --- |
| `no-circular` | No circular dependency chains (upgraded from `warn` to `error`) |
| `no-cross-module-repository` | A module may not import another module's `*.repository.*` — cross-module data access must go through the owning module's service |
| `no-repository-imports-express` | Repository files must be framework-agnostic — `express` is not allowed inside a `*.repository.*` file |
| `no-cross-module-service-from-routes` | Route files may only use services from their own module; cross-module service wiring belongs in `src/app.ts` |
| `no-common-imports-from-modules` | `src/common/` utilities must not depend on domain modules — common code must remain generic |
| `no-reports-cross-module-write` | The `reports` module is read-only; it must not import other modules' repositories or routes |

Run `npm run depcruise` to verify the full rule set. `depcruise` exits 0 when all error-severity rules pass (warnings about orphan modules are informational). Run `npm run depcruise:graph` to generate a `dependency-graph.svg` for visual inspection (requires Graphviz `dot` on `PATH`).
 
## Wiring
Wiring for all modules happens in [src/app.ts](../../../src/app.ts), which instantiates `Repository -> Service -> Routes` per module (in dependency order: `staff` and `activities`/`programmes` before `reports`), registers the event subscriptions described above, and mounts routers under `/api/<module>`. Add new modules the same way.
 
## Typed Error Hierarchy
Errors thrown as `AppError`/`ValidationError`/`NotFoundError` are caught by the global `errorHandler` middleware in [src/common/http.ts](../../../src/common/http.ts) and returned as `{ error: { code, message } }`; anything else becomes a generic 500 `INTERNAL_ERROR`. Never `throw new Error(...)` or a plain value in services or routes — use `ValidationError` (400) for bad input, `NotFoundError` (404) for missing entities, or a new `AppError` subclass if a new (`code`, `statusCode`) pair is needed.
