# Contributing

Thanks for considering a contribution to `@drixev/easy-fetch`.

## Setup

```bash
npm install
```

Requires Node ≥ 18 (the library relies on the global `fetch`, `Headers`,
and `AbortController`).

## Workflow

```bash
npm run lint          # ESLint (flat config, Prettier-integrated)
npm run test          # run the Vitest suite once
npm run test:coverage # run with coverage thresholds enforced (see vitest.config.ts)
npm run build         # produce dist/ via tsup (ESM + CJS + .d.ts)
npm run check-size    # verify the gzip bundle size hasn't regressed
```

Before opening a PR, make sure all four pass locally — they're exactly
what CI (`.github/workflows/npm-publish.yml`) runs on release.

## Making changes

- Source lives in `src/`; tests live in `__tests__/` and mock
  `globalThis.fetch` directly (no real network calls).
- Keep `src/index.ts` as the single public entrypoint — anything meant to
  be consumer-facing (classes, functions, types) needs to be re-exported
  from there.
- Internal relative imports must include the `.js` extension (e.g.
  `from './helpers/utils.js'`), required by `moduleResolution: "node16"`
  in `tsconfig.json` — omitting it breaks `.d.ts` generation.
- If you touch `src/types/request.ts` or `IResponse`/`IInterceptors`,
  double-check `npm run build` still emits a clean `dist/index.d.ts` —
  type-only breakage doesn't show up in `npm run test`.

## Pull requests

- One logical change per PR; describe the *why*, not just the *what*.
- Add or update tests for any behavior change.
- Update `CHANGELOG.md` under `[Unreleased]`.
