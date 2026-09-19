---
name: sprint-decomposition
description: Translates a raw feature requirement into a structured intent — a user story plus multiple GIVEN/WHEN/THEN acceptance criteria. Use when asked to decompose, break down, or refine a feature/requirement into user stories, acceptance criteria, or sprint-ready tickets.
---
 
# Sprint Decomposition
 
Turn an unstructured feature requirement (a sentence, a ticket, a stakeholder request) into a structured, sprint-ready intent: one user story plus a set of testable acceptance criteria.
 
## When to Use
- Asked to "decompose", "break down", or "refine" a feature into stories/tickets.
- Given a vague requirement and asked to produce acceptance criteria before implementation.
- Preparing work for [add-functionality](../add-functionality/SKILL.md) — a clear story + acceptance criteria should exist before code is written.
 
## Procedure
 
### 1. Extract the structured intent
From the raw requirement, identify:
- **Actor** — who wants this (a role, e.g. "store manager", "staff member", "regional admin"). If the requirement doesn't name one, infer the most plausible actor from context and state the assumption.
- **Capability** — what they want to do, stated as an action/verb phrase.
- **Benefit** — why they want it (the underlying business/operational value). If not stated, infer it and flag it as an assumption.
- **Scope boundaries** — what is explicitly in and out of scope. Call out ambiguity instead of silently guessing at large decisions.
 
If the requirement bundles multiple distinct capabilities (e.g. "create and approve restock tasks"), split it into multiple user stories rather than one overloaded story. Each story must be independently shippable and testable.
 
### 2. Write the user story
Use the standard triad, one sentence, no implementation detail:
 
```
As a <actor>, I want <capability>, so that <benefit>.
```
 
Keep it solution-agnostic — describe outcome, not HTTP verbs, table names, or module layout.
 
### 3. Derive acceptance criteria (GIVEN/WHEN/THEN)
Write **multiple** criteria per story, each isolated and independently testable. Cover, at minimum:
1. **Happy path** — the primary successful flow.
2. **Validation/error path** — invalid input, missing required fields, unauthorized actor.
3. **Edge case(s)** — boundary conditions, empty states, duplicates, already-in-that-state transitions.
4. **Side effects**, if the requirement implies one — a notification raised, an event published, a downstream record updated.
 
Format each as:
 
```
### AC<n>: <short title>
- GIVEN <precondition / starting state>
- WHEN <action taken>
- THEN <observable outcome>
```
 
Rules for good acceptance criteria:
- One behavior per criterion — don't chain unrelated assertions with "and" into a single THEN.
- State outcomes observably (status code/field/state change, error surfaced), not implementation ("service calls repository").
- GIVEN sets up state, WHEN is a single action, THEN is a verifiable result — never invert this order.
- Prefer concrete values over vague ones ("task status is `OVERDUE`" not "task is updated").
- Do not restate the happy path with trivial rewording — each AC must exercise a distinct condition.
 
### 4. Output format
Produce exactly this structure for each story:
 
```markdown
## Story: <short title>
As a <actor>, I want <capability>, so that <benefit>.
 
**Assumptions:** <bullet list, omit section if none>
 
### AC1: <title>
- GIVEN ...
- WHEN ...
- THEN ...
 
### AC2: <title>
- GIVEN ...
- WHEN ...
- THEN ...
```
 
If the requirement decomposed into multiple stories, repeat the block per story and list them in priority/dependency order (foundational stories first).
 
## Example
 
Input: "Store managers should be notified when a critical restocking task is overdue."
 
```markdown
## Story: Alert on overdue critical tasks
As a store manager, I want to be notified when a critical restocking task becomes overdue, so that I can intervene before it impacts store operations.
 
**Assumptions:** "critical" maps to `TaskPriority.CRITICAL`; notification is in-app (via the `alerts` module), not email/SMS.
 
### AC1: Notification raised for overdue critical task
- GIVEN a task with priority `CRITICAL` and status not yet `OVERDUE`
- WHEN the task's due date passes without completion
- THEN a `task.overdue` event is published and an `SLA_BREACH` notification is created for the store manager
 
### AC2: No notification for non-critical overdue tasks
- GIVEN a task with priority `LOW` or `MEDIUM`
- WHEN the task's due date passes without completion
- THEN no `SLA_BREACH` notification is created
 
### AC3: No duplicate notification on repeated checks
- GIVEN a `CRITICAL` task already marked `OVERDUE` with an existing `SLA_BREACH` notification
- WHEN the overdue check runs again for that task
- THEN no second notification is created
 
### AC4: Completed task before due date raises no alert
- GIVEN a `CRITICAL` task completed before its due date
- WHEN the due date passes
- THEN no `SLA_BREACH` notification is created
```
 
## Anti-Patterns to Avoid
- **DO NOT** write a single acceptance criterion that tries to cover the whole feature — split by condition.
- **DO NOT** leak implementation details (class names, HTTP methods, DB fields) into the story or ACs unless the requirement is explicitly about an API contract.
- **DO NOT** silently invent business rules for ambiguous requirements — surface them under **Assumptions** instead.
- **DO NOT** skip negative/edge-case criteria — a story with only a happy-path AC is not sprint-ready.
