## 1. OpenSpec boundary and release posture

- [x] 1.1 Validate the v2.12 proposal, design, public-release-readiness spec, and dependency boundaries before implementation
- [x] 1.2 Keep v2.11 `inspect-release` implementation and its sync/archive/commit/push decisions independent from v2.12

## 2. Legal and community baseline

- [x] 2.1 Add the MIT license and package license/repository metadata while preserving `private: true`
- [x] 2.2 Add contribution, code-of-conduct, security-reporting, and changelog documents with unreleased-version semantics
- [x] 2.3 State MIT permissions, retained notice requirements, and the separate RepoAtlas source-attribution policy

## 3. Public usage and release documentation

- [x] 3.1 Update README with current v2 lifecycle, source-first Harness installation, validation commands, and explicit non-goals
- [x] 3.2 Add the release checklist with authorized and non-authorized release actions
- [x] 3.3 Extend the roadmap with v2.12 current work and bounded v2.13/v2.14 follow-ups
- [x] 3.4 Reconcile Harness integration documentation with the source-first release posture and deferred real-Harness smoke proof

## 4. Automated quality gates

- [x] 4.1 Add pull-request and `main` push CI for Node.js 22 and 24 using `npm ci`
- [x] 4.2 Run tests, lint, typecheck, strict OpenSpec validation, and diff checks in CI without release side effects

## 5. Verification and handoff

- [x] 5.1 Run documentation/config contract checks and L0/L1/L2 review for the repository-level capability
- [x] 5.2 Run npm test, lint, native and independent TypeScript checks, OpenSpec strict validation, and git diff checks
- [x] 5.3 Reconcile tasks against the final diff and report v2.11 sync/archive/commit/push plus v2.12 release actions as separately authorized follow-ups
