# Fog Harbor Archive 2.2 dependency audit

Audit date: 2026-07-15
Runtime: Node.js 22 / npm lockfile v3

## Commands and result

```text
npm audit --omit=dev
2 moderate, 0 high, 0 critical

npm audit
2 moderate, 0 high, 0 critical
```

Both commands exit with code `1` because npm reports the recorded moderate advisory below. CI therefore prints the full audit while enforcing `high` or above for production dependencies and `critical` for the complete dependency tree.

## Recorded advisory

| Advisory | Dependency chain | Scope | Assessment and mitigation |
| --- | --- | --- | --- |
| `GHSA-qx2v-qp2m-jg93` — PostCSS can emit an unescaped `</style>` sequence while stringifying CSS | `next@16.2.10 -> postcss@8.4.31` | Production dependency; npm reports two moderate vulnerability counts across the package and chain | The application serves authored static CSS and does not accept, transform, or stringify user-controlled CSS. There is no CSS upload/API surface. Keep Next current, retain CSP-safe rendering practices, and upgrade as soon as Next vendors PostCSS `>=8.5.10`. |

## Remediation performed

- Upgraded Next.js and `eslint-config-next` to `16.2.10`.
- Upgraded the Cloudflare/Vite toolchain to `@cloudflare/vite-plugin@1.44.0`, `vite@8.1.4`, and `wrangler@4.110.0`.
- Ran the non-breaking `npm audit fix`; it updated 17 transitive packages, including `@babel/core` to `7.29.7` and `js-yaml` to `4.3.0`.
- Re-ran both audits. The previous development-only low/moderate findings are cleared; only the Next/PostCSS moderate advisory remains.
- Added weekly Dependabot checks. They create reviewable pull requests and never auto-merge.

## Why `npm audit fix --force` is not used

For this lockfile npm proposes installing `next@9.3.3` to remove the nested PostCSS finding. That is a major downgrade from Next 16, is incompatible with the current React/App Router stack, and would introduce a substantially older framework/security baseline. The forced result is therefore riskier than the documented, non-exploitable-in-current-surface moderate advisory.

## Follow-up

1. Review weekly Dependabot updates and new Next.js releases.
2. Replace this exception as soon as a compatible Next release resolves the nested PostCSS version.
3. Treat any future production `high`/`critical` or complete-tree `critical` audit result as CI-blocking.
