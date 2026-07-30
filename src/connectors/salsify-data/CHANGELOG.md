# Releases

# 1.1.3

- [NO-TICKET] Crash-hardening pass (multi-agent review after a Studio crash report):
  - **Pagination forward-progress guard** — never return a `continuationToken` from an empty page,
    a non-string cursor, or a cursor identical to the one just sent; the host pages until the token
    is null, so a non-advancing token would loop Studio forever.
  - **Plain-object row guard** — non-object rows (strings auto-box into per-character
    `Object.entries`!) are filtered from `getPage`/`getModel` and rejected in `getPageItemById`,
    so garbage columns can never be inferred or cached.
  - **Bounded output** — column count capped (300), list-attribute joins capped (100 items),
    every text cell clamped (20k chars), `JSON.stringify` wrapped (deep nesting degrades to
    `[object]` instead of failing the row).
  - **Cache hygiene** — `getPageItemById` no longer seeds the column cache from a single (often
    sparse) record; it only reads it.
  - **401 retry once per instance** — the cold-start retry no longer doubles request volume for
    integrations that call the connector rapidly when auth is genuinely broken.

# 1.1.2

- [NO-TICKET] Conform every emitted value to its column's declared type so Studio never rejects a
  value. Fixes "<boolean column> is invalid. A default value is used." — a boolean column is a
  checkbox with no empty state, but Salsify attributes like "Online Flag" exist only on parent
  records and are absent on variants, so those rows emitted `null`. Absent booleans are now emitted
  as `false` (the framework's own fallback); numbers accept numeric strings, text/date pass through.

# 1.1.1

- [NO-TICKET] Fix column/value misalignment in the Studio data-source table. Salsify records are
  heterogeneous (different records expose different attributes), so emitting each row's own keys
  produced differently-shaped DataItems and the table mapped values to the wrong columns. Every row
  is now projected onto one resolved, ordered column set (cached per resource+filter, shared by
  getModel/getPage/getPageItemById); attributes absent on a row become null instead of shifting the
  remaining columns. Mirrors the Supabase connector's column-resolution pattern.

# 1.1.0

- [NO-TICKET] Surface a clean image reference for binding to the Salsify media connector: the
  `salsify:digital_assets` array is flattened into `image:id`, `image:url`, `image:width`,
  `image:height`, and `image:ids` (all asset ids, pipe-joined) instead of being stringified to
  `[object Object]`. Localised fields like `{ "en-US": "…" }` are now unwrapped to the scalar
  value. `getModel` and value emission share one `flattenRecord` helper so columns stay in sync.

# 1.0.0

- [NO-TICKET] Initial version — read Salsify PXM records (or legacy products, via
  `SALSIFY_RESOURCE`) as a schema-agnostic data source, filtered by a raw Salsify filter-language
  expression, with `meta.cursor` pagination (`per_page`) and optional `logTiming` timing
  diagnostics. Request/response shape verified against the live PXM API.
