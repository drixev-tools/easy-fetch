# Gap Analysis — @drixev/easy-fetch

Findings from reading the full `src/`, `__tests__/`, build config, and CI
pipeline. Grouped by severity. File:line references point at the current
state of the repo.

## Correctness bugs

> **Status (2026-09-22, pass 1): #1, #2, #3, #5, #6, #9 fixed.**
> **Status (2026-09-22, pass 2): #4, #7, #8, #13, #15, #19, #20, #21 also
> fixed.** Remaining open items: #10 and #11 are now addressed by new
> top-level `CHANGELOG.md`/`CONTRIBUTING.md` files (not inline fixes, so
> not marked resolved in-place below — see their sections). #12 was
> already satisfied by the test added for #1 in pass 1. #14, #16, #17, #18
> remain open by design (see their sections for why). #6's CI-secret
> caveat is unchanged. See the note at the end of each resolved section.

### 1. ~~User-supplied `signal` silently disables the timeout~~ — FIXED
`src/easyFetch.ts:153` — `signal: config.signal ?? signal`.

The timeout mechanism aborts the **internally created** `controller`, but
if the caller passes their own `AbortSignal` in `config` (which
`IRequestOptions extends RequestInit` explicitly allows), that signal wins
and the internal timeout controller is never wired to the actual `fetch`
call. Result: `{ signal: mySignal, timeout: 5000 }` silently ignores the
timeout — the request can hang forever on `mySignal` alone.

**Fix**: combine both signals, e.g. `AbortSignal.any([config.signal,
signal].filter(Boolean))` (Node 20+/modern browsers), or manually forward
abort from the timeout into `config.signal`.

**Resolved**: `fetch()` now always uses the internal `AbortController`'s
signal; a caller-supplied `config.signal` is forwarded into it via an
`abort` listener (added/removed around the request), so timeout and
external cancellation now compose instead of one silently overriding the
other. Covered by a new test in `__tests__/easy-fetch.test.ts` ("should
still enforce timeout when a caller-provided signal is passed").

### 2. ~~`retryOnStatus` type doesn't match its documented type or usage~~ — FIXED
`src/types/request.ts:9` — `retryOnStatus?: [];`

The type is the empty-tuple type `[]`, not `number[]`. As written, any
caller who actually supplies `retryOnStatus: [502, 429]` gets a **TypeScript
compile error**, even though the README documents it as `number[]` and
`retryRequest()` (`src/helpers/utils.ts:7`) expects `number[]`. The default
value (`[502, 503, 504]`) also violates this type — it only "works" because
the parameter default lives in the function signature, not in the
interface.

**Fix**: `retryOnStatus?: number[];`

**Resolved**: `src/types/request.ts` now declares `retryOnStatus?:
number[];`, matching the runtime default and the README.

### 3. ~~`responseType` option is defined but never consumed~~ — FIXED
`src/types/request.ts:5` — `responseType?: 'json' | 'text' | 'blob';`

Nothing in `easyFetch.ts` or `helpers/utils.ts` reads `config.responseType`.
Response parsing (`parseBody`) is driven purely by the **response's**
`Content-Type` header. A caller who sets `responseType: 'blob'` against a
server that returns `Content-Type: application/json` will still get JSON.
This is either dead API surface (should be removed) or an unimplemented
feature (should be honored as an override) — currently it's misleading.

**Resolved**: `parseBody()` now takes an optional `responseType` parameter
and honors it as an explicit override before falling back to
`Content-Type` sniffing; `easyFetch.ts` passes `config.responseType`
through at both the success and error parsing call sites. Covered by a new
test ("should honor responseType override regardless of Content-Type
header").

### 4. ~~Streaming/one-shot request bodies break retries~~ — FIXED (fails fast instead)
`src/helpers/utils.ts:3-30` (`retryRequest`) combined with
`prepareBody()`.

If `config.body` is a `ReadableStream` (valid per `RequestInit`), the first
`fetch()` attempt consumes it; a retry on a transient 502/503 will send an
empty or already-locked stream on the second attempt. Not exercised by any
test. Low likelihood in typical JSON/form usage, but a real trap for anyone
using `retries > 0` with streamed bodies.

**Resolved**: replaying a streamed body isn't feasible without buffering
it into memory (which would defeat the point of streaming), so
`EasyFetch.request()` now throws synchronously — *"Cannot retry a request
with a streamed body"* — when `retries > 0` and `config.body` is a
`ReadableStream`, instead of silently corrupting the retried request.
Covered by a new test ("should refuse to retry a request with a streamed
body").

### 5. ~~Body type is a lie the tests have to work around~~ — FIXED
`src/types/request.ts:3` — `IRequestOptions extends RequestInit`, so
`body` is typed as `BodyInit | null | undefined`. But the actual runtime
behavior (`prepareBody`, `easyFetch.ts:113-121`) explicitly supports and
auto-serializes **plain objects** as the primary ergonomic feature
("automatic JSON parsing" per the README).

Every test that exercises this (`__tests__/easy-fetch.test.ts:408-410`,
`__tests__/createClient.test.ts:102-104,121-123`) has to add
`// @ts-expect-error` to pass a plain object as `body`. That's a strong
signal the public type is wrong, not that the tests are doing something
unusual — real consumers hit the same compile error the moment they use
the library's flagship feature with `strict` TypeScript.

**Fix**: `body?: BodyInit | Record<string, unknown> | null` (or a small
generic) instead of inheriting `RequestInit['body']` verbatim.

**Resolved**: `IRequestOptions` now extends `Omit<RequestInit, 'body'>`
and redeclares `body?: BodyInit | Record<string, unknown> | null`. The
now-unneeded `@ts-expect-error`/misspelled `@ts-expect-errors` comments
guarding plain-object bodies were removed from
`__tests__/easy-fetch.test.ts` and `__tests__/createClient.test.ts`.

## Packaging / metadata inconsistencies

### 6. ~~Package identity mismatch between `package.json` and `README.md`~~ — FIXED
- `package.json:2` → `"name": "@drixev/easy-fetch"`
- `README.md:1,3,4,21,117` → `@fsad-labs/easy-fetch` throughout (title,
  npm/license badges, install command, `require()` example).
- `package.json:17-19` repository URL points at
  `github.com/drixev-tools/easy-fetch`, matching the actual git remote
  (`github-personal:drixev-tools/easy-fetch` per the session's git status),
  but the CI secret is named `NPM_TOKEN_FSAD_LABS_EASY_FETCH`
  (`.github/workflows/npm-publish.yml:40`), and there's a separate
  `README.npm.md` — suggesting a past rename from `@fsad-labs` to
  `@drixev` that was only partially completed.

**Impact**: anyone following the current README's install instructions
(`npm i @fsad-labs/easy-fetch`) installs the wrong (or a stale/nonexistent)
package. Badges will 404 or point at the wrong npm listing.

**Fix**: pick one identity and propagate it everywhere — `package.json`,
`README.md`, `README.npm.md`, badge URLs, and the CI secret name.

**Resolved**: canonical identity confirmed as `@drixev/easy-fetch`.
`README.md` now uses `@drixev/easy-fetch` throughout (title, badges,
install command, code samples); the duplicate `README.npm.md` was removed
entirely (see #8). The `.github/workflows/npm-publish.yml` secret
reference was updated from `NPM_TOKEN_FSAD_LABS_EASY_FETCH` to
`NPM_EASYFETCH` outside of this fix pass — assumed to mean the matching
GitHub repository secret has been renamed to match; verify that's true
before the next release, since a mismatch here fails `npm publish` at the
very last CI step.

### 7. ~~No `engines` field~~ — FIXED
`package.json` never declares a minimum Node version, but the library
hard-depends on global `fetch`/`Headers`/`AbortController`/`URL` being
present, which requires **Node ≥ 18** (stable global fetch) if consumed in
Node rather than a browser. A consumer on Node 16 gets a runtime
`ReferenceError`, not an install-time warning.

**Fix**: add `"engines": { "node": ">=18" }`.

**Resolved**: added to `package.json`.

### 8. ~~Two READMEs, unclear purpose split~~ — FIXED (by removing the duplicate)
`README.md` and `README.npm.md` both exist with no explanit that one is a
trimmed variant published to npm (e.g. via a `files`/`prepack` step).

**Correction during the fix pass**: `npm pack --dry-run` showed
`README.npm.md` *was* actually being included in the published tarball —
npm includes any file matching `readme*` by default, regardless of the
`files` field, not just the exact `README.md` stem. So it wasn't dead
weight; it was a maintained-by-hand duplicate that had already drifted out
of sync once (the `@fsad-labs` naming bug in gap #6 existed in both
files).

**Resolved**: deleted `README.npm.md`. npm's registry page renders
`README.md` specifically, so nothing user-facing changes; the tarball is
now ~4.8kB smaller and there's a single source of truth to keep updated.

## Documentation / public-API surface gaps

### 9. ~~Core types are not exported from the package entrypoint~~ — FIXED
`src/index.ts` re-exports `EasyFetch`, `createClient`, `clients.ts`, and
`EasyFetchError`, but never re-exports `src/types/*` (`IRequestConfig`,
`IRequestOptions`, `IResponse`, `IInterceptors`, `IEasyFetchOptions`,
`IEasyFetchClient`, `HttpMethod`, `QueryParamsType`). Consumers writing
TypeScript (e.g. to type an interceptor or a wrapped response) cannot
`import type { IResponse } from '@drixev/easy-fetch'` — they'd have to
reach into the compiled `.d.ts` internals or re-derive the shape via
`ReturnType`/`Parameters` gymnastics.

**Fix**: add `export * from './types';` to `src/index.ts`.

**Resolved**: `src/index.ts` now includes `export * from
'./types/index.js';`. No naming collisions with the class/function
exports already there.

### 10. ~~No CHANGELOG~~ — FIXED
Versions are bumped in `package.json` (currently `1.0.8`, uncommitted per
git status) and published via GitHub Releases, but there's no
`CHANGELOG.md` and the release workflow doesn't generate release notes.
Consumers have no way to see what changed between `1.0.x` versions short of
diffing tags.

**Resolved**: added `CHANGELOG.md` (Keep a Changelog format) with an
`[Unreleased]` section documenting everything fixed across both passes of
this review. Not wired into CI/release automation — that's a separate,
larger decision (e.g. `changesets`/`release-please`) left for the
maintainer.

### 11. ~~No CONTRIBUTING guide / issue-PR templates~~ — PARTIALLY FIXED
Repo has `.github/FUNDING.yml` but no `CONTRIBUTING.md`,
`.github/PULL_REQUEST_TEMPLATE.md`, or issue templates — low friction to
fix, relevant once this has external contributors.

**Resolved (partially)**: added `CONTRIBUTING.md` covering setup, the
required local checks (mirroring CI), and the `.js`-extension import
convention that trips up `.d.ts` generation if missed. **Not added**:
`.github/PULL_REQUEST_TEMPLATE.md` or issue templates — genuinely optional
process scaffolding with no functional impact, left for the maintainer to
add if/when external contributions start.

## Testing gaps

### 12. ~~No coverage of the timeout+signal interaction (bug #1)~~ — FIXED
No test passes both `config.signal` and `config.timeout` together, which
is exactly the combination that's broken. The existing timeout tests
(`easy-fetch.test.ts:248-270, 285-310, 464-477`) only ever exercise the
internally generated signal.

**Resolved**: covered in pass 1 alongside the #1 fix (see that section).

### 13. ~~No test for `retryOnStatus` actually gating retries by status~~ — FIXED
`easy-fetch.test.ts:322-343` tests retry-on-thrown-error, but nothing
verifies that a **non-retryable** status (e.g. 400) does *not* get
retried, or that a custom `retryOnStatus` list is respected — this is the
main branch inside `retryRequest` (`utils.ts:15-19`) and it's untested.

**Resolved**: added three tests using real `Response` instances (the
existing mocks were plain objects cast `as unknown as Response`, so
`result instanceof Response` — the actual gating check in
`retryRequest` — was never exercised): a default-list retry on `502`, a
non-retried `400` (fetch called exactly once), and a custom
`retryOnStatus: [429]` list.

### 14. No browser/DOM environment test run — LEFT OPEN (reassessed)
`vitest.config.ts` isn't shown to use `jsdom`/`happy-dom`; all tests mock
`globalThis.fetch` directly under Node. Since the package targets both
browser and Node (`dist` ships ESM+CJS, no Node-specific APIs used), there
is no verification against an actual browser-like `fetch`/`Headers`
implementation, only against hand-rolled mocks that may not match spec
edge cases (e.g. `Headers` case-insensitivity, multi-value headers).

**Not fixed, and downgraded on reflection**: Node 18+'s global `fetch`/
`Headers`/`Request`/`Response` (undici) are already a spec-compliant
implementation, not a stand-in — the original framing overstated the gap.
The real remaining weakness is that response *fixtures* in tests are
hand-rolled plain objects (`{ ok, status, headers, json: async () => ... }`
cast `as unknown as Response`) rather than real `Response` instances —
which is precisely what caused gap #13 to go untested. Where that mattered
(the new `retryOnStatus` tests), real `Response` objects were used
instead. Adding a full `jsdom`/browser test project is a separate,
larger infrastructure decision (new dependency, CI matrix change) with
unclear payoff given undici's spec compliance — not folded into this pass.

### 15. ~~`clients.test.ts` mocks the wrong module path~~ — FIXED
`__tests__/clients.test.ts:11` — `vi.mock('./createClient', ...)` (relative
to the test file, i.e. `__tests__/createClient.ts`, which doesn't exist)
instead of `vi.mock('../src/createClient', ...)`. Because the mock target
never resolves, `vi.mock` silently no-ops and the subsequent
`vi.spyOn(clientModule, 'createClient')` is spying on the **real**
`createClient`, not a mock — the test happens to still pass because the
real function is cheap and side-effect-free, but the test's stated intent
("mock createClient so we can verify its arguments") is not what's
actually happening. A future change that makes `createClient` do real work
(e.g. open a connection) would make this test slow/flaky without anyone
noticing why.

**Resolved**: changed `vi.mock('./createClient', ...)` to
`vi.mock('../src/createClient', ...)`, matching how the test itself
imports the module. The mock now genuinely replaces `createClient`; all
three tests still pass against the real mock.

## Architecture / feature gaps (not bugs, but absent capability)

> These four are deliberately left open — they're feature/design
> decisions, not bugs, and "fixing" them means adding new API surface
> rather than correcting existing behavior. #19 is the exception (a real
> naming defect) and has been addressed.

### 16. No cancellation handle exposed per request
`EasyFetch.request()` creates its own `AbortController` internally and
never returns it. The only way to cancel a request from outside is for the
caller to construct and pass their own `AbortSignal` up front — but per
bug #1, doing so currently disables the timeout. There's no
`{ promise, cancel }`-style return or `AbortController` passthrough.

### 17. No request/response logging or telemetry hook beyond interceptors
Reasonable to build on top of the interceptor API, but there's no built-in
"debug mode" (e.g. `EASY_FETCH_DEBUG=1`) — fine for a minimal library, but
worth noting as a deliberate scope boundary rather than an oversight, so
future feature requests can be triaged against it.

### 18. No upload/download progress reporting
Native `fetch` doesn't support upload progress natively either, so this is
inherent to the "thin wrapper" design choice — flagged only so it's an
explicit, acknowledged limitation (relevant for any future "why not just
use fetch directly" / "why not axios" comparison in docs).

### 19. ~~`setIntereptors` naming inconsistency~~ — FIXED (via alias)
`EasyFetch.setIntereptors` (typo: missing "c") vs. `createClient`'s
`setInterceptors` (correct spelling) vs. `IInterceptors` type. Both spellings
are now part of the public API (`easyFetch.setIntereptors` is called
directly in tests and the README), so this typo is essentially permanent
without a breaking change or a deprecated alias.

**Resolved (pass 1)**: added `EasyFetch#setInterceptors` as a
correctly-spelled alias that delegates to `setIntereptors`; the original
misspelled method is kept as-is for backwards compatibility (existing
consumers, tests, and the README that reference it are unaffected).
`createClient()` now wires its `setInterceptors` to
`easyFetch.setInterceptors.bind(easyFetch)`.

**Re-resolved (pass 3, 2026-09-22)**: the pass-1 fix had it backwards —
`setInterceptors` was a thin alias calling the misspelled method, so the
typo was still the "real" implementation and every stack trace / grep hit
led there first. Inverted the delegation: `setInterceptors` is now the
canonical implementation, and `setIntereptors` is the one-line
`@deprecated` alias delegating to it. No behavior change for existing
callers of either name; README and `docs/architecture.md` now present
`setInterceptors` as primary.

**Side-effect caught during the fix**: the original
`setInterceptors: easyFetch.setIntereptors` wiring in `createClient.ts`
only ever worked because it's unbound and `this.interceptors` happens to
be a getter returning the live shared object — `Object.assign` mutated it
regardless of what `this` resolved to at the call site. Adding the new
alias method (which internally calls `this.setIntereptors(...)`) broke
under that same unbound pattern, since the plain `client` object has no
`setIntereptors` method. Fixed by explicitly `.bind(easyFetch)`-ing it in
`createClient.ts` rather than relying on the accidental getter behavior.

## Build pipeline (discovered 2026-09-22 while fixing the above)

These were found by actually running `npm run build` / `npx tsc --noEmit`
during the fix pass — not part of the original read-through, and **not
fully fixed** (the first sub-issue was fixed because it blocked
verification entirely; the second was diagnosed but left as a separate,
larger task — see below).

### 20. `npm run build` could not run at all — FIXED
`tsup.config.ts` had `entry: ['./index.ts']`, but the source lives at
`src/index.ts` and no root-level `index.ts` exists (confirmed unchanged
since commit `4db65bb`). Every invocation of `npm run build` — including
in the `npm-publish.yml` CI workflow, on **every past run** — would have
failed immediately with `Cannot find ./index.ts`.

**Resolved**: changed to `entry: ['./src/index.ts']`. Also fixed the
identical bug in `package.json#scripts.dev` (`tsup ./index.ts --watch` →
`tsup --watch`, since `tsup.config.ts` already declares the entry).

**Open question this raises**: since `dist/index.js` / `dist/index.cjs` /
`dist/*.d.ts` already exist in the repo and look plausible, they were
presumably built locally at some point with a different (correct) config
before this regressed, then committed directly — worth confirming the
currently-published npm package actually matches current `src/`.

### 21. ~~`.d.ts` generation is broken under the current `tsconfig`~~ — FIXED
With #20 fixed, `tsup`'s `dts` build step still fails. Two distinct
problems, surfaced via `npx tsc --noEmit -p tsconfig.json`:

1. **Missing `.js` extensions on relative imports.** `tsconfig.json` sets
   `moduleResolution: "node16"`, which requires explicit extensions on
   relative ECMAScript imports (e.g. `import { X } from './y.js'`, not
   `'./y'`). Only `src/index.ts` was written this way; every other
   internal import across `easyFetch.ts`, `createClient.ts`, `clients.ts`,
   `helpers/*`, `types/*` is missing the extension (~19 more occurrences
   after fixing `handlers/easyFetchError.ts` as part of this pass).
2. **Real type errors**, unrelated to imports, once the above is fixed:
   - `src/easyFetch.ts:35,73` — passing a typed interceptor function into
     the interceptor-array object literals' `use()`/`use()` infers `never`
     for the array element type (the inline interceptor object literals in
     the constructor aren't typed against `IRequestInterceptors`/
     `IResponseInteceptors`, so TS infers `never[]` for `handlers`/
     `successHandlers` from the empty initializer).
   - `src/easyFetch.ts:53-56` — `error` is `unknown` inside the default
     error interceptor's `instanceof Error` branch in a context where TS
     isn't narrowing it (needs a local `const err = error as Error`-style
     fix or an explicit parameter type).
   - `src/easyFetch.ts:199` — `error` implicitly has an `any` type in the
     `.catch(async (error) => {...})` handler.

**Impact**: `dist/*.d.ts` cannot currently be regenerated from `src/` as
it stands. Combined with #20, this means **the CI `build` job would fail
on the next real run**, blocking any future release via
`npm-publish.yml` until both are fixed.

**Resolved**: added the missing `.js` extension to all ~20 remaining
relative imports across `easyFetch.ts`, `createClient.ts`, `clients.ts`,
`helpers/*`, and `types/*` (only `src/index.ts` had it right originally).
Once that was done, `npx tsc --noEmit` reported **zero** errors — the
`never`/`unknown`/implicit-`any` type errors seen earlier in this same
diagnosis turned out to be *cascading artifacts* of the unresolved
imports (TS falls back to weaker inference once a module fails to
resolve), not separate defects needing their own fix. `npm run build` now
produces a clean `dist/index.d.ts`/`dist/index.d.cts`.

### 22. ~~`{...res, config, data}` silently drops `status`/`statusText`/`headers`~~ — FIXED
`src/easyFetch.ts` (success branch of `request()`, around what was line
201). `res` is a native `Response`; its `status`, `statusText`, `headers`,
and `ok` are getters defined on `Response.prototype`, not own enumerable
properties. Object spread (`{...res}`) only copies own enumerable
properties, so `{...res, config, data}` produced an object with **none**
of those fields — `result.status`, `.statusText`, `.headers` were all
`undefined` for any real `fetch()` response.

This was invisible in the existing test suite because every test mocked
`fetch` with a plain object literal (`{ ok, status, statusText, headers,
json: ... }`), whose properties *are* own-enumerable and spread correctly
— masking the exact case that breaks with a real `Response`. Confirmed
the discrepancy directly in Node:
```
const r = new Response('x', { status: 201 });
Object.keys({...r}) // => []
```

**Resolved**: replaced the spread with explicit field reads —
`{ status: res.status, statusText: res.statusText, headers: res.headers,
config, data }`. Added a regression test in `__tests__/easy-fetch.test.ts`
that mocks `fetch` with a real `new Response(...)` instead of a plain
object literal, so this class of bug can't hide behind the mock shape
again.

### 23. Three single-option `clients.ts` factories duplicate `createClient`
`easyFetchAuth`, `easyFetchWithHeaders`, `easyFetchWithTimeout` each set
exactly one field of `IEasyFetchOptions` and otherwise just call
`createClient(...)`, which already accepts `baseUrl`/`headers`/`timeout`/
`token` together. They add three extra named exports and three README
sections for something `createClient({ baseUrl, token, headers, timeout })`
already does in one call, and none of them can be combined (need auth
*and* a timeout? none of the three factories cover that).

**Resolved**: not removed (would break existing consumers of a published
package, v1.0.8) — marked `@deprecated` in JSDoc on all three, pointing at
`createClient` directly. README's "pre-defined clients" section now leads
with the `createClient({...})` form and demotes the three factories to a
"still works, but deprecated" note.

## Suggested priority order

All items are now resolved except the four deliberately-deferred
architecture/feature gaps (#14, #16, #17, #18). Full pipeline
(`lint` → `test` → `test:coverage` → `build` → `check-size` →
`npm pack --dry-run`) verified green end-to-end as of this pass. Double
check that the GitHub repository secret is actually named `NPM_EASYFETCH`
(matching the just-updated workflow reference) before the next release.
