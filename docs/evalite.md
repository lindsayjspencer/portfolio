# Evalite Setup

This repository now uses Evalite v1 beta for prompt and tool-routing evals.

## Installed Version

- `evalite@1.0.0-beta.16`
- `vitest@^4.1.0`
- `ai@^6`
- `@ai-sdk/openai@^3`

The AI SDK upgrade was required because Evalite v1 declares `ai` `^6` as a peer dependency.

## Config

The root config file is [`evalite.config.ts`](../evalite.config.ts).

Current choices:

- `setupFiles: ['evalite/env-setup-file']` so `.env` is loaded before eval files run
- `viteConfig` with `vite-tsconfig-paths` so `~/*` imports resolve correctly
- `cache: true` because prompt iteration is expensive without model caching
- `maxConcurrency: 2` to avoid hammering the model while iterating locally
- `testTimeout: 120_000` because LLM evals can be slower than unit tests

## Initial Shape

The first eval is [`evals/ask-routing.eval.ts`](../evals/ask-routing.eval.ts).

It exercises the real ask prompt stack:

- uses the production prompt from `src/server/ask/prompt.ts`
- uses the production OpenAI model from `src/server/model/index.ts`
- uses the same directive and clarify tools as `/api/ask`
- wraps the model with `wrapAISDKModel(...)` so Evalite can cache and trace calls

The helper lives in [`evals/helpers/runAskEval.ts`](../evals/helpers/runAskEval.ts).

## What The First Eval Checks

The current routing eval checks high-signal prompt behavior:

- resume requests route to `resumeDirective`
- broad project requests route to `projectsDirective` with `variant: "grid"`
- ambiguous experience requests trigger the clarify tool
- "how does this portfolio work?" triggers the special clarify flow

It intentionally normalizes tool calls before scoring:

- ignores `changeTheme`
- compares only stable routing fields such as `toolName`, `variant`, `slot`, `kind`, and `options`

That keeps the eval focused on routing behavior instead of incidental prompt details like confidence values or highlight lists.

## Suggested Next Evals

After this starter eval, the next useful files would be:

1. `evals/ask-special-cases.eval.ts`
   - education response shape
   - weaknesses response shape
   - pride/accomplishment behavior

2. `evals/ask-directive-arguments.eval.ts`
   - do highlights contain the right entity ids
   - do compare requests populate `leftId` and `rightId`
   - do project deep-dives pick `case-study` instead of `grid`

3. `evals/ask-regressions.eval.ts`
   - a curated set of prompts that have previously misrouted
   - used as a permanent regression suite when prompt edits land

4. `evals/ask-variants.eval.ts`
   - compare prompt versions with `evalite.each(...)`
   - useful once the prompt is split into modules and you want A/B comparisons

## Commands

- `pnpm evals` runs Evalite in watch mode
- `pnpm evals:run` runs the evals once
- `pnpm evals:serve` runs once and keeps the UI server open
