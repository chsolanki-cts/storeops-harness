---
name: coding-conventions
description: TypeScript strictness, DTO naming, and test file conventions for StoreOps. Use when writing, naming, or reviewing code, types, or tests for style consistency.
---
 
# StoreOps Coding Conventions
 
- Strict TypeScript; `@typescript-eslint/no-explicit-any` is an error — never use `any`.
- Input DTOs are named `Create<Entity>Input`/`Register<Entity>Input`/etc., defined as a `Pick<Entity, ...>` of the domain type from the module's own `types.ts`. Only the shared `Identifier` alias lives in [src/common/types.ts](../../../src/common/types.ts); everything else belongs to the owning module.
- Test cases live per-module in `src/modules/<name>/tests/<name>.test.ts` using Jest + `supertest` against `createApp()` directly — no server/port needed for tests. [tests/app.test.ts](../../../tests/app.test.ts) is the only file Jest discovers (`roots` is scoped to `tests/`); it holds the app-level health check test and side-effect-imports each module's test file so they run as part of the same suite.
