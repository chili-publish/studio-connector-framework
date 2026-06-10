# Changelog

## 1.3.0

Performance release. The platform proxy round-trip dominates request latency, so all three changes cut round-trips or payload size rather than connector-side compute.

- **Column projection**: when `columnsOverride` is set, every `getPage` / `getPageItemById` request now sends a PostgREST `select=` with just those columns (plus the id column), shrinking the response payload. Inferred/discovered columns are unaffected (they already span the full row). Column names with spaces or special characters are double-quoted automatically.
- **Empty results no longer trigger column discovery**: `getPage` returns an empty page immediately when the query matches zero rows. Previously a cold instance without `columnsOverride` would fire an extra discovery round-trip and then fail with a misleading "cannot infer columns" error instead of returning the (correct) empty page.
- **Automatic retry on cold-start 401**: the platform auth layer can misfire its token path once on first load (401, succeeds on retry). `fetchJson` now retries a single time when a 401 comes back within 2 seconds — protecting headless renders where no human can retry. Slow failures are not retried, to stay clear of the 10s output-job ceiling. With `logTiming` on, the retry is visible as `fetch ... (retry after 401)`.

## 1.2.0

- New runtime option `logTiming` (default `"false"`). Set it to `"true"` to log execution timings for each connector call. Mirrors the Google Sheets connector's `withTiming` helper so slow data bindings can be diagnosed.
- Each public method (`getPage`, `getModel`, `getPageItemById`) is timed end-to-end, and the raw network round-trip nested inside it (`fetch GET|POST /rest/v1/...`) is timed separately. Comparing the two isolates connector-side JS overhead (parsing, column inference) from the Supabase request itself (DB query, platform proxy, network). Timings are emitted via `runtime.logError` to the CLI debugger console and the platform connector logs.
- Zero overhead when the flag is off, so it is safe to keep in a production publish and flip on in the Configuration tab when investigating latency.

## 1.1.1

- **Default mode is now `rpc`** instead of `view`. Pushes the data shape into named, version-controlled Postgres functions by default.
- New runtime option `ALLOW_TABLE_VIEW` (default `"false"`) gates `view` mode per environment. Admins flip it to `"true"` in the Configuration tab to allow table/view reads. Designers selecting `view` without the flag set get a clear error pointing at the option.
- **Migration note**: existing deployments using `view` mode must set `ALLOW_TABLE_VIEW=true` at the next publish (or via the platform UI) — view mode is no longer enabled by default.

## 1.1.0

- RPC mode now auto-discovers columns by sampling one row from the function call (using the user-provided `rpcParams`), so `columnsOverride` is no longer required for typical RPC bindings.
- HTTP error messages now include the PostgREST response body, making 4xx responses actionable in the debugger and Studio.

## 1.0.0

- Initial release. Supabase data connector with `view` and `rpc` query modes, server-side filtering and sorting via PostgREST, OpenAPI-driven column auto-discovery, and `staticKey` authentication.
