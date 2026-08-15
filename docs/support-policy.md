# Proposed support policy

This is the proposed support baseline for the first source-first public release. It becomes an adopted project commitment only when a maintainer explicitly approves it with the release decision.

## Supported baseline

- RepoAtlas is loaded from a reviewed source checkout through `cordis.patch.yml`; `package.json` remains `private: true` and no npm package or compiled `dist/` distribution is promised.
- RepoAtlas local checks support Node.js 22 or newer. The repository quality workflow covers Node.js 22 and 24.
- Real DeepSeek Harness compatibility is pinned to the exact revision in [`reference/harness-compatibility.json`](../reference/harness-compatibility.json): `47f943859bef60e4160492346772ded9b24f765a`, with Node 24.x and pnpm 11.7.0.
- Public references, integrations, and redistributed copies should identify **RepoAtlas / 代码星图** and link <https://github.com/zhenkun26/RepoAtlas>. Redistribution retains the MIT notice and disclaimer.

## Outside the current contract

- Node.js versions below 22.
- Arbitrary or moving Harness branches, private forks, or compatibility revisions not covered by a reviewed smoke run.
- Ordinary npm consumer imports of RepoAtlas's raw TypeScript entry points.
- An uptime, response-time, maintenance, or supported-version SLA.

## Issues and security

General issues are handled on a best-effort basis through the public repository. Suspected security issues must use the private reporting route in [`SECURITY.md`](../SECURITY.md); do not disclose an unpatched vulnerability in a public issue or pull request.

When a compatibility or support claim changes, update the manifest, this policy, the release checklist, and a new OpenSpec change together. A preflight result is evidence about one candidate and is not a support guarantee.
