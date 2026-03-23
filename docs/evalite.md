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

The current eval entry points are:

- [`evals/ask-routing.eval.ts`](../evals/ask-routing.eval.ts)
- [`evals/landing-suggestion-chips.eval.ts`](../evals/landing-suggestion-chips.eval.ts)

They exercise the real ask flow:

- planner pass first, narrator pass second
- production prompts from `src/server/ask/prompt.ts`
- production models from `src/server/model/index.ts`
- the same planner-selected view tools used by `/api/ask`
- wrapped models via `wrapAISDKModel(...)` so Evalite can cache and trace calls

The helper lives in [`evals/helpers/runAskEval.ts`](../evals/helpers/runAskEval.ts).

Note:

- this file describes the original Evalite setup
- the current prompt/tool direction has moved on
- forward-looking guidance for the next eval rewrite lives in [`docs/ask-evals-guidance.md`](./ask-evals-guidance.md)

## What The First Eval Checks

The current evals check:

- explicit routing for a few unambiguous asks
- one supporting view per turn
- narration present
- no raw JSON leakage in narration

The landing chip eval intentionally does not prescribe one exact view per prompt. It is currently a hard-line behavior suite, not a rigid routing suite.

## Suggested Next Evals

After this starter eval, the next useful files would be:

1. `evals/ask-special-cases.eval.ts`
   - education response shape
   - weaknesses response shape
   - pride/accomplishment behavior

2. `evals/ask-regressions.eval.ts`
   - a curated set of prompts that have previously misrouted
   - used as a permanent regression suite when prompt edits land

3. `evals/ask-variants.eval.ts`
   - compare prompt versions with `evalite.each(...)`
   - useful once the prompt is split into modules and you want A/B comparisons

## Commands

- `pnpm evals` runs Evalite in watch mode
- `pnpm evals:run` runs the evals once
- `pnpm evals:serve` runs once and keeps the UI server open
