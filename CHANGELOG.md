# Changelog

All notable changes to this project are documented in this file. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [1.0.9] - 2026-09-22

### Fixed

- `EasyFetch#request()` no longer silently drops `status`, `statusText`,
  and `headers` from successful responses. It previously built the
  result via `{...res, config, data}`, but those fields are getters on
  `Response.prototype`, not own properties, so a real `fetch()` response
  spread to `{}` for them — every consumer saw `res.status === undefined`
  in production even though tests passed (the test suite mocked `fetch`
  with plain object literals, which spread correctly and masked the bug).
- `setIntereptors`/`setInterceptors`: `setInterceptors` (correct spelling)
  is now the canonical implementation; `setIntereptors` (typo) is a
  `@deprecated` one-line alias delegating to it. Previously it was the
  other way around, so the misspelled method was the "real" one.
- A caller-supplied `AbortSignal` no longer silently disables the
  `timeout` option — both now compose, whichever fires first aborts the
  request.
- `retryOnStatus` is now correctly typed as `number[]` (was the empty
  tuple type `[]`, which rejected the documented usage under
  TypeScript).
- `responseType` (`'json' | 'text' | 'blob'`) is now honored as an
  explicit override; previously it was accepted but silently ignored.
- `body` now accepts a plain object without a type error, matching the
  library's actual automatic-JSON-serialization behavior.
- `npm run build` (and `npm run dev`) works again — `tsup.config.ts` and
  `package.json#scripts.dev` pointed at a nonexistent root-level
  `index.ts` instead of `src/index.ts`.
- `.d.ts` generation works again — internal relative imports now include
  the `.js` extensions required by `moduleResolution: "node16"`.
- Retrying a request with a `ReadableStream` body now fails fast with a
  clear error instead of silently sending an empty/locked stream on the
  second attempt.
- `EasyFetch#setInterceptors` (correctly spelled alias of
  `setIntereptors`) is now properly bound when exposed through
  `createClient()`.
- `__tests__/clients.test.ts` now mocks the correct module path (was
  silently mocking nothing).

### Added

- `src/index.ts` now re-exports all public types (`IRequestConfig`,
  `IResponse`, `IInterceptors`, etc.), so consumers can `import type`
  them directly from the package.
- `engines.node: ">=18"` in `package.json`, matching the library's hard
  dependency on global `fetch`/`Headers`/`AbortController`.
- Test coverage for: timeout + external signal interaction, `responseType`
  override, retry gating by `retryOnStatus` (default and custom lists),
  and the streamed-body retry guard.

### Changed

- `easyFetchAuth`, `easyFetchWithHeaders`, `easyFetchWithTimeout` are now
  marked `@deprecated` in favor of calling `createClient({ baseUrl, token,
  headers, timeout })` directly, which covers the same options (and lets
  them be combined, unlike the single-option factories). Still functional
  for backwards compatibility.
- `README.md` and package examples now consistently use the package's
  actual name, `@drixev/easy-fetch` (was inconsistently `@fsad-labs/easy-fetch`
  in places).
- `npm run dev` no longer points at a nonexistent root `index.ts`.

### Removed

- `README.npm.md` — a redundant, hand-duplicated copy of `README.md` that
  was being published in the tarball but never actually rendered by npm's
  registry (which reads `README.md`).

[Unreleased]: https://github.com/drixev-tools/easy-fetch/compare/v1.0.9...HEAD
[1.0.9]: https://github.com/drixev-tools/easy-fetch/compare/v1.0.8...v1.0.9
