# Ask Evals Guidance

This document captures how the ask evals should be updated in a later pass.

It is intentionally separate from the implementation work in this pass. The prompt and model-facing tool names have moved forward, but the evals have not been rewritten yet. That is deliberate. The goal here is to avoid mixing two changes:

1. changing product behavior and prompt structure
2. changing how we measure that behavior

Those should be staged separately so we can reason about each one clearly.

## Why The Current Evals Need To Change

The current evals were useful when the system prompt was more rigid and tool choreography was treated as the primary objective. That is no longer the direction of the product.

The current product direction is:

- the assistant's main job is to answer the user's question in natural language
- view tools are optional UI actions that help illustrate the answer
- `suggestAnswers` is an optional UI affordance, not a separate protocol
- ambiguity should be handled through clarifying questions, not through view-tool fan-out
- prompt quality should be judged by durable behavior, not by overfitting to one benchmark phrase

Several existing eval patterns work against that direction.

### Problem 1: Phrase-Specific Prompt Pressure

Some current evals push the prompt toward special-casing specific words or phrasings. That leads to brittle prompt logic that looks good in a narrow benchmark but worse in general use.

This is exactly the kind of pressure that creates one-off prompt rules such as:

- a fixed response strategy for one keyword
- a mandatory tool call for one exact prompt
- examples written to mirror eval expectations rather than product behavior

That is not a good long-term prompt design strategy.

### Problem 2: Over-Specifying `suggestAnswers`

The current direction is that `suggestAnswers` should be available whenever it helps, especially for ambiguous requests, but it should not be mandatory in normal routing evals.

Why:

- ambiguity can be handled well with a plain clarifying question alone
- a good assistant should not fail a routing eval just because it chose not to show answer chips in one case
- forcing `suggestAnswers` on a single phrase encourages prompt overfitting instead of better reasoning

We may still want to measure `suggestAnswers` adoption, but that should be a separate, softer, aggregate-style evaluation, not a hard deterministic requirement in standard routing tests.

### Problem 3: Not Penalizing Multiple View Tools Strongly Enough

One of the most important behavioral invariants is:

- at most one view tool per turn

This matters more than many of the existing exact routing expectations. A response that calls three view tools is structurally worse than a response that chooses one slightly different but still reasonable view.

The evals should prioritize that invariant heavily.

### Problem 4: Too Much Focus On Tool Choreography

Some evals implicitly reward "did the model emit the exact expected tool sequence?" more than:

- did it answer clearly
- did it avoid raw JSON in narration
- did it avoid leaking tool syntax into text
- did it avoid calling multiple view tools
- did it ask a sensible clarifying question when appropriate

That balance should be reversed.

## Principles For The Next Evals

The next iteration of the evals should be built around these principles.

### 1. Prefer Invariants Over Choreography

Good invariants are things that should almost never be violated, regardless of wording.

Examples:

- narration must be present
- raw JSON must not appear in narration
- tool names must not appear in narration
- no more than one view tool may be called in a single turn
- if `showCompareView` is used, comparison targets must be present

These are strong tests because they reflect product constraints, not benchmark tuning.

### 2. Prefer Families Of Prompts Over Single Trigger Phrases

If we want to test ambiguity handling, we should use a set of broad prompts and score overall behavior across the set. We should not force one exact behavior on one exact phrase unless that phrase reflects a real product contract.

Good:

- a bank of ambiguous prompts that should produce clarifying behavior most of the time

Bad:

- a single phrase that must always trigger one exact tool call

### 3. Separate Hard Expectations From Soft Preferences

Some behaviors should be strict pass/fail.

Examples:

- no raw JSON in narration
- no multiple view tools
- narration exists

Other behaviors should be scored more softly.

Examples:

- using `suggestAnswers` on some percentage of ambiguous prompts
- preferring one view over another when both are reasonable
- choosing a more illustrative theme when appropriate

Those should not be mixed into one deterministic routing score.

### 4. Treat The Assistant As Answer-First

The evals should reflect the real assistant contract:

- answer first
- optionally change the view
- optionally suggest answers

The evals should not act as though tool routing is the main purpose of the model.

## Recommended Eval Categories

The next pass should split evals into clearer categories.

### A. Hard Constraint Evals

These should be high-signal and close to binary.

Recommended checks:

- narration present
- no raw JSON in narration
- no tool syntax in narration
- no more than one view tool in a turn
- `suggestAnswers` payload, when present, contains only answer strings
- comparison tool only used when comparison targets are clear

These are the best candidates for strict CI gating.

### B. Routing Sanity Evals

These should test obvious, explicit asks where the correct view is clear.

Examples:

- explicit resume/CV request -> `showResumeView`
- explicit projects overview -> `showProjectsView`
- explicit technical expertise request -> `showSkillsView`
- explicit chronology question -> `showTimelineView`

These should remain deterministic because the user intent is clear.

### C. Ambiguity Handling Evals

These should test whether the assistant handles ambiguity well.

Important:

- the primary expectation should be a clarifying question
- `suggestAnswers` should usually help, but should not be mandatory in the main routing evals
- the assistant should not fan out across multiple view tools to cover possible meanings

Recommended scoring:

- hard fail if more than one view tool is used
- pass if the model asks a sensible clarifying question
- optional bonus or separate metric if `suggestAnswers` is also used

### D. Special Response Evals

These should cover durable product-specific rules such as:

- portfolio-mechanics questions
- education / self-taught framing
- weakness answers
- explicit resume handling

These should be based on product intent, not on benchmark hacks.

### E. Suggest Answers Adoption Evals

This should be its own file or score group.

The goal is not:

- "this exact prompt must call `suggestAnswers`"

The goal is:

- "across a bank of ambiguous prompts, `suggestAnswers` is used often enough to show the feature is alive and helpful"

This is where a threshold like `>50%` makes sense.

That threshold should be applied to a curated set of ambiguous prompts, not to the whole prompt space.

## Recommended Changes To Existing Eval Files

This section describes the direction for the later eval update pass.

### `evals/ask-routing.eval.ts`

Current problems:

- contains a phrase-specific expectation for `suggestAnswers`
- still reflects the old tool naming
- focuses on exact tool output more than ambiguity quality

Recommended changes:

- migrate expected tool names to the new model-facing names:
  - `showTimelineView`
  - `showProjectsView`
  - `showSkillsView`
  - `showValuesView`
  - `showCompareView`
  - `showExploreView`
  - `showResumeView`
- remove hard requirements that one ambiguous phrase must emit `suggestAnswers`
- keep deterministic routing cases only where intent is explicit
- add a scorer that fails if more than one view tool is emitted

### `evals/landing-suggestion-chips.eval.ts`

Current problems:

- mixes product chip coverage with routing expectations
- still reflects the old tool naming
- can over-constrain cases where more than one view would be defensible

Recommended changes:

- migrate expected tool names to the new model-facing names
- keep chip prompts that represent explicit intents
- where multiple views are defensible, score a set of acceptable outcomes instead of one rigid answer
- do not require `suggestAnswers` in this file unless the chip itself is specifically designed to test it

### `evals/helpers/askEvalScorers.ts`

Current problems:

- scorer shape is still centered on exact primary directive plus optional `suggestAnswers`
- not enough emphasis on invalid multi-view-tool turns
- no scorer for raw JSON leakage in narration

Recommended additions:

- scorer: `scoreSingleViewToolMax`
- scorer: `scoreNoRawJsonInNarration`
- scorer: `scoreNoToolSyntaxInNarration`
- scorer: `scoreClarifyingQuestionPresent` for ambiguous test sets
- optional aggregate scorer for `suggestAnswers` usage rate

### `evals/helpers/runAskEval.ts`

Recommended changes:

- normalize the new `show*View` tool names
- remove any logic that exists only to emulate legacy fallback behavior
- keep normalization focused on the aspects we truly care about scoring

## What We Should Avoid In The Next Eval Pass

We should explicitly avoid:

- adding more phrase-specific routing hacks
- forcing `suggestAnswers` on one exact prompt in the main routing evals
- treating exact tool sequences as the main sign of quality
- allowing eval pressure to push raw JSON examples back into the prompt
- measuring only the first view tool while ignoring extra invalid ones

## Proposed Rollout For The Next Eval Pass

Recommended order:

1. migrate expected tool names to the new `show*View` names
2. add hard invariant scorers
3. loosen ambiguous routing expectations so they test clarification quality, not exact tool choreography
4. add a separate aggregate `suggestAnswers` adoption eval file
5. only after that, decide which scores should gate CI

## Summary

The next eval system should reward durable product behavior:

- answer-first responses
- clear narration
- clean tool usage
- zero raw JSON leakage
- at most one view tool
- healthy but not mandatory `suggestAnswers` usage on ambiguous prompts

It should stop rewarding prompt overfitting to one benchmark phrase.
