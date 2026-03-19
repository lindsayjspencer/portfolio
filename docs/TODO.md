# TODO

This file collects forward-looking work extracted from stale planning docs during the 2026 docs audit.

## Projects Views

- [ ] Add sort and filter controls to the projects grid, including at least recency, impact, and alphabetical sorting, plus filtering by tags/skills/company/years if the browsing UX still needs them.
- [ ] Add a clarify flow when a `projects:case-study` directive arrives without a clear focus project.
- [ ] Polish the radial projects view with ring labels and more deliberate highlight zoom behavior that preserves spatial memory.
- [ ] Evaluate switching case-study focus in place when the user selects another project, rather than always relying on a full view transition.

## Graph Model

- [ ] Add runtime validation for `src/data/portfolio.json` instead of relying on a cast in `src/lib/PortfolioStore.ts`.
- [ ] Formally support the extra edge relations already present in the portfolio data, including `has`, `evidenced_by`, and `demonstrates`, and decide how they should participate in views/transforms.
- [ ] Evaluate deriving `years` from `period` during validation/load so the graph has one clearer source of temporal truth.

## Skills Matrix

- [ ] Make `createSkillMatrix(...)` respect `focusLevel` if the skills matrix is meant to narrow to expert / advanced / intermediate views.
- [ ] Evaluate whether the skills matrix needs explicit sort/filter controls in the UI beyond the current precomputed ordering.
- [ ] Consider accessibility and export improvements for the HTML-table matrix if it needs to function as more than a visual reference.

## Skills Views

- [ ] Make `focusLevel` propagate consistently through all skills transforms, not just the outer snapshot layer. This includes `createSkillClusters(...)`, `skillsToForceGraph(...)`, and `createSkillMatrix(...)`.
- [ ] Decide whether `clusterBy="recency"` and `clusterBy="usage"` should actually behave differently. If yes, implement distinct logic; if not, simplify the directive/API to avoid fake choice.

## Values Views

- [ ] Align value-evidence relation handling between `transformToValuesMindmapGraph(...)` and `createValueEvidence(...)` so the mindmap and evidence view are driven by the same evidence model.
- [ ] Evaluate whether the values mindmap needs extra visual affordances such as per-value hulls or a small legend, or whether the current graph is already clear enough without them.

## Chat And Clarify

- [ ] Revisit the clarify interaction model and consider dropping free-text clarify input entirely. If the model needs open-ended clarification, it should stream a normal assistant question; the dedicated clarify UI should likely be reserved for structured option selection only.

## Accessibility

- [ ] Run an accessibility audit across the app and add missing ARIA labels / accessible names for complex interactive UI, especially graph interactions, menus, chat actions, and overlays.
- [ ] Add stronger keyboard navigation and focus management for graph views, dropdowns, panels, and other non-trivial interactive surfaces.
- [ ] Run an explicit accessibility compliance pass covering screen reader behaviour, focus order, contrast, and reduced-motion expectations.

## Mobile UX

- [ ] Run a full mobile audit across the application and fix broken or awkward layouts/interactions in every view, with special attention to chat, force-graph views, projects, skills matrix, values, resume, menus, transitions, and tooltip/panel behavior.

## Reliability

- [ ] Add React error boundaries around major UI surfaces, especially the graph-heavy view shell, and design fallback states that fail cleanly instead of breaking the whole app.
- [ ] Add explicit loading, empty, and error states for graph-backed and data-heavy views where failures currently degrade poorly.
- [ ] Add frontend/runtime error tracking beyond Langfuse request telemetry so client-side failures can be observed in production.

## Performance

- [ ] Run a bundle analysis pass and identify large client-side dependencies or views that should be lazy-loaded more aggressively.
- [ ] Review production build and caching behaviour so the app is not paying avoidable runtime or asset costs.

## SEO And Metadata

- [ ] Add structured data markup for portfolio and resume content so the app exposes richer machine-readable metadata than the current basic page metadata.

## URL State

- [ ] Add focused tests for `UrlStateSync.tsx`, especially push-vs-replace behavior, popstate restore, and loop-guard behavior during URL-applied state.
- [ ] Add a lightweight E2E smoke test for URL state restore and browser back/forward behavior.
- [ ] Remove the unused client-side canonical helper `src/components/Seo/CanonicalLink.tsx`, since canonical metadata is already generated server-side in `src/app/layout.tsx`.

## Developer Experience

- [ ] Audit `package.json` and remove stale or unused dependencies left over from earlier architecture iterations.
- [ ] Add pre-commit hooks for a minimal quality gate such as formatting, linting, and typechecking.
- [ ] Add SCSS linting or formatting guidance so the styling layer has clearer guardrails as the app grows.
