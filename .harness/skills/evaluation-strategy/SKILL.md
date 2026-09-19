---
name: evaluation-strategy
description: "Deterministic verdict, scoring, and hard-gate policy for the StoreOps Evaluator Agent. Defines the fixed verdict precedence (PASS / CONDITIONAL_PASS / FAIL / INDETERMINATE / FAIL_EVALUATOR_ERROR), the weighted D1-D4 dimension model, every hard gate and scored check with its check ID and binary criterion, and the ambiguity/conflict fallback table. Use when computing an acceptance verdict from collected evidence, scoring generator output, or auditing a prior evaluation cycle. This policy is applied mechanically from evidence — never overridden by natural-language judgment."
---
 
# StoreOps Evaluation Strategy
 
This skill is the single source of truth for **how a verdict is computed**. It contains no instructions for *collecting* evidence (see [evaluator.agent.md](../../agents/evaluator.agent.md) for that) — only the deterministic rules for turning already-collected, machine-verifiable evidence into a check status, a score, and a final verdict.
 
**Hard rule**: every check below is resolved by a binary criterion applied to tool output (exit codes, parsed reports, grep matches, file/line evidence). If evidence is missing, ambiguous, or a tool could not run, resolve via the [Ambiguity and Conflict Fallback](#ambiguity-and-conflict-fallback) table — never by inferring a favorable result.
 
## Verdict Precedence (evaluate in this exact order)
 
1. **INDETERMINATE** — a mandatory command or evidence parser could not complete (crashed, timed out, produced unparseable output). Retry once in a clean environment (fresh `npm ci` / clean working tree) before finalizing.
2. **FAIL_EVALUATOR_ERROR** — the same mandatory command/parser fails identically on the clean retry. Emit an escalation record; award zero points for every check that depended on that evidence.
3. **FAIL** — any hard gate (in any dimension) failed. This overrides the weighted score entirely; the score is still calculated and reported for diagnosis, but cannot upgrade the verdict.
4. With **zero hard-gate failures**, verdict is derived from the final score:
   - `85–100` → **PASS**
   - `70–84` → **CONDITIONAL_PASS** (in an autonomous remediation loop this routes as `FAIL_RETRY`, i.e. sent back to the generator for another pass)
   - `< 70` → **FAIL**
 
## Scoring Model
 
```
dimension score = (passed applicable points / applicable points) × dimension weight
final score     = D1 score + D2 score + D3 score + D4 score
```
 
Rules that govern the formula above:
- A failed non-gate (scored) check earns **0** of its points — points are never partially awarded.
- An `INDETERMINATE` result on a mandatory check blocks `PASS` outright, regardless of score (surfaces via the precedence rule above, not the formula).
- A mandatory check that is simply **missing** (no evidence produced, no explicit `NOT_APPLICABLE` authorization) is **not excluded** from `applicable points` and **its points are not redistributed** to other checks — it is scored as failed (0 points).
- `NOT_APPLICABLE` is only valid when an explicit rule below authorizes it for that check (e.g., "Event-bus integration" is `NOT_APPLICABLE` only if the sprint contract defines no cross-module events). Self-declared `NOT_APPLICABLE` without a matching rule is treated as a failed check.
- The calculated score is always reported, even when a hard gate forces `FAIL`, to support diagnosis and remediation.
 
## Check ID Registry
 
Every check has a stable ID (`<Dimension>-<G|C><n>`) used in evaluator feedback so findings are traceable back to this policy. `G` = hard gate (binary, verdict-affecting only). `C` = scored check (contributes points).
 
### D1 — Functional Correctness and API Contract (weight 35)
 
**Hard gates**
| ID | Gate |
| --- | --- |
| D1-G1 | Jest project tests or evaluator-owned contract tests exit non-zero. |
| D1-G2 | A required endpoint is absent or registered with the wrong HTTP method or normalized path. |
| D1-G3 | A mandatory acceptance criterion has no executable mapped test. |
| D1-G4 | A generated test is skipped, focused (`.only`), disabled, non-deterministic, or dependent on shared execution state. |
| D1-G5 | The application cannot start in the clean evaluator environment. |
| D1-G6 | Independently measured test coverage (from the Evaluator's own `npm test -- --coverage` run) falls below any threshold declared in `generator-summary.md`'s coverage table for a scope it claims to meet — a self-reported coverage percentage is never accepted without this cross-check. |
 
**Scored checks**
| ID | Check | Pts | Binary criterion |
| --- | --- | --- | --- |
| D1-C1 | API contract | 10 | PASS when all required normalized method/path tuples and required response contracts match; otherwise FAIL. |
| D1-C2 | Business rules | 10 | PASS when every GIVEN/WHEN/THEN criterion maps to a discovered passing test that asserts rule behavior; otherwise FAIL. |
| D1-C3 | Status and response contract | 7 | PASS when expected success/error status, content type, error code, and required properties are asserted; otherwise FAIL. |
| D1-C4 | Negative and boundary cases | 5 | PASS when required invalid ID, malformed input, missing field, domain violation, and not-found categories are present; otherwise FAIL. |
| D1-C5 | Isolation and determinism | 3 | PASS when two clean runs produce the same result and test count with no state leakage or unresolved handles; otherwise FAIL. |
 
### D2 — Architecture and StoreOps Governance (weight 30)
 
**Hard gates**
| ID | Gate |
| --- | --- |
| D2-G1 | Dependency analysis reports a circular dependency or a direct import of another module's repository. |
| D2-G2 | A route imports a repository directly, a repository depends on Express, or another prohibited layer direction is detected. |
| D2-G3 | Production route or service code contains a raw `throw new Error(...)` instead of the typed `AppError` hierarchy. |
| D2-G4 | A cross-module state change bypasses the event bus, or the `reports` module writes to an operational module. |
| D2-G5 | A required StoreOps module lacks the route, service, repository, or domain-type layer required by policy. |
 
**Scored checks**
| ID | Check | Pts | Binary criterion |
| --- | --- | --- | --- |
| D2-C1 | Module boundaries | 10 | PASS when the dependency graph contains zero prohibited edges and zero cycles; otherwise FAIL. |
| D2-C2 | Layer direction | 6 | PASS when all resolved imports conform to the layer allow-list; otherwise FAIL. |
| D2-C3 | Event-bus integration | 6 | PASS when required events are emitted with schema-valid payloads and no forbidden direct dependency exists; otherwise FAIL. NOT_APPLICABLE only if the sprint contract defines no cross-module events for the changed modules. |
| D2-C4 | Typed errors | 5 | PASS when applicable errors are `AppError` subclasses with `code`, `message`, and `statusCode`; otherwise FAIL. |
| D2-C5 | Read-only reports | 3 | PASS when report paths perform reads/aggregation only and invoke no write operation on operational modules; otherwise FAIL. NOT_APPLICABLE only if the change does not touch the `reports` module. |
 
### D3 — Type Safety and Maintainability (weight 20)
 
**Hard gates**
| ID | Gate |
| --- | --- |
| D3-G1 | TypeScript compilation with no emit (`npm run typecheck`) exits non-zero. |
| D3-G2 | ESLint (`npm run lint`) with zero-warning policy exits non-zero. |
| D3-G3 | TypeScript strict mode is disabled in the effective `tsconfig.json`. |
| D3-G4 | Changed production code introduces prohibited `@ts-ignore`, `@ts-nocheck`, broad `any`, or whole-file lint suppression (`/* eslint-disable */`). |
 
**Scored checks**
| ID | Check | Pts | Binary criterion |
| --- | --- | --- | --- |
| D3-C1 | Type check | 8 | PASS when the compiler exits 0 with zero diagnostics using the committed configuration; otherwise FAIL. |
| D3-C2 | Lint | 6 | PASS when ESLint exits 0 with zero errors and zero warnings under evaluator-owned invocation; otherwise FAIL. |
| D3-C3 | Unsafe-type budget | 3 | PASS when the changed production scope introduces no prohibited suppression or unapproved explicit `any`; otherwise FAIL. |
| D3-C4 | Maintainability | 3 | PASS when changed code has no empty catch, unreachable block, mandatory-behavior TODO, commented-out implementation, or duplicate route; otherwise FAIL. |
 
### D4 — Security and Dependency Integrity (weight 15)
 
**Hard gates**
| ID | Gate |
| --- | --- |
| D4-G1 | Dependency audit detects a high or critical vulnerability at the configured threshold. |
| D4-G2 | Secret scanning identifies a verified credential in generated or modified files. |
| D4-G3 | A changed endpoint accepts external input without runtime validation. |
| D4-G4 | The lockfile is inconsistent, a runtime dependency is undeclared, or a package is sourced from an unapproved Git URL, local path, or tarball. |
 
**Scored checks**
| ID | Check | Pts | Binary criterion |
| --- | --- | --- | --- |
| D4-C1 | Dependency audit | 5 | PASS when no high or critical vulnerability exists and the lockfile can be inspected; otherwise FAIL. |
| D4-C2 | Input validation | 4 | PASS when every changed path/body/query input has runtime validation and a negative test; otherwise FAIL. |
| D4-C3 | Error exposure | 2 | PASS when contract tests show no stack, absolute path, environment value, or internal exception leakage; otherwise FAIL. |
| D4-C4 | Secret detection | 2 | PASS when verified-secret count is zero; otherwise FAIL. |
| D4-C5 | Dependency hygiene | 2 | PASS when imports, declarations, lockfile state, and dependency classification are consistent; otherwise FAIL. |
 
## Ambiguity and Conflict Fallback
 
| Situation | Resolution |
| --- | --- |
| Malformed or incomplete evaluator JSON | `INDETERMINATE` |
| Missing mandatory artifact | `INDETERMINATE` |
| Unknown check identifier | `INDETERMINATE` |
| Conflicting automated evidence (e.g. two runs disagree) | One clean retry |
| Conflict persists after retry | `FAIL_EVALUATOR_ERROR` + escalation record |
| LLM-only claim without supporting tool/file evidence | Recorded as `UNVERIFIED`; no score impact (does not count as PASS or FAIL) |
| Any hard-gate tool failure (tool itself errors, not the code under test) | `FAIL` |
 
## Applying This Policy
 
1. For each check ID above, look up the collected evidence artifact (never re-derive evidence from narrative description).
2. Resolve the check to exactly one of: `PASS`, `FAIL`, `INDETERMINATE`, `NOT_APPLICABLE` (only where authorized), `UNVERIFIED` (informational only).
3. Hard gates (`G`) only ever gate the verdict — they carry no points and are never averaged into the score.
4. Scored checks (`C`) contribute points per the formula in [Scoring Model](#scoring-model).
5. Apply [Verdict Precedence](#verdict-precedence-evaluate-in-this-exact-order) top to bottom; stop at the first rule that matches.
6. Never let a fluent explanation change a PASS to FAIL or vice versa — if the evidence says PASS per the binary criterion, the check is PASS, regardless of any qualitative concern (record qualitative concerns as `UNVERIFIED` notes instead).
