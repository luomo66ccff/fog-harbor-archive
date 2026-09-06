# Fog Harbor Archive 3.0 dependency audit — t001

Date: 2026-09-06. Runtime: Node.js 24.19.0. The repository lockfile is the dependency record for this version.

## Result

`npm audit --json`: 0 total vulnerabilities (0 low, moderate, high or critical).

The pre-upgrade lockfile reported 16 findings: 15 high and 1 moderate. The former 2.2 audit document remains a historical snapshot; its exceptions no longer describe this lockfile.

## Changes

- Next.js / eslint-config-next: 16.3.4; React / React DOM: 19.2.8.
- Node.js 24 aligned across local engine requirement, CI and Docker.
- Removed the unused Vinext, Cloudflare Worker and Sites hosting chains. Vite remains a development dependency used by TypeScript module tests only.
- Production is verified against the generated Next standalone server and its static resources, rather than a second development bundler.
- GitHub CI uses the published [checkout v7](https://github.com/actions/checkout/releases/tag/v7.0.0) and [setup-node v7](https://github.com/actions/setup-node/releases/tag/v7.0.0) releases.

No forced major downgrade or advisory suppression was used. Zero current advisories is a dated dependency result, not a guarantee against undisclosed issues. CI and weekly Dependabot remain enabled.
