# CLAUDE.md

This file provides working context for coding agents operating in this repository.

## Development Commands

### Essential
- `pnpm dev` - Start the Next.js dev server with Turbo
- `pnpm build` - Build the application for production
- `pnpm preview` - Build and start the production server
- `pnpm start` - Start the already-built app
- `pnpm check` - Run lint and TypeScript checks
- `pnpm lint` - Run Next/ESLint
- `pnpm lint:fix` - Run ESLint with auto-fixes
- `pnpm typecheck` - Run `tsc --noEmit`

### Testing
- `pnpm test` - Run Vitest in watch mode
- `pnpm test:run` - Run the test suite once
- `pnpm test:watch` - Run Vitest watch mode
- `pnpm evals` - Run Evalite watch mode

### Formatting
- `pnpm format:write` - Format supported files with Prettier
- `pnpm format:check` - Check formatting

### Theme Generation
- `pnpm generate-themes` - Generate theme TS/SCSS artifacts from `theme-config.json`
- `pnpm generate-themes:help` - Show theme generator help

## Architecture Overview

This is an AI-powered portfolio application built with Next.js App Router. The UI is a mix of:

- an LLM-driven view system
- a force-directed graph visualization layer
- page-style views like projects, values evidence, and resume
- a chat interface that streams narration while the model emits structured UI directives

The current default chat model is OpenAI GPT-4.1 mini, configured in [src/server/model/index.ts](./src/server/model/index.ts).

## Current Request / Response Flow

The old server action flow is no longer the main path.

Current flow:

1. The client calls [`/api/ask`](./src/app/api/ask/route.ts).
2. The request body is validated by [`src/lib/ai/ask-contract.ts`](./src/lib/ai/ask-contract.ts).
3. The route builds model messages via [`src/server/ask/prompt.ts`](./src/server/ask/prompt.ts).
4. The AI SDK streams text and tool calls.
5. The route emits SSE events back to the client:
   - `text`
   - `directive`
   - `clarify`
   - `changeTheme`
   - `error`
   - `done`
6. The client consumes that stream in [`src/lib/chat-actions.ts`](./src/lib/chat-actions.ts) and [`src/lib/askStream.ts`](./src/lib/askStream.ts).

Important: user-facing narration is streamed as plain text. Directive tool payloads are structure-only.

## Directive System

The canonical UI state is the current `directive`.

Directive definitions live in [`src/lib/ai/directiveTools.ts`](./src/lib/ai/directiveTools.ts).

Important current rules:

- `theme` is part of the directive envelope
- `landing`, `resume`, and `explore` are non-variant modes
- `timeline`, `projects`, `skills`, `values`, and `compare` are variant modes

Example shape:

```ts
type Directive =
	| { mode: 'timeline'; theme: ThemeName; data: TimelineDirective }
	| { mode: 'projects'; theme: ThemeName; data: ProjectsDirective }
	| { mode: 'landing'; theme: ThemeName; data: LandingDirective }
	| ...
```

Useful helpers in `directiveTools.ts`:

- `create*Directive(...)`
- `createDefaultLandingDirective(...)`
- `getDirectiveVariant(...)`
- `getDirectiveViewKey(...)`
- `withDirectiveTheme(...)`

## Store and App Bootstrapping

The main Zustand store lives in [`src/lib/PortfolioStore.ts`](./src/lib/PortfolioStore.ts).

Important pieces:

- `directive` is the main app state
- `messages` stores chat history
- `pendingClarify` tracks clarify workflows
- `setDirectiveTheme(...)` mutates `directive.theme`

The store provider lives in [`src/lib/PortfolioStoreProvider.tsx`](./src/lib/PortfolioStoreProvider.tsx).

Initial app bootstrapping:

- [`src/app/page.tsx`](./src/app/page.tsx) is a server component
- it decodes `?state=` from the URL on the server
- it passes the initial directive into [`src/app/HomePageClient.tsx`](./src/app/HomePageClient.tsx)
- `HomePageClient` mounts the store, theme provider, URL sync, chat, and view manager

## URL State

URL state is handled in [`src/utils/urlState.ts`](./src/utils/urlState.ts).

Current design:

- the URL stores only the directive
- assistant prose is not serialized into the URL
- clarify state is not serialized into the URL
- theme is serialized because it is part of the directive

Runtime syncing happens in [`src/components/AppPreloader/UrlStateSync.tsx`](./src/components/AppPreloader/UrlStateSync.tsx).

Important: URL sync now uses `window.history.pushState` / `replaceState`, not Next router navigation. This avoids remounting the app shell during normal state sync.

## Theme System

The current theme system is directive-driven.

Theme context lives in [`src/contexts/theme-context.tsx`](./src/contexts/theme-context.tsx), but it is derived from the store:

- `themeName` comes from `state.directive.theme`
- `setTheme(...)` delegates to `setDirectiveTheme(...)`

There is no longer a separate cookie/localStorage/middleware theme authority. Theme is part of the current directive.

## View System

The transition/view system is centered on:

- [`src/components/ViewTransitionManager/ViewTransitionManager.tsx`](./src/components/ViewTransitionManager/ViewTransitionManager.tsx)
- [`src/lib/ViewTransitions.ts`](./src/lib/ViewTransitions.ts)

Current responsibilities:

- convert directives into `DataSnapshot`s
- decide whether a change is a full transition or an in-place update
- render either one stable instance or an entering/exiting pair

Relevant helpers in `ViewTransitions.ts`:

- `createDataSnapshot(...)`
- `getTransitionDecision(...)`
- `shouldTransition(...)`
- `COMPONENT_TRANSITION_TIMINGS`

If you are changing transition architecture, also read:

- [`docs/views-system.md`](./docs/views-system.md)
- [`TRANSITION_SYSTEM_REFACTOR_PLAN.md`](./docs/TRANSITION_SYSTEM_REFACTOR_PLAN.md)

## Graph Data Model

Portfolio data is stored in [`src/data/portfolio.json`](./src/data/portfolio.json).

The graph schema is typed in [`src/lib/PortfolioStore.ts`](./src/lib/PortfolioStore.ts).

Key node types:

- `person`
- `role`
- `project`
- `skill`
- `value`
- `story`
- `education`
- `cert`
- `award`
- `talk`
- `timeline-month`
- `tag`

Key edge relationships:

- `worked_as`
- `used`
- `learned`
- `built`
- `led`
- `mentored`
- `evidence`
- `values`
- `timeline`
- `happened_during`
- `depends`
- `collab`
- `impacted`

## UI / Styling Notes

This app is SCSS-driven, not Tailwind-driven.

Primary styling entrypoint:

- [`src/styles/main.scss`](./src/styles/main.scss)

Common UI areas:

- force graph components in [`src/components/ForceGraph`](./src/components/ForceGraph)
- projects views in [`src/components/ProjectsView`](./src/components/ProjectsView)
- values views in [`src/components/ValuesView`](./src/components/ValuesView)
- chat in [`src/components/ChatContainer`](./src/components/ChatContainer)

## AI Tools and Prompting

The model can currently use these tool families via `directiveTools.ts` and `clarifyTool.ts`:

- `timelineDirective`
- `projectsDirective`
- `skillsDirective`
- `valuesDirective`
- `compareDirective`
- `exploreDirective`
- `resumeDirective`
- `clarify`
- `changeTheme`

Prompt assembly is in [`src/server/ask/prompt.ts`](./src/server/ask/prompt.ts).

That prompt uses:

- portfolio graph context
- case study data
- Lindsay profile data
- current directive
- chat history

## Telemetry and Environment

Environment validation is in [`src/env.js`](./src/env.js).

Notable server env vars:

- `OPENAI_API_KEY`
- `LANGFUSE_SECRET_KEY`
- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_BASEURL`

Telemetry / instrumentation:

- [`src/instrumentation.ts`](./src/instrumentation.ts)
- [`src/server/langfuse/index.ts`](./src/server/langfuse/index.ts)

## Testing Guidance

Current automated tests cover:

- ask request validation
- prompt assembly
- SSE parsing
- URL state
- apply-directive behavior
- transition decision helpers

When making changes, use the appropriate checks for the scope:

- `pnpm typecheck`
- `pnpm test:run`
- `pnpm lint`
- `pnpm build` when the change could affect App Router/server/client boundaries

Do not assume the dev server is already running. Check the actual task context.

## Known Historical Mismatches

These older descriptions are no longer accurate:

- `src/app/actions/Ask.ts` is not the main chat path; it is legacy-disabled
- there is no single `DirectiveTool.ts` file controlling everything
- narration is not embedded in directive payloads
- theme is not a separate state authority from directive
- the app is not Tailwind-based

If you see code or docs that still assume those models, treat them as stale and verify against the current files listed above.
