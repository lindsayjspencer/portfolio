# TODO

This file tracks concrete follow-up work that is actionable now. For exploratory product and architecture ideas, see [IDEAS.md](./IDEAS.md).

## Projects Views

- [ ] Add sort and filter controls to the projects grid, including at least recency, impact, and alphabetical sorting, plus filtering by tags/skills/company/years if the browsing UX still needs them.
- [ ] Add a clarify flow when a `projects:case-study` directive arrives without a clear focus project.

## Graph Model

- [ ] Add runtime validation for `src/data/portfolio.json` instead of relying on a cast in `src/lib/PortfolioStore.ts`.

## Skills Matrix

- [ ] Make `createSkillMatrix(...)` respect `focusLevel` if the skills matrix is meant to narrow to expert / advanced / intermediate views.

## Skills Views

- [ ] Make `focusLevel` propagate consistently through all skills transforms, not just the outer snapshot layer. This includes `createSkillClusters(...)`, `skillsToForceGraph(...)`, and `createSkillMatrix(...)`.

## Values Views

- [ ] Align value-evidence relation handling between `transformToValuesMindmapGraph(...)` and `createValueEvidence(...)` so the mindmap and evidence view are driven by the same evidence model.

## Accessibility

- [ ] Run an accessibility audit across the app and add missing ARIA labels / accessible names for complex interactive UI, especially graph interactions, menus, chat actions, and overlays.
- [ ] Add stronger keyboard navigation and focus management for graph views, dropdowns, panels, and other non-trivial interactive surfaces.
- [ ] Run an explicit accessibility compliance pass covering screen reader behaviour, focus order, contrast, and reduced-motion expectations.

## Mobile UX

- [ ] Run a full mobile audit across the application and fix broken or awkward layouts/interactions in every view, with special attention to chat, force-graph views, projects, skills matrix, values, resume, menus, transitions, and tooltip/panel behavior.

## Reliability

- [ ] Add React error boundaries around major UI surfaces, especially the graph-heavy view shell, and design fallback states that fail cleanly instead of breaking the whole app.
- [ ] Add explicit loading, empty, and error states for graph-backed and data-heavy views where failures currently degrade poorly.

## Performance

- [ ] Run a bundle analysis pass and identify large client-side dependencies or views that should be lazy-loaded more aggressively.
- [ ] Review production build and caching behaviour so the app is not paying avoidable runtime or asset costs.

## SEO And Metadata

- [ ] Add structured data markup for portfolio and resume content so the app exposes richer machine-readable metadata than the current basic page metadata.

## URL State

- [ ] Add focused tests for `UrlStateSync.tsx`, especially push-vs-replace behavior, popstate restore, and loop-guard behavior during URL-applied state.
- [ ] Add a lightweight E2E smoke test for URL state restore and browser back/forward behavior.

## Developer Experience

- [ ] Add pre-commit hooks for a minimal quality gate such as formatting, linting, and typechecking.
- [ ] Add SCSS linting or formatting guidance so the styling layer has clearer guardrails as the app grows.
