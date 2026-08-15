## Why

RepoAtlas has a substantial safety and lifecycle implementation, but the repository landing page currently reads like an internal milestone log. The first screen should communicate the project's purpose, value, supported installation path, safety model, compatibility pin, and open-source terms before a new contributor or evaluator reads the detailed documentation.

The package metadata description is also primarily Chinese and does not give an English-speaking open-source visitor a concise statement of what the project is.

## What changes

- Add an open-source-oriented project description and status overview to `README.md`.
- Reorganize the README around value proposition, capabilities, quick start, safety boundaries, compatibility, development checks, and documentation links.
- Add accurate CI/license/Node badges without presenting them as npm publication or release evidence.
- Update `package.json`'s description with a concise English description that preserves the source-first and safety boundaries.
- Keep the MIT license, separate RepoAtlas / 代码星图 attribution request, pinned Harness compatibility contract, and no-npm posture explicit.

## Capabilities

### New Capabilities

- `open-source-showcase`: public-facing repository description and README guidance for evaluating, installing, and contributing to RepoAtlas.

## Impact

- Affected files: `README.md`, `package.json`, and this OpenSpec change.
- No `src/` runtime behavior, Harness tool schema, session-only state, evidence cache, proposal registry, lifecycle history, Git adapter, or release automation changes.
- No npm publication, GitHub Release mutation, tag mutation, network access, dependency installation, or source workspace write from the feature itself.
