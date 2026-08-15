## Why

RepoAtlas v1/v1.2 can infer module relationships from text, but cannot distinguish a syntactically confirmed import, export, declaration, or call boundary from a regex match. Now that evidence freshness and session-local reuse are in place, the next safe increment is a bounded AST pass that makes those distinctions explicit without executing repository code.

## What Changes

- Add a TypeScript/JavaScript AST analysis capability for supported source files.
- Produce bounded syntax observations for imports, exports, declarations, and selected call/route-like boundaries with source locations.
- Mark AST-backed observations and relationships as syntax-confirmed, while retaining text-only relationships as inferred.
- Reuse the existing workspace scope, sensitive-path policy, redaction, read/action budgets, AbortSignal handling, session cache, and partial-result semantics.
- Report unsupported languages, parser failures, and budget/interruption gaps as not-analyzed or read-failed instead of guessing.
- Do not execute code, resolve runtime dependencies, run package tools, add network access, or persist AST data outside the current session.

## Capabilities

### New Capabilities

- `ast-syntax-confirmation`: Bounded, read-only AST observations and syntax-confirmed relationships for TypeScript/JavaScript files.

### Modified Capabilities

<!-- No existing requirement block changes; the new capability adds AST-backed evidence alongside existing text inference. -->

## Impact

- Affected source areas: repository analysis, evidence/report types, relationship inference, session cache integration, and Markdown/atlas rendering.
- The existing TypeScript dependency becomes the parser implementation source; no new external service or network dependency is introduced.
- New structured status/evidence fields must remain backward-compatible for existing callers and preserve v1/v1.2 text-only behavior when AST parsing is unavailable.
- Tests and documentation will add parser success, unsupported language, malformed source, budget, sensitive-content, interruption, and mixed inferred/confirmed relationship cases.
