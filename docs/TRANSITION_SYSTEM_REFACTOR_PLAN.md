# Transition System Refactor Plan

## Goal

Replace the current transition system with a simpler, parent-driven model that keeps the existing directive and snapshot architecture, but removes the callback-registration pattern between the manager and child views.

The target is:

- one transition manager that owns instance lifecycle
- views that react to `phase` and `duration` props
- no child-to-parent transition callback registration
- no manager logic that waits for callback registration before it can proceed
- URL sync that updates browser history without remounting the app shell

## Why This Refactor Is Worth Doing

The current system works, but it is fragile for reasons that are structural, not accidental.

### Current problems

1. The manager depends on child callback registration.
   The current design requires each view to call `onRegisterCallbacks(...)` from an effect. That creates race conditions around mount timing, callback identity, and dev Strict Mode cleanup.

2. The manager uses timers plus async callback orchestration.
   This creates multiple places where transitions can stall: waiting for registration, waiting for exit, waiting for enter, or being reset by remounts.

3. The system is sensitive to remounts.
   We just debugged two examples of this:
   - URL sync was using Next router navigation, which could remount the page shell.
   - the manager used an `isUnmountedRef` cancellation token that was tripped by dev Strict Mode and needed explicit reset on mount.

4. Debugging is harder than it should be.
   The actual transition decision is simple: same view vs new view. The implementation is more complex because it coordinates child registration and parent timing across many components.

### Why the proposed design is better

The better design is to make transitions declarative and top-down:

- the manager decides which instances exist
- the manager assigns each instance a `phase`
- each view reacts locally to `phase`
- the manager removes old instances after known durations

That keeps imperative animation logic local to unusual views like `ForceGraphView`, instead of making the entire transition architecture imperative.

This should improve:

- correctness under Strict Mode
- tolerance of rerenders
- maintainability
- testability
- ease of introducing new views

## Recommended Target Architecture

### 1. Keep the existing directive and snapshot model

Do not throw away the good parts.

Keep:

- `Directive`
- `getTransitionDecision(...)`
- `createDataSnapshot(...)`
- `COMPONENT_TRANSITION_TIMINGS`
- the two-instance overlay model (`entering` + `exiting`) when a full transition is needed

These are already the right conceptual primitives.

### 2. Replace callback registration with phase-driven views

Current pattern:

- manager passes `onRegisterCallbacks`
- child registers `onTransitionIn` / `onTransitionOut`
- manager waits and invokes those functions later

Target pattern:

- manager passes `phase`
- manager passes `duration`
- child animates when `phase` changes

That means views should no longer tell the manager how to transition. The manager tells the views what phase they are in.

### 3. Give the manager a reducer-style state model

The manager should own a small state machine:

- `stable`
- `transitioning`

Data should be something like:

- `activeInstance`
- `leavingInstance | null`
- `isTransitioning`
- optionally `pendingDirective | null` if we later want interrupt/queue behavior

The current `ViewInstanceState` shape is already close enough to keep.

### 4. Keep imperative logic inside special views only

Most views only need CSS opacity/transform changes based on `phase`.

Only special views need local imperative effects:

- `ForceGraphView`
- maybe `LandingView` because of starfield timing
- maybe `ResumeView` / `SkillsMatrixView` if their local staged reveals need it

But those views should react to `phase`; they should not register lifecycle functions back to the manager.

### 5. Use browser history directly for URL sync

This was already partially fixed and should remain the design:

- `window.history.pushState`
- `window.history.replaceState`

Do not route shareable state changes through Next App Router navigation unless you actually want a navigation/remount.

## Concrete Implementation Plan

### Phase 1: Stabilize the contract

1. Keep `getTransitionDecision(...)` in `src/lib/ViewTransitions.ts`.
2. Add a manager-facing view prop contract like:
   - `phase: 'entering' | 'stable' | 'exiting'`
   - `durationMs: number`
3. Remove `TransitionCallbacks` from the manager contract.
4. Keep the existing snapshot types and timing table.

Expected result:

- no more `onRegisterCallbacks`
- child views become passive consumers of phase

### Phase 2: Rewrite the manager around phases, not registrations

Refactor `src/components/ViewTransitionManager/ViewTransitionManager.tsx` so it:

1. computes transition decisions from directives
2. creates new instances when a full transition is needed
3. marks old instance as `exiting`
4. marks new instance as `entering`
5. uses one timeout per transition boundary
6. promotes the new instance to `stable`
7. removes the old instance

The manager should not wait for child readiness or callback registration.

Expected result:

- fewer refs
- fewer async race surfaces
- simpler debug story

### Phase 3: Convert view components

Convert representative views first:

1. `ProjectsGridView`
2. `ProjectsCaseStudyView`
3. `ValuesEvidenceView`
4. `ResumeView`
5. `SkillsMatrixView`
6. `LandingView`
7. `ForceGraphView`

Each of these should:

- stop accepting `onRegisterCallbacks`
- animate from `phase` changes in local effects or CSS

For many page-style views this is just:

- `phase === 'entering'` -> opacity 0 to 1
- `phase === 'exiting'` -> opacity 1 to 0

### Phase 4: Convert force-graph-specific behavior

`ForceGraphView` is the only place where the current architecture arguably had a reason to be imperative.

The replacement should be:

- local effect listens to `phase`
- if `phase` becomes `entering`, run local `animateNodesIn(durationMs)`
- if `phase` becomes `exiting`, run local `animateNodesOut(durationMs)`
- keep starfield readiness local to the view

Important point:

The manager does not need to know when the graph is ready. It only needs to know the duration budget it assigned.

### Phase 5: Add tests before removing debug tooling

Add tests for:

1. initial enter becomes stable
2. full transition produces two instances, then one stable instance
3. cosmetic-only directive changes update snapshot in place
4. mode/variant/structural changes trigger transitions
5. URL sync does not remount the app shell when state is written

After those tests pass, keep the debug overlay behind the query flag but treat it as optional tooling rather than required instrumentation.

## Suggested End State

At the end of this refactor:

- `ViewTransitionManager` is a small state machine
- `ViewTransitions.ts` owns transition decisions and snapshot creation
- views are phase-driven, not callback-driven
- force graph remains special, but only locally special
- URL writes do not remount the app

## How Hard Is This?

This is a medium refactor, not a tiny cleanup.

Rough estimate:

- half day to prepare contracts and manager state shape
- half day to convert standard page-style views
- half day to convert `ForceGraphView` and `LandingView`
- half day to add tests and remove old callback plumbing

Practical estimate: 1 to 2 days of focused work.

The risk is moderate, but mostly localized to:

- `ViewTransitionManager`
- `ForceGraphView`
- transition props in the page-style views

The rest of the app can stay mostly unchanged.

## Where To Read To Rebuild Context

If someone needs to justify this refactor again before implementing it, read these files in this order.

### 1. Current system overview

- `docs/views-system.md`

This gives the current intended architecture, but note that it still describes the callback-registration model as the standard pattern. It is useful context, but not the final word on what should happen next.

### 2. Current transition core

- `src/lib/ViewTransitions.ts`

Focus on:

- `DataSnapshot`
- `createDataSnapshot(...)`
- `COMPONENT_TRANSITION_TIMINGS`
- `getTransitionDecision(...)`

This file contains the parts worth preserving.

### 3. Current manager

- `src/components/ViewTransitionManager/ViewTransitionManager.tsx`

This is the main file to refactor. It currently contains:

- instance lifecycle
- timers
- debug overlay
- callback registration plumbing
- Strict Mode/remount guard logic

### 4. Representative current views

Read these to see how callback registration is currently distributed:

- `src/components/ForceGraph/ForceGraphView.tsx`
- `src/components/LandingView/LandingView.tsx`
- `src/components/ProjectsView/ProjectsGridView.tsx`
- `src/components/ProjectsView/ProjectsCaseStudyView.tsx`
- `src/components/ValuesView/ValuesEvidenceView.tsx`
- `src/components/SkillsMatrixView/SkillsMatrixView.tsx`
- `src/components/ResumeView/ResumeView.tsx`

These show exactly how much work is involved in converting views to `phase`-driven behavior.

### 5. The URL-sync interaction that caused one of the transition bugs

- `src/components/AppPreloader/UrlStateSync.tsx`
- `src/app/page.tsx`
- `src/app/HomePageClient.tsx`
- `src/lib/PortfolioStoreProvider.tsx`

These explain why URL writes must not behave like page navigations in this app.

### 6. Directive/store context

- `src/lib/ai/directiveTools.ts`
- `src/lib/PortfolioStore.ts`

These explain the directive model that drives all view changes.

## Specific Bugs That Justified This Plan

These were the concrete failures that led to this recommendation:

1. URL writes triggered navigation/remount behavior instead of simple history updates.
2. The manager passed unstable callback registrar functions, causing repeated child registration.
3. The manager used an unmounted ref as a cancellation token and needed explicit remount reset under dev Strict Mode.
4. The overall system was difficult to reason about because transition ownership was split between parent and child components.

None of those bugs are arguments against transitions themselves. They are arguments against the current callback-registration architecture.

## Recommendation

Do this refactor after the current app behavior is stable enough that transition regressions can be tested confidently.

Do not rewrite the directive model or snapshot model as part of this work.

The refactor should be scoped to:

- transition orchestration
- view transition props
- local view animation effects

That is enough to get the benefit without turning it into a full UI architecture rewrite.
