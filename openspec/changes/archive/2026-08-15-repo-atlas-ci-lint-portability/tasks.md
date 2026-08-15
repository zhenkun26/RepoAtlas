## 1. OpenSpec boundary

- [x] 1.1 Validate the portability proposal, design, spec, and non-goals before implementation

## 2. Portable lint implementation

- [x] 2.1 Replace the undeclared `rg` file enumeration with sorted Node.js standard-library traversal
- [x] 2.2 Preserve the existing source scope, forbidden-token policy, exceptions, output, and failure behavior

## 3. Verification and handoff

- [x] 3.1 Run lint with `rg` unavailable and assert the clean-runner success contract
- [x] 3.2 Run npm test, lint, typecheck, independent TypeScript, OpenSpec strict, and diff checks
- [x] 3.3 Reconcile tasks and report commit/push as separately authorized delivery actions
