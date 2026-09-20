---
name: code-review
description: 'Review StoreOps module code for layering, module boundary, error hierarchy, and per-module ownership violations. Use when reviewing or auditing changes to src/modules/** or src/common/**, or when asked to "review the code" against architecture rules.'
---
 
# StoreOps Code Review
 
## When to Use
- Reviewing a diff or module under `src/modules/<name>/` before merge.
- Auditing the whole codebase for architecture drift.
- Asked to "review the code" or "check module boundaries/layering/errors".
 
## Procedure
Check each module (`routes.ts`, `service.ts`, `repository.ts`, `types.ts`) against [architecture-principles](../architecture-principles/SKILL.md) (layering, module boundary rules, error hierarchy) and [coding-conventions](../coding-conventions/SKILL.md) (DTO naming, test conventions), plus the per-module ownership rule below. Report violations with file/line references; do not fix silently unless asked.
 
### Per-module ownership
Each module directory must contain exactly its own `routes.ts`, `service.ts`, `repository.ts`, and `types.ts`:
- Domain types for a module live in that module's `types.ts`, not in `src/common/types.ts` (which holds only the shared `Identifier` alias).
- `repository.ts` exports a repository **interface** (e.g. `ActivityRepository`) plus an `InMemory*` implementation class; the service depends on the interface type, not the concrete class.
- `src/app.ts` is the only place that instantiates `InMemory*` repository classes and wires `Repository → Service → Routes` per module.
 
## Quick checks
```
grep -rn "throw new Error\|throw Error" src/          # should be empty
grep -rln "from '.*modules/.*repository'" src/modules  # should only match within the same module's own service.ts
```
