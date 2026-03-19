# Views System

This document describes the current view system in the portfolio app as it exists in March 2026. It is intentionally implementation-focused rather than aspirational.

The important caveat is that the current transition layer is still the older callback-driven design. It works, but it is more fragile than ideal. The planned replacement is documented separately in [`TRANSITION_SYSTEM_REFACTOR_PLAN.md`](./TRANSITION_SYSTEM_REFACTOR_PLAN.md).

## Architecture

The canonical UI state is the current `directive` in the portfolio store.

When the directive changes:

1. `createDataSnapshot(graph, directive)` in `src/lib/ViewTransitions.ts` materializes a mode-specific snapshot for the target view.
2. `getTransitionDecision(prev, next)` decides whether the change is structural enough to require a full transition.
3. `ViewTransitionManager.tsx` either:
   - updates the stable instance in place for cosmetic-only changes, or
   - creates a new entering instance and coordinates an exit/enter transition.

The transition manager renders one or more `ViewInstanceState` objects:

```ts
interface ViewInstanceState {
  mode: Directive['mode'];
  phase: 'entering' | 'stable' | 'exiting';
  zIndex: number;
  key: string;
  dataSnapshot: DataSnapshot;
}
```

`DataSnapshot` is a discriminated union over all supported modes and variants. It exists so that a view instance keeps a frozen view of its data even while the live directive continues changing.

## Transition Decisions

Transition decisions are made in `src/lib/ViewTransitions.ts`.

The current rules are:

- mode change -> full transition
- variant change -> full transition
- structural data change -> full transition
- cosmetic-only change -> update in place

Structural equality is based on `structuralSignature(directive)`, which intentionally ignores some presentational fields:

- globally ignored: `highlights`, `confidence`, `hints`
- additionally ignored:
  - `projects.showMetrics`
  - `compare.showOverlap`

That means a highlight-only update, for example, should normally update the current view without remounting it.

## Current Transition Model

The current manager is implemented in `src/components/ViewTransitionManager/ViewTransitionManager.tsx`.

It is callback-driven:

- the parent decides when a transition should happen
- each child view receives `transitionPhase`
- each child view registers `onTransitionIn` / `onTransitionOut` callbacks with the parent
- the manager waits for callback registration, then runs the transition sequence

The shared callback contract lives in `src/lib/ViewTransitions.ts`:

```ts
interface TransitionCallbacks {
  onTransitionIn: (duration: number) => Promise<void>;
  onTransitionOut: (duration: number) => Promise<void>;
}
```

This is still the live system for:

- `LandingView`
- `ForceGraphView`
- `ProjectsGridView`
- `ProjectsCaseStudyView`
- `SkillsMatrixView`
- `ValuesEvidenceView`
- `ResumeView`

### Debugging

Transition debugging can be enabled with:

```text
?debugTransitions=1
```

When enabled, the manager:

- shows a debug overlay
- writes structured events to `console.debug(...)`
- stores recent events on `window.__portfolioTransitionDebug`

This is useful when a view gets stuck in `entering`, a callback never registers, or a transition is incorrectly classified as cosmetic-only.

### Known Weakness

The current callback-registration system is sensitive to:

- mount timing
- React Strict Mode double-mount behaviour in development
- child readiness concerns inside force-graph views
- timer-based sequencing

It is stable enough to ship, but it is not the long-term design target.

## View Families

The app currently has three practical view families:

### 1. Force-Graph Views

These are all rendered through `src/components/ForceGraph/ForceGraphView.tsx`, which wraps the lower-level `ForceDirectedGraph` component and owns:

- transition callback registration
- node add/remove ordering
- starfield fade orchestration
- visible-node filtering during enter/exit
- resize handling
- optional overlays

Current modes that render through `ForceGraphView`:

- `timeline:career`
- `timeline:projects`
- `timeline:skills`
- `projects:radial`
- `skills:technical`
- `skills:soft`
- `values:mindmap`
- `compare:skills`
- `compare:projects`
- `compare:frontend-vs-backend`
- `explore`

Some force-graph variants add custom configuration in `ViewTransitionManager.tsx`:

- `projects:radial` uses `dagMode="radialout"` and custom collision
- `values:mindmap` uses custom collision radii plus charge/link tuning
- compare views add legend overlays

### 2. Page-Style Views

These are full-screen or near-full-screen content views with their own layout and scroll behavior:

- `projects:grid`
- `projects:case-study`
- `skills:matrix`
- `values:evidence`
- `resume`

Shared conventions for these views:

- colocated SCSS file
- opacity or translate-based enter/exit animation
- bottom padding that respects `--chat-container-height`
- local scrolling rather than relying on the page scroll

### 3. Shell / Special Views

These do not fit neatly into the previous two buckets:

- `landing`
- compare legends rendered as force-graph overlays

`landing` still participates in the same transition manager contract, even though it is not data-heavy like the graph views.

## Mode-to-Renderer Mapping

This is the current renderer mapping inside `ViewTransitionManager.tsx`:

| Directive | Renderer |
| --- | --- |
| `landing` | `LandingView` |
| `timeline:*` | `ForceGraphView` |
| `projects:grid` | `ProjectsGridView` |
| `projects:radial` | `ForceGraphView` |
| `projects:case-study` | `ProjectsCaseStudyView` |
| `skills:technical` | `ForceGraphView` |
| `skills:soft` | `ForceGraphView` |
| `skills:matrix` | `SkillsMatrixView` |
| `values:mindmap` | `ForceGraphView` |
| `values:evidence` | `ValuesEvidenceView` |
| `compare:*` | `ForceGraphView` with legend overlay |
| `explore` | `ForceGraphView` |
| `resume` | `ResumeView` |

## Snapshot Responsibilities

`createDataSnapshot(...)` is the boundary between raw portfolio data and view-ready data.

Current responsibilities include:

- force-graph transforms for graph-based views
- project cards and case-study view models
- skill clusters and matrix data
- compare snapshots
- values evidence aggregation
- filtered `explore` snapshots

Important note:

- `landing`, `resume`, and `explore` are non-variant modes
- most other view families still use explicit variants

That distinction matters throughout the system. Generic code should use directive helpers such as `getDirectiveVariant(...)` and `getDirectiveViewKey(...)` instead of assuming every mode has `data.variant`.

## Styling Conventions

The project is SCSS-based.

Typical patterns:

- component-local SCSS files next to the component
- theme values provided through CSS custom properties
- page-style views using explicit bottom padding based on `--chat-container-height`
- force-graph views relying mostly on `ForceGraphView` and its internals rather than bespoke per-view layout code

The chat container updates `--chat-container-height` dynamically. Page-style views use that variable to keep content visible above the chat UI.

## StreamingText

`StreamingText` is a reusable presentation primitive, not a view-system primitive.

It is used in multiple places, including:

- chat UI
- case-study view
- values evidence view
- resume view
- sliding panel content

It should be thought of as content reveal polish layered inside views, not as part of the transition manager itself.

## Responsive Design

The codebase has recurring responsive patterns, but this area should not be considered complete.

What is generally true today:

- page-style views usually define breakpoints around `768px` and `480px`
- force-graph views resize with their container
- chat-aware bottom padding is widely used

What is not guaranteed:

- that every view has been fully audited on mobile
- that force-graph interactions are equally good on touch devices
- that every overlay, tooltip, and panel behaves cleanly on small screens

There is still a broader mobile audit item in `TODO.md`.

## Future Direction

The likely next step is to replace the current callback-registration transition system with a parent-driven, phase-based model where:

- the manager owns the transition state machine
- children receive `phase` and render accordingly
- the parent no longer waits for callback registration from each child

That refactor is described in [`TRANSITION_SYSTEM_REFACTOR_PLAN.md`](./TRANSITION_SYSTEM_REFACTOR_PLAN.md).

Until that lands, this document should be read as a description of the current system, not the desired end state.
