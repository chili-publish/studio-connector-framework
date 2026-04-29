# Changelog

## 1.1.0

- RPC mode now auto-discovers columns by sampling one row from the function call (using the user-provided `rpcParams`), so `columnsOverride` is no longer required for typical RPC bindings.
- HTTP error messages now include the PostgREST response body, making 4xx responses actionable in the debugger and Studio.

## 1.0.0

- Initial release. Supabase data connector with `view` and `rpc` query modes, server-side filtering and sorting via PostgREST, OpenAPI-driven column auto-discovery, and `staticKey` authentication.
