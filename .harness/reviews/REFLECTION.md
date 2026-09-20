# Harness Reflection — Sprint 1 Demonstration Run

**Date:** 2026-09-19

---

## What the Harness Did Well

**The approval gate earned its cost.** The most valuable moment in the run was not the Generator producing a 100/100 result — it was the Planner presenting the spec summary before a single line of code was written. The user spotted that `'completed'` should be *renamed* to `'done'`, not supplemented by it. Because the approval gate exists, that correction cost one Planner revision pass. Without it, the Generator would have produced a type union with both `'completed'` and `'done'` coexisting, every existing seed datum and test referencing the wrong value, and the rename would have had to be untangled from working implementation. The Design Brief's Decision 1 (artifact-mediated handoffs, no shared agent context) is what made this correction clean: the Planner re-ran with fresh context, revised precisely the sections it was directed to, and the Generator received an unambiguous contract.

**The Evaluator's independence held.** The Generator self-reported 98.36% line coverage; the Evaluator independently measured the same figure. This is the hard gate D1-G6 in practice — the Generator's claim was verified, not trusted. The separation of `evaluation-strategy` from the Generator's skill context (noted in the Design Brief, Section B) prevented the Generator from reverse-engineering the scoring rubric. The Generator optimised for correctness; the Evaluator checked it.

**Zero remediation iterations.** Thirteen acceptance criteria, two events, a renamed status value, partial-failure semantics, and an audit store — resolved in a single Generator/Evaluator cycle. The Normalised Endpoint Contract Table and Event Payload Schemas in the contract gave the Evaluator unambiguous machine-checkable targets rather than prose descriptions it would have had to interpret.

---

## Where It Fell Short

**The Generator leaked cross-module business logic into the wrong service.** During a trial run, the Generator added a role check — `if (staff.role === 'MANAGER')` — directly inside `activities.service.ts` to gate whether a staff member had authority to close a task. This is a module boundary violation: the `activities` module encoded knowledge of what a `MANAGER` role means, a rule that belongs exclusively to the `staff` module. The problem is subtle because the code compiles, passes lint, and can even pass tests if the test fixtures happen to align — the Evaluator's `D2-G1` depcruise gate catches import violations but not inline enum comparisons that cross module semantics without crossing an import boundary.

The fix was a read-only semantic predicate: a method `StaffService.hasAuthority(staffId, action)` (or equivalent) is called from `ActivitiesService` as a constructor-injected dependency. The `activities` module never inspects role values — it asks `staffService.hasAuthority(...)` and acts on a boolean. This is precisely the cross-module read pattern described in Design Brief Section B (`architecture-principles` skill): *"Cross-module reads: Constructor-injected Service calls with semantic predicates. Never inline enum comparisons across modules."* The Generator agent instructions and the `architecture-principles` skill were updated to make this anti-pattern explicit with the role-check scenario as a named example, so future Generator invocations have a concrete negative example to match against, not just a general rule.

**The Planner does not challenge existing domain vocabulary.** When the requirement said "mark activities as DONE or BLOCKED," the Planner interpreted `'done'` as a new addition to the existing `ActivityStatus` union — alongside the already-present `'completed'` — without questioning whether the two terms were duplicates. It took a human prompt to surface the conflict. The `sprint-decomposition` skill tells the Planner how to structure acceptance criteria but does not instruct it to audit existing enum and union values for semantic overlap before proposing new members. The result was a spec that was internally consistent but carried a conceptual error the user had to catch manually.

This is not a scoring failure — no hard gate covers vocabulary coherence. It is a gap in the harness's *pre-approval intelligence* that can only surface as a post-approval rework cost if left unaddressed.

---

## Concrete Improvement

**Add a Domain Vocabulary Check to the Planner's Step 1 workflow in `planner.agent.md`.**

Before proposing any new type members, the Planner should grep existing `types.ts` files in the affected module for enum values and string union literals, then surface any semantic overlaps in its spec summary with an explicit question: *"The existing `ActivityStatus` includes `'completed'`; the requirement uses `'done'` — is this a rename (remove `'completed'`), a parallel state, or an alias?"*

This is a three-line addition to the Planner's Discover & Analyse step — not a workflow restructure. It connects directly to Design Brief Section A's principle that "if a criterion cannot be written as a GIVEN/WHEN/THEN triple, it is not sprint-ready": a criterion that references a status value whose relationship to existing values is undefined is similarly not spec-ready. Making the Planner responsible for resolving that ambiguity *before* AWAITING APPROVAL prevents the approval gate from becoming the user's primary quality filter for domain vocabulary — a role it was not designed to play.
