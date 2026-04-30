# Changelog

## 1.1.1

- **Default mode is now `rpc`** instead of `view`. Pushes the data shape into named, version-controlled Postgres functions by default.
- New runtime option `ALLOW_TABLE_VIEW` (default `"false"`) gates `view` mode per environment. Admins flip it to `"true"` in the Configuration tab to allow table/view reads. Designers selecting `view` without the flag set get a clear error pointing at the option.
- **Migration note**: existing deployments using `view` mode must set `ALLOW_TABLE_VIEW=true` at the next publish (or via the platform UI) — view mode is no longer enabled by default.

## 1.1.0

- RPC mode now auto-discovers columns by sampling one row from the function call (using the user-provided `rpcParams`), so `columnsOverride` is no longer required for typical RPC bindings.
- HTTP error messages now include the PostgREST response body, making 4xx responses actionable in the debugger and Studio.

## 1.0.0

- Initial release. Supabase data connector with `view` and `rpc` query modes, server-side filtering and sorting via PostgREST, OpenAPI-driven column auto-discovery, and `staticKey` authentication.
