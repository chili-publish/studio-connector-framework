# Salsify data connector

Read products from a Salsify PXM organization as a CHILI Studio data source, narrowed by a
designer-supplied Salsify filter expression. Salsify products are freeform key/value attribute
sets with no fixed schema, so this connector is schema-agnostic like the framework's other PIM/DB
connectors — it infers columns by sampling rows rather than reading a fixed model.

This targets **Salsify PXM** (`developers.salsify.com`), not SupplierXM/Alkemics
(`docs.supplierxm.salsify.com`) — a separate product with a different API and data model.

## How it works

Salsify PXM exposes product data as **records** (the modern record-based data model) or, on older
orgs, as **products**. The two share an identical request/response contract, so the connector reads
whichever the `SALSIFY_RESOURCE` runtime option names (default `records`). Below, `<resource>` is
that value.

- **List:** `GET /orgs/{org_id}/<resource>?filter=<expr>&per_page=<n>&cursor=<cursor>`
- **Single item:** `GET /orgs/{org_id}/<resource>/{id}` — direct passthrough for `getPageItemById`.
- **Filtering:** the designer pastes a raw [Salsify filter-language
  expression](https://developers.salsify.com/reference/salsify-filtering-language-syntax) — e.g.
  `='Brand':'Touqe International'` — into the per-template `filterExpression` field; it's forwarded
  as-is as the `filter` query param (verified to narrow results server-side). The framework's own
  `DataFilter[]`/`DataSorting[]` mechanism is not used (see [Capabilities](#capabilities)).
- **Pagination:** cursor-based. The list response is
  `{ "data": [...], "meta": { "per_page": "100", "cursor": <token|null>, "total_entries": N } }`.
  The connector reads `meta.cursor` and forwards it back as the `cursor` query param on the next
  call; a `null`/absent cursor means no further pages. The cursor is opaque and forward-only —
  there is no previous-page equivalent.

## Configuration

### Publish-time runtime options

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `SALSIFY_ORG_ID` | yes | — | The Salsify org id, from the app URL after `/orgs/` (e.g. `s-9b7691d0-…`). One org per environment/publish. |
| `SALSIFY_RESOURCE` | no | `"records"` | Which PXM collection to read: `records` (modern) or `products` (legacy). |
| `logTiming` | no | `"false"` | Set to `"true"` to log per-method and per-fetch timings via `runtime.logError`, mirroring the Supabase/Google Sheet connectors. |

### Per-template configuration

| Field | Required | Description |
| --- | --- | --- |
| `filterExpression` | no | Raw Salsify filter-language expression, e.g. `='Brand':'Touqe International'`. Leave blank to return all items. |
| `idColumn` | no | Name of the Salsify attribute holding the item id. Defaults to `salsify:id`. |

### Authentication

`supportedAuth: ["staticKey"]`. Salsify uses a personal API token as an `Authorization: Bearer
<token>` header (generated in the Salsify app: **My Profile → API access → Show API key**). The
framework's `staticKey` auth injects a literal header name/value pair — connector code never
constructs the header itself — so the auth-data file must include the `Bearer ` prefix:

```sh
# auth.json — chmod 600, never commit
{ "key": "Authorization", "value": "Bearer <your-personal-api-token>" }

connector-cli set-auth -t <tenant> -e <env> -b <baseUrl> --connectorId <id> -au browser -at staticKey --auth-data-file ./auth.json
connector-cli set-auth -t <tenant> -e <env> -b <baseUrl> --connectorId <id> -au server  -at staticKey --auth-data-file ./auth.json
```

Both slots typically use the same token. The token inherits the issuing user's permissions.

## Capabilities

`filtering` and `sorting` are `false` — narrowing happens entirely through the raw
`filterExpression` field (which *does* filter server-side) rather than the framework's structured
filter/sort UI, to avoid two overlapping query mechanisms in the binding panel. Salsify's list API
exposes no documented generic sort param, so `sorting` stays off.

## Known limitations

- **No array/list scalar type.** The framework's `DataItem` only supports
  `string | number | boolean | Date | null`. Salsify multi-select / list-valued attributes (e.g.
  `Available Sizes`, `Bullet Features`) are joined into a single `|`-delimited string.
- **Digital assets are out of scope.** Salsify's `/digital_assets` endpoint (images, etc.) belongs
  in a separate media connector using the framework's DAM contract, not this data connector. Note
  records reference their assets via a `salsify:digital_assets` attribute.

## Verified against the live PXM API

All request/response assumptions were confirmed against a real org (`app.salsify.com`) during the
build, including a populated `records` collection (`total_entries: 76`):

- ✅ **Envelope** `{ "data": [...], "meta": { per_page, cursor, total_entries } }`.
- ✅ **Resource** — this org's products live under `/records`; `/products` is empty
  (`SALSIFY_RESOURCE` selects between them).
- ✅ **Page size** — `per_page` (the API silently ignores `limit`).
- ✅ **Cursor round-trip** — page 1 → `?cursor=<meta.cursor>` → page 2 advances to new items.
- ✅ **Id field** — `salsify:id` (e.g. `"HT01"`).
- ✅ **Single item** — `GET /records/{id}` returns the record.
- ✅ **Filter** — `='Brand':'Touqe International'` narrowed 76 → 19 rows server-side.

Left as a future tuning note: `per_page` is capped at 100 (the observed server default); raise if
Salsify supports and you need a larger page size.
