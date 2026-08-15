## 1. OpenSpec boundary

- [x] 1.1 Validate the v2.17 proposal, design, tasks, and public-release-alignment spec before implementation
- [x] 1.2 Confirm the existing `v0.1.0` tag is treated as immutable and that the change has no remote-write or npm-publication scope

## 2. Release candidate alignment

- [x] 2.1 Select and document the next patch candidate version without moving `v0.1.0`
- [x] 2.2 Align `package.json`, `CHANGELOG.md`, README release-status wording, and release documents with the selected candidate
- [x] 2.3 Record the recommended GitHub About description, homepage, and accurate topics as manual handoff metadata
- [x] 2.4 Update the roadmap and release checklist without claiming that a GitHub Release, npm publication, deployment, or support SLA exists

## 3. Local evidence and safeguards

- [x] 3.1 Extend local release-preflight checks only where fixed local evidence can prove the condition; keep network and remote release state out of the tool
- [x] 3.2 Add regression tests for tag immutability, version/document consistency, bilingual release wording, and blocked stale-candidate states
- [x] 3.3 Preserve source-first `private: true`, MIT/license and RepoAtlas / 代码星图 attribution guidance, and all session-only/runtime boundaries

## 4. Verification and handoff

- [x] 4.1 Run the full final-candidate verification on a clean, archived candidate; the clean candidate passed all listed gates
- [x] 4.2 Reconcile the task list and archive the completed OpenSpec change only after implementation evidence is complete
- [x] 4.3 Report the exact reviewed candidate revision and explicitly record that no tag, GitHub Release, npm publication, push, deployment, or remote metadata mutation was performed
