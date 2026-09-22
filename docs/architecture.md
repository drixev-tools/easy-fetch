# Architecture — @drixev/easy-fetch

## 1. What this is

`easy-fetch` is a small, dependency-free TypeScript wrapper around the native
`fetch` API. It is distributed as a dual ESM/CJS npm package (built with
`tsup`) and provides:

- A configurable HTTP client class (`EasyFetch`) with base URL, global
  headers, bearer token, timeout, retry and interceptor support.
- A factory (`createClient`) that wraps `EasyFetch` in an axios-like
  `get/post/put/patch/delete` surface.
- Three convenience factories (`easyFetchAuth`, `easyFetchWithHeaders`,
  `easyFetchWithTimeout`), now deprecated single-option sugar over
  `createClient` — kept for backwards compatibility, but `createClient`
  supports the same options directly and should be preferred.
- A typed error model (`HttpError` → `EasyFetchError`) that normalizes
  network errors, timeouts and non-2xx HTTP responses into one shape.

There is no server, no database, no runtime process — the "system" is a
single library consumed by other Node/browser applications.

## 2. Module map

```
src/
├── index.ts              # public entrypoint — re-exports everything below
├── easyFetch.ts          # EasyFetch class: the actual request engine
├── createClient.ts       # createClient(): method-based facade over EasyFetch
├── clients.ts            # 3 pre-configured factories built on createClient()
├── handlers/
│   ├── httpError.ts       # HttpError: base error (status + body)
│   └── easyFetchError.ts  # EasyFetchError extends HttpError (+ code, original)
├── helpers/
│   ├── build-url.ts       # query-param serialization onto a URL
│   ├── utils.ts           # retryRequest(), prepareBody(), parseBody()
│   └── index.ts           # barrel
└── types/
    ├── config.ts          # IEasyFetchOptions, IRequestConfig
    ├── request.ts         # IRequestOptions (extends RequestInit)
    ├── response.ts        # IResponse<T>
    ├── interceptors.ts    # interceptor function/interface types
    └── method.ts          # IEasyFetchClient, HttpMethod
```

### Dependency direction

```
clients.ts → createClient.ts → easyFetch.ts → helpers/*, handlers/*, types/*
```

Nothing depends "upward" — `easyFetch.ts` has no knowledge of `createClient`
or `clients.ts`. This is a clean layered design: engine → facade →
presets.

## 3. Core components

### 3.1 `EasyFetch` (the engine)

The only class that touches `fetch` directly. Constructed with
`IEasyFetchOptions` (`baseUrl`, `headers`, `timeout`, `token`), it exposes:

- `request<T>(config)` — the single method every code path funnels through.
- `interceptors` — an object with `request.use()`, `response.use()`,
  `response.useError()`, seeded with one **default error interceptor** that
  classifies unknown errors into `EasyFetchError`.
- `setInterceptors(interceptors)` — replaces the interceptor pipelines
  wholesale via `Object.assign`. `setIntereptors` (typo) still exists as a
  deprecated alias delegating to it, kept for backwards compatibility.

### 3.2 `createClient` (the facade)

Wraps one `EasyFetch` instance and exposes `get/post/put/patch/delete` plus
pass-through access to `interceptors` (via a getter, so it always reflects
the live `EasyFetch.interceptors` object) and `setInterceptors`.

### 3.3 `clients.ts` (presets)

Three one-line functions that pre-fill `createClient`'s config for the
token, headers, and timeout use cases. Purely convenience — no unique
logic.

### 3.4 Error model

```
Error
 └─ HttpError        (status, body, code='HTTP_ERROR')
     └─ EasyFetchError (+ code override, + original cause)
```

Every rejection that leaves `EasyFetch.request()` is normalized to an
`EasyFetchError` by the default error interceptor, unless a user-supplied
error interceptor replaces it with something else.

### 3.5 Helpers (pure functions, no state)

- `buildUrl(base, params)` — appends query params via `URLSearchParams`.
- `retryRequest(fn, retries, delay, retryOnStatus)` — generic retry loop;
  retries on thrown errors *and* on responses whose status is in
  `retryOnStatus`.
- `prepareBody(config)` — decides whether to `JSON.stringify` a plain-object
  body based on the resolved `Content-Type`.
- `parseBody(response, contentType)` — picks `.json()` / `.text()` /
  `.blob()` based on the **response's** `Content-Type` header.

## 4. Request lifecycle (`EasyFetch.request`)

```
 1. Resolve absolute URL          (baseUrl + config.url, or config.url if absolute)
 2. Merge headers                  (per-request → global → Authorization if token)
 3. Infer Content-Type             (application/json if body is a plain object)
 4. Run request interceptors       (sequentially, each may replace `config`)
 5. Append query params            (buildUrl)
 6. Create AbortController + timeout timer
 7. fetch() wrapped in retryRequest()
      on resolve:
        - !res.ok  → parseBody(error) → throw HttpError
        - res.ok   → parseBody(data) → run success interceptors → return IResponse
      on reject (any stage):
        - run error interceptors (default: classify → EasyFetchError) → rethrow
 8. finally: clear timeout timer
```

Interceptors are plain arrays run in registration order; each one can
mutate/replace the config or response it receives, matching the
axios-style interceptor pattern.

## 5. Design patterns in use

| Pattern | Where | Purpose |
|---|---|---|
| Facade | `createClient` over `EasyFetch` | method-per-verb ergonomics |
| Factory | `createClient`, `clients.ts` | pre-configured client construction |
| Chain of Responsibility | interceptor pipelines | composable request/response mutation |
| Strategy | `parseBody` / `prepareBody` | content-type-driven (de)serialization |
| Template Method (implicit) | `request()` | fixed pipeline, pluggable steps via interceptors |

## 6. Build & distribution

- **Bundler**: `tsup` → ESM (`dist/index.js`) + CJS (`dist/index.cjs`) +
  `.d.ts`/`.d.cts`, minified, `target: es2020`.
- **Package exports**: dual `import`/`require` conditions in
  `package.json#exports`; `files: ["dist"]` — source is not published.
- **Test**: `vitest`, with `fetch` mocked globally per test — no real
  network calls. Coverage via `@vitest/coverage-v8`.
- **Lint/format**: ESLint (flat config) + Prettier, wired together via
  `eslint-config-prettier` / `eslint-plugin-prettier`.
- **CI/CD** (`.github/workflows/npm-publish.yml`): on GitHub Release,
  `build` job runs install → lint → test → coverage → build → size-check →
  `npm pack --dry-run`; `publish-npm` job (needs `build`) rebuilds and runs
  `npm publish --access public` using an `NPM_TOKEN` secret.
- **Bundle size gate**: `check/check-gzip-size.js`, run as `npm run
  check-size` in CI (fails the pipeline if the gzip size regresses).

## 7. Runtime dependencies

None. `package.json` has zero `dependencies` — only `devDependencies`
(build/lint/test tooling). The package relies entirely on the **global
`fetch`**, `Headers`, `URL`, and `AbortController` being available in the
host runtime (browser or Node ≥ 18).

## 8. External interfaces (public API surface)

Everything exported from `src/index.ts`:

```ts
export { EasyFetchError } from './handlers/easyFetchError';
export * from './easyFetch';      // EasyFetch class
export * from './createClient';   // createClient(), clienType
export * from './clients';        // easyFetchAuth, easyFetchWithHeaders, easyFetchWithTimeout
```

Types (`IEasyFetchOptions`, `IRequestConfig`, `IRequestOptions`,
`IResponse`, `IInterceptors`, etc.) are exported transitively through the
`types/*` barrel re-exported by `easyFetch.ts`/`createClient.ts` imports,
but are **not** re-exported directly from `index.ts` — consumers currently
get them only structurally (inferred), not nominally, unless TypeScript
resolves them through `.d.ts`.
