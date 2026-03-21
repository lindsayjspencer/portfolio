# IDEAS

This file tracks exploratory, speculative, or longer-horizon product and architecture ideas. For concrete implementation work, see [TODO.md](./TODO.md).

## Projects Views

- Polish the radial projects view with ring labels and more deliberate highlight zoom behavior that preserves spatial memory.
- Evaluate switching case-study focus in place when the user selects another project, rather than always relying on a full view transition.

## Graph Model

- Formally support the extra edge relations already present in the portfolio data, including `has`, `evidenced_by`, and `demonstrates`, and decide how they should participate in views/transforms.
- Evaluate deriving `years` from `period` during validation/load so the graph has one clearer source of temporal truth.

## Skills Matrix

- Evaluate whether the skills matrix needs explicit sort/filter controls in the UI beyond the current precomputed ordering.
- Consider accessibility and export improvements for the HTML-table matrix if it needs to function as more than a visual reference.

## Skills Views

- Decide whether `clusterBy="recency"` and `clusterBy="usage"` should actually behave differently. If yes, implement distinct logic; if not, simplify the directive/API to avoid fake choice.

## Values Views

- Evaluate whether the values mindmap needs extra visual affordances such as per-value hulls or a small legend, or whether the current graph is already clear enough without them.

## Chat And Clarify

- Revisit the clarify interaction model and consider dropping free-text clarify input entirely. If the model needs open-ended clarification, it should stream a normal assistant question; the dedicated clarify UI should likely be reserved for structured option selection only.

## Reliability

- Add frontend/runtime error tracking beyond Langfuse request telemetry so client-side failures can be observed in production.
