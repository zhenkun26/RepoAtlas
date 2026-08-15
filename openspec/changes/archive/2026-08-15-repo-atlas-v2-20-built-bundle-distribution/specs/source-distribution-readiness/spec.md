## MODIFIED Requirements

### Requirement: The repository SHALL retain a source-first distribution contract

The repository MUST keep `package.json` `private: true`, license `MIT`, built `dist/` entry points, and the `dsh.bundle.patch` declaration. It MUST state that a local packed artifact is diagnostic only and MUST NOT claim npm publication or a support guarantee for arbitrary consumer versions.

#### Scenario: A contributor evaluates the local artifact
- **WHEN** a clean checkout runs `npm run verify:built-artifact`
- **THEN** the command SHALL build locally, create a task-owned tarball, install it offline into a task-owned consumer, import the built root and Harness exports, and exit successfully without publishing or changing tracked checkout files

#### Scenario: The source-first posture is inspected
- **WHEN** a contributor reads package metadata, README, and release guidance
- **THEN** they SHALL find `private: true`, built exports and allowlisted artifact contents, the local artifact limitation, and no claim that an npm package has been published
