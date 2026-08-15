## Context

The safety lint currently calls `execFileSync('rg', ['--files', 'src'])` before reading each source file. That works on the development machine but fails on a clean GitHub-hosted runner with `spawnSync rg ENOENT`. The rest of the lint logic is already Node-based and intentionally scans only `src/`.

## Decision

Use `readdirSync` with `withFileTypes: true` and a small recursive helper from `node:fs`, joined with `node:path`. Sort the collected paths before scanning so output and behavior remain deterministic. Keep `readFile` from `node:fs/promises`, the same forbidden regex, adapter exceptions, and pass/fail messages.

## Invariants

- `npm run lint` must not require `rg`, `grep`, Python, or a globally installed linter.
- Only regular files below `src/` are scanned.
- The existing forbidden-token policy and adapter/reporting exceptions remain unchanged.
- Directory traversal failures remain ordinary command failures; the script must not silently report a pass for an unreadable source tree.

## Verification and rollback

Run the lint command with the local `PATH` restricted to Node/npm and run the normal test, typecheck, OpenSpec, and diff gates. Rollback is a one-file code revert; no data or runtime state migration exists.
