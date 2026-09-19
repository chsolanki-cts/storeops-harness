---
name: add-functionality
description: Build, refactor, and review StoreOps Express REST API modules in TypeScript, following the Routes -> Service -> Repository layering, module boundary rules, and typed error hierarchy defined in CLAUDE.md.
---
 
# Adding Functionality to StoreOps
 
Use this skill whenever you are adding an endpoint, a module, or business logic to the StoreOps API — defining types, Express routers, service methods, or the in-memory repository layer.
 
Before making changes, review [architecture-principles](../architecture-principles/SKILL.md) (layering, module boundary rules, event bus, error hierarchy) and [coding-conventions](../coding-conventions/SKILL.md) (TypeScript strictness, DTO naming, test conventions) — this skill assumes both and only adds StoreOps-specific do/don't guidance on top.
 
## 1. Layering Do/Don't
Each module lives under `src/modules/<name>/` and owns exactly `routes.ts`, `service.ts`, `repository.ts`, `types.ts`.
 
### Do
* Type constructor dependencies against the repository **interface**, not the concrete class (`private readonly repository: FooRepositoryInterface`).
* Instantiate `Repository -> Service -> Routes` for a module only in [src/app.ts](../../../src/app.ts).
 
### Don't
* Do not mutate the in-memory array directly from a route handler.
* Do not put validation or business logic in `routes.ts`.
* Do not return live array references from a repository — always return a shallow copy.
 
## 2. Adding a New Module
1. Create `src/modules/<name>/{types.ts,repository.ts,service.ts,routes.ts}` following the layering in [architecture-principles](../architecture-principles/SKILL.md).
2. Wire it in [src/app.ts](../../../src/app.ts): instantiate `Repository -> Service -> Routes` in dependency order (read-only dependencies like `staff` first), register any event subscriptions, mount under `/api/<name>`.
3. Add `src/modules/<name>/tests/<name>.test.ts` and import it from [tests/app.test.ts](../../../tests/app.test.ts).
4. Update the module table in [app-context](../app-context/SKILL.md) and the endpoint scaffold in [readme.md](../../../readme.md).
 
## 3. Anti-Patterns to Explicitly Avoid
* **DO NOT** filter, sort, or search arrays in `routes.ts` — that belongs in the repository or service.
* **DO NOT** expose memory mutation side effects by returning array/object references straight from the repository.
* **DO NOT** import another module's `service.ts` for a mutating call, or its `repository.ts` at all.
* **DO NOT** call another module's service directly to raise a notification — publish an event instead.
* **DO NOT** throw raw `Error`s where a typed `AppError` subclass is expected.
