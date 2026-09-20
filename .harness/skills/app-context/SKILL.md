---
name: app-context
description: Overview of the StoreOps API — stack, run/build/test commands, port configuration, and the module responsibility table. Use when you need background on what StoreOps is, how to run/build/test it, or which module owns a given domain.
---
 
# StoreOps App Context
 
StoreOps API is a stub REST API for retail store operations, built with Node.js, TypeScript 5, and Express 4. See [readme.md](../../../readme.md) for the endpoint scaffold and stack overview.
 
## Commands
 
```sh
npm run build      # tsc -> dist/, required before `npm start` (no auto-build)
npm run dev        # tsx watch src/server.ts, live reload
npm start          # node dist/src/server.js (build first!)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npm test           # jest --runInBand (tests/ only, sequential)
```
 
Default port is read from `PORT` env var, falling back to the value hardcoded in [src/server.ts](../../../src/server.ts) — check this file rather than the readme, which can drift out of sync with it.
 
## Module Responsibility Table
 
Each feature lives under `src/modules/<name>/` and owns one retail domain:
 
| Module | Responsibility | Key types |
| --- | --- | --- |
| `activities` | Operational tasks — restocking, planogram resets, compliance checks | `Task`, `TaskStatus`, `TaskPriority`, `TaskCategory` |
| `programmes` | Store programmes and staff membership — seasonal rollouts, refits | `Project`, `ProjectMember`, `ProjectRole` |
| `staff` | Staff registration, authentication, profile management | `User`, `UserProfile`, `StaffRole`, `AuthToken` |
| `alerts` | In-app alerts for operational events — SLA breaches, inventory flags, handovers | `Notification`, `NotificationChannel`, `NotificationStatus`, `AlertType` |
| `reports` | Store/regional performance summaries, aggregated on demand | `Report`, `ReportType`, `ReportStatus` |
 
For how these modules are structured internally and how they talk to each other, see [architecture-principles](../architecture-principles/SKILL.md). For TypeScript/testing conventions, see [coding-conventions](../coding-conventions/SKILL.md).
