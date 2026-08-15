## 1. OpenSpec boundary and decision

- [x] 1.1 Validate the v2.13 proposal, design, tasks, and source-distribution spec before implementation
- [x] 1.2 Confirm source-first remains the distribution decision, `private: true` remains enabled, and the MIT attribution/provenance boundary is unchanged
- [x] 1.3 Review external-integration invariants, failure modes, rollback, and acceptance evidence before adding scripts or workflow

## 2. Local source artifact evaluation

- [x] 2.1 Add the bounded Node-only packed-install smoke and package script
- [x] 2.2 Validate metadata, bundle declaration, source entry points, no-required-dist contract, and installed package metadata from the local tarball
- [x] 2.3 Add the local artifact smoke to the default Node 22/24 quality workflow without adding external Harness installation

## 3. Pinned Harness compatibility

- [x] 3.1 Add the public Harness compatibility manifest with exact revision and toolchain pin
- [x] 3.2 Add the fixed-argument, shell-free Harness smoke runner with isolated temporary `DSH_HOME`
- [x] 3.3 Add the manual `workflow_dispatch` Harness workflow with exact checkout, frozen install, and fail-closed smoke execution
- [x] 3.4 Add documentation explaining that the ignored local reference checkout is evidence only when it matches the public pin

## 4. Public delivery guidance

- [x] 4.1 Update README with the source-first decision, packed artifact evaluation, pinned Harness smoke command, and non-claims
- [x] 4.2 Reconcile Harness integration, security boundary, reference guidance, and release checklist with the v2.13 boundary
- [x] 4.3 Update the roadmap to mark v2.12 complete, v2.13 current, and v2.14 independently gated

## 5. Verification and handoff

- [x] 5.1 Run the local artifact smoke, tests, lint, native/independent typechecks, strict OpenSpec validation, and diff checks
- [x] 5.2 Review workflow/manifest pin consistency and confirm no `src/` runtime changes
- [x] 5.3 Reconcile tasks against evidence and keep real Harness smoke/release claims pending until the explicit workflow succeeds
