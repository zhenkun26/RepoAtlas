## 1. AST contract and policy

- [x] 1.1 Add backward-compatible syntax-confirmed evidence, AST observation, parser status, and per-file bound types without exposing full AST or unredacted source.
- [x] 1.2 Add the read-only `parse-ast` action, AST limits, and cache compatibility fields while preserving existing scope, sensitive-path, budget, and AbortSignal policies.

## 2. TypeScript/JavaScript parser

- [x] 2.1 Implement a TypeScript compiler-API adapter that parses only safe redacted `.ts`, `.tsx`, `.js`, and `.jsx` snapshots and emits bounded import/export/declaration observations with source locations.
- [x] 2.2 Add bounded traversal and file-level status handling for unsupported extensions, parser diagnostics, parser unavailability, observation limits, AST budget exhaustion, and interruption.

## 3. Analysis and cache integration

- [x] 3.1 Feed current and reusable session evidence into the AST path without a second full read or parse for unchanged compatible entries, and replace stale AST evidence for changed, deleted, or policy-incompatible paths.
- [x] 3.2 Merge AST-backed import/export and declaration relationships with text-inferred relationships, deduplicate by relationship identity, preserve all evidence ids, and never upgrade text-only edges.
- [x] 3.3 Carry syntax-confirmed, inferred, not-analyzed, read-failed, budget-exhausted, and interrupted states into atlas and Markdown output with bounded parser limitation summaries.

## 4. Verification and release documentation

- [x] 4.1 Add tests for parser success and locations, mixed inferred/confirmed edges, unsupported and malformed files, sensitive paths, AST/read budgets, AbortSignal, cache reuse, invalidation, deletion, and scope coverage.
- [x] 4.2 Run TypeScript static checking, lint, full tests, strict OpenSpec validation, and v1.2 regression checks; resolve failures without weakening the safety boundary.
- [x] 4.3 Document AST support and limitations, session-only/cache behavior, security and partial-result semantics, update the roadmap and validation entry, then sync and archive this change only after all implementation tasks pass.
