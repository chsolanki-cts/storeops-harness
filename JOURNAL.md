# Architecture Journal — StoreOps Harness

**Project:** StoreOps REST API · AI-driven development harness  
**Architect:** Chiragkumar Solanki  

This journal captures design decisions, trade-offs, and insights as they emerged during the build — the thinking behind choices, not just the choices themselves. It is a companion to the formal [DESIGN_BRIEF.md](DESIGN_BRIEF.md); where the Brief records what was decided, this journal records why it was hard, what was tried first, and what was learned in practice.

---

## Entry 1 — The Orchestrator as a Routing Brain, Not a Reasoning Agent

The orchestrator (CLAUDE.md) was originally envisioned as an intelligent coordinator that would read artifacts, assess quality, and make nuanced decisions. That vision was abandoned early.

The problem with an intelligent orchestrator is that it introduces a second verdict layer. If the Evaluator says `FAIL` but the orchestrator looks at the raw evidence and decides "this seems fine," the determinism guarantee collapses. The same sprint with the same code could be accepted or rejected depending on the orchestrator's interpretation, which is exactly the non-determinism the harness was designed to eliminate.

The current design gives the orchestrator a single rule: read only `sprint-N-evaluator-feedback.md`, act on the `verdict:` field, never inspect evidence. Its working memory per sprint is bounded to three values: sprint number, iteration number, latest verdict. It resets entirely between sprints.

**Insight:** The orchestrator's apparent simplicity is the design. An orchestrator that "checks the Evaluator's work" would be a second Evaluator with no scoring rubric — worse than useless, because it would add uncertainty without adding accountability.

**Trade-off:** The orchestrator cannot compensate for an Evaluator error. If the Evaluator incorrectly marks a passing sprint as `FAIL`, the orchestrator will route to the Generator for a needless remediation pass. This is an acceptable failure mode — a false negative wastes one iteration budget; a false positive ships broken code. The system is biased toward caution.

---

## Entry 2 — Artifact-Mediated Handoffs and the Reproducibility Requirement

Early prototyping passed agent outputs as in-context text to downstream agents. This created two problems: context window pollution as sprint complexity grew, and non-reproducibility — if the Generator's phrasing influenced the Evaluator's reading of a contract, re-running the Evaluator on the same code could produce a different verdict.

The fix was to make files the exclusive handoff surface. Each agent is a fresh subagent that receives only file paths and reads them itself. The Evaluator never sees what the Generator said — only what the Generator wrote to `src/` and `tests/`. The Generator never sees the Evaluator's prior verdict prose — only the `blocking_issues` list from `sprint-N-evaluator-feedback.md`.

This has a useful side-effect: any human or automated process can reproduce a sprint evaluation by running the Evaluator against the same files. The audit trail is not stored in conversation history that will be truncated — it is in `.harness/reviews/`, version-controlled, readable by `grep`.

**Trade-off:** File-based handoffs require discipline about what each agent reads. Early in the build, the Generator was reading the full evaluator report on remediation passes (to understand what failed). This was wrong — it gave the Generator access to the Evaluator's internal reasoning, which could cause it to optimise for the scoring rubric rather than for correct code. The fix was to route only `blocking_issues` from `sprint-N-evaluator-feedback.md` — the minimum delta needed.

**Assumption to watch:** The filesystem must be persistent across agent invocations within a sprint. In an ephemeral CI environment this would require volume mounts. Not a current concern, but the design should be conscious of it.

---

## Entry 3 — The Two-Phase Evaluator: Evidence Before Judgment

The Evaluator's most important design constraint is one that isn't immediately obvious from the output: evidence collection and policy evaluation are two strictly separate phases that must never blend.

Phase 1 is mechanical — run commands, capture exit codes, grep files, record the results as evidence artifacts. No pass/fail judgments are made in Phase 1. A command output is recorded as a fact, not an assessment.

Phase 2 applies the fixed rules in `evaluation-strategy` to the Phase 1 artifacts. At this point the Evaluator does not re-read code — it only resolves check statuses from evidence already collected.

The reason for this split is that natural-language reasoning about code quality is non-deterministic. An Evaluator that read the code narratively and then decided "this looks fine despite the failing test" would produce different verdicts on different runs. By forcing all judgment through a fixed scoring policy applied to machine-captured evidence, the verdict becomes a function of the code state — not of the Evaluator's current reasoning trajectory.

**Insight:** The phrase in the Evaluator's instructions — *"Natural-language reasoning must never override the policy"* — is the most important line in the entire harness. It is the line that makes the system trustworthy rather than merely functional.

**Trade-off:** The two-phase constraint means the Evaluator cannot exercise discretion. A sprint that has one minor lint warning in a file that was not part of the sprint's changes will fail the same gate as a sprint with systematic lint violations. This strictness is intentional — adding exceptions to the scoring policy would make the policy non-deterministic again — but it places a higher burden on keeping the codebase clean before a sprint begins.

---

## Entry 4 — Skill File Isolation: Who Knows What

The six skill files are not just documentation — their distribution across agents is a deliberate information boundary.

The most consequential isolation: `evaluation-strategy` is Evaluator-only. If the Generator knew how it would be scored — the weights, the hard gate IDs, the exact threshold percentages — it could produce code that satisfied the rubric rather than the requirement. A Generator that knows it needs 80% service-layer coverage might write trivial tests specifically to hit that number, rather than writing tests that verify the acceptance criteria.

Similarly, `sprint-decomposition` is Planner-only. The rules for structuring acceptance criteria are a planning concern; the Generator does not need to know them, and the Evaluator should not use them as a scoring input (the contract's ACs are the source of truth, not the decomposition rules that produced them).

The `add-functionality` skill — which contains permissive implementation guidance and anti-pattern catalogues — is intentionally excluded from the Evaluator. If the Evaluator had access to implementation guidance, it might reason about developer intent rather than about evidence. "The code looks like it was trying to follow the anti-pattern catalogue" is not evidence; a grep result is.

**Insight:** Skill file distribution is a trust boundary, not just a context management decision. Each agent should know exactly what it needs to do its job — no more.

---

## Entry 5 — Hard Gates: Properties That Are Not on a Spectrum

The scoring model uses weighted checks for graduated quality signals — coverage percentage, maintainability concerns, test quality — but certain properties require binary gates with no score-offset path.

The distinction is simple: some properties are either true or false, with no meaningful spectrum between them.

- A test suite that does not compile is not "70% passing." It is broken.
- A dependency with a known high-severity CVE is not "mostly secure." It is vulnerable.
- An application that cannot start is not "partially functional." It is dead.

Sprint 0 provided the clearest demonstration of this. The Generator produced code that scored 35/35 on functional correctness, passed all 56 tests, and had clean architecture — and then failed a D4-G1 hard gate because `@typescript-eslint/eslint-plugin@^6.13.1` carried a `minimatch` ReDoS advisory. Final verdict: FAIL at 95/100.

The instinct when seeing 95/100 is to ask whether the gate is too strict. It is not. The correct question is: would we ship a dependency with a known high-severity vulnerability because everything else was clean? No. The gate held because it should.

**Trade-off:** Hard gates create the possibility of a high-quality sprint being blocked by a single environmental or dependency issue unrelated to the feature being built. This is the correct behaviour — environment issues should be caught before commit — but it means a developer cannot "accept known issues" and move forward within the harness loop. Escalation is the path for that.

---

## Entry 6 — The Depcruise Blind Spot and Semantic Predicates

During a trial run, the Generator added `if (staff.role === 'MANAGER')` inside `activities.service.ts` to check whether a staff member had authority to close a task. The code compiled. Lint passed. Depcruise passed — because the check made no illegal import; it just inlined a domain rule from the `staff` module using a string literal.

This was the most instructive failure of the build. The `no-cross-module-repository` depcruise rule catches structural import violations — module A importing module B's repository directly. It cannot catch semantic violations — module A encoding knowledge of what module B's domain values mean. The gap between these two categories is significant in a multi-module TypeScript codebase.

The fix required a pattern change, not just a rule addition: cross-module reads must use constructor-injected semantic predicate methods. `staffService.hasAuthority(staffId, action)` returns a boolean; `activities.service.ts` acts on the boolean without ever knowing what "authority" means in terms of staff roles. When the staff module's authority model evolves, only the staff service changes.

**Insight:** Depcruise is a necessary but not sufficient architectural guard. Import-graph analysis catches structural violations; domain semantic violations require explicit documentation as named anti-patterns in `architecture-principles` and `generator.agent.md` so the Generator has a concrete negative example to match against, not just a general rule.

**Trade-off:** Semantic predicates require the staff module to anticipate what questions other modules will ask. `hasAuthority(staffId, 'close_task')` is a clean boundary; but if the activities module needs ten different authority checks, the staff service interface grows proportionally. Predicate granularity must be managed as the codebase grows.

---

## Entry 7 — What the Approval Gate Actually Does

The approval gate is described in the Design Brief as a human-in-the-loop checkpoint. In practice, Sprint 1 revealed its real function: it is the only point in the harness where a human can correct the *meaning* of a requirement before it becomes code.

The Planner interpreted "mark activities as DONE or BLOCKED" by adding `'done'` as a new `ActivityStatus` value alongside the existing `'completed'`. This interpretation was technically valid — nothing in the requirement text explicitly said to rename `'completed'`. But it was semantically wrong: `'done'` and `'completed'` are synonyms in this domain, and allowing both would have created a redundant status value that would persist in seed data, tests, and API consumers indefinitely.

No automated check could have caught this. The Normalised Endpoint Contract Table was correct. The Event Payload Schemas were correct. The acceptance criteria were self-consistent. The error was in the mapping between the requirement's vocabulary and the existing domain model — a judgment that only a human with domain context can make.

**Insight:** The approval gate's primary value is not catching technical errors — those are the Evaluator's job. Its primary value is catching semantic gaps between the requirement's intent and the Planner's interpretation. The spec summary presented at AWAITING APPROVAL should be written and read with this purpose in mind.

**Trade-off:** The approval gate requires a human to read and understand the spec before it can proceed. For routine, well-understood features this can feel like bureaucratic overhead. The cost is real but bounded — one review per sprint — and the alternative (discovering semantic errors during remediation, after code exists) costs more.

---

## Entry 8 — Monitor Separation and the Drift Detection Loop

The Monitor was the last agent designed and almost the first cut. It adds no verdict authority, writes no code, and changes nothing about the sprint outcome. Its sole output is `sprint-N-run-log.md` and a row in `harness-quality-trend.md`.

The case for keeping it rests on one property: the Monitor is the only agent that can see across sprint boundaries. The Planner, Generator, and Evaluator are all per-sprint-per-iteration agents. If the same check ID (e.g., D2-G3) fails in two consecutive sprints, none of those agents will notice — they have no memory of prior sprints. The Monitor reads `harness-quality-trend.md` and flags when the same gate appears repeatedly as a **skill-file drift signal**: evidence that the skill governing that check is under-specified, and that the Generator is likely to keep making the same mistake until the skill is updated.

This is the harness's self-improvement mechanism. Without the Monitor, skill-file quality would degrade silently — the Generator would keep generating the same category of error, each sprint would cost a remediation iteration, and nobody would have a quantified signal to act on.

**Trade-off:** The Monitor's token cost estimate (~148k tokens for Sprint 1) is heuristic — line-count multiplied by a fixed rate. It is not billing data. The risk of presenting it as a real number is that it creates false confidence in cost projections for future sprints. The heuristic disclaimer in every run log is load-bearing, not boilerplate.

---

## Entry 9 — Sprint Outcomes Summary

| Sprint | Feature | Verdict | Score | Iters | Key Event |
| --- | --- | --- | --- | --- | --- |
| 0 | Baseline REST API (9 endpoints) | PASS | 100/100 | 2/3 | D4-G1 triggered: `minimatch` ReDoS in devDependencies; fixed by upgrading `@typescript-eslint` to `^7.18.0` |
| 1 | Bulk status update `PATCH /api/activities/bulk-status` | PASS | 100/100 | 1/3 | Approval gate caught `'completed'`→`'done'` rename before Generator invoked; clean first-iteration pass |

Sprint 0 demonstrated the hard gate system under real conditions. Sprint 1 demonstrated the approval gate under real conditions. Between them, both primary quality mechanisms of the harness were exercised before Sprint 2.

**Insight from comparing the two sprints:** Sprint 0 required two iterations because of a tooling issue (dependency vulnerability) that the Generator could not have anticipated from the contract. Sprint 1 resolved in one iteration because the specification was unambiguous by the time the Generator saw it. The iteration budget is consumed by implementation uncertainty, not by implementation effort. A well-specified contract that reaches the Generator is the fastest path to a PASS.

---

## Open Questions

These are unresolved design tensions noted during the build, not planned work items:

1. **Planner vocabulary auditing** — the Planner currently has no instruction to grep existing type definitions for semantic overlaps before proposing new members. Sprint 1 exposed this gap. Adding a Domain Vocabulary Check step to the Planner's workflow would close it (see REFLECTION.md for the concrete improvement).

2. **Depcruise and semantic violations** — the `no-cross-module-repository` rule catches import-graph violations but not inline domain comparisons. The current mitigation is a named anti-pattern in `architecture-principles` and `generator.agent.md`. Whether a lint rule (e.g., a custom ESLint rule that flags string literals matching known enum values from other modules) would be more reliable is an open question.

3. **Approval gate review depth** — the spec summary presented at AWAITING APPROVAL is generated by the Orchestrator reading the Planner's output. There is no structured checklist prompting the developer to check specific things (vocabulary alignment, scope boundaries, out-of-scope declarations). A lightweight review template could reduce the cognitive load on the developer and catch more issues at the approval stage.
