# Supabase data connector

Read tables, views, or RPC functions from any Supabase project as a CHILI Studio data source. The connector is intentionally **schema-agnostic** — it doesn't know about a specific data shape. The end user picks a table, view or function per template, and the connector adapts.

## How it works

Supabase exposes every table/view/function in your project's `public` schema as a REST endpoint via PostgREST:

| Mode | What it reads | HTTP call |
| --- | --- | --- |
| `view` (default) | A table or view | `GET /rest/v1/<name>?col=eq.x&order=col.asc&limit=N&offset=M` |
| `rpc` | A Postgres function | `POST /rest/v1/rpc/<name>` with JSON body of arguments |

For server-side filtering and sorting the connector translates the framework's `BidirectionalPageConfig` into PostgREST query params:

- `filters: [{property: "brand_id", value: "1", type: "exact"}]` → `brand_id=eq.1`
- `filters: [{property: "name", value: "chips", type: "contains"}]` → `name=ilike.*chips*`
- `sorting: [{property: "name", direction: "asc"}]` → `order=name.asc`

Pagination uses a numeric offset (`continuationToken` / `previousPageToken`).

## Configuration

### Publish-time runtime options

| Option | Required | Description |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Your project URL, e.g. `https://abcdefgh.supabase.co`. Set at publish time via `--runtimeOption`. |

### Authentication

`supportedAuth: ["staticKey"]`. Configure with the Supabase **anon key** (RLS-protected) or **service-role key** (bypasses RLS). Two slots — `browser` for end-user editor sessions, `server` for headless rendering — typically both with the same key.

```sh
# auth.json
{ "key": "apikey", "value": "<your-supabase-anon-or-service-role-key>" }

connector-cli set-auth -b ENV_API_URL -e ENV --connectorId <id> -au browser -at staticKey --auth-data-file ./auth.json
connector-cli set-auth -b ENV_API_URL -e ENV --connectorId <id> -au server  -at staticKey --auth-data-file ./auth.json
```

> **Note**: Supabase's gateway typically expects both the `apikey` header *and* `Authorization: Bearer <key>`. The framework's `staticKey` injection sets one of them; in practice the `apikey` header alone is usually sufficient because PostgREST validates the JWT contained in it. If you hit `401 No API key found`, try setting the `Authorization` header instead.

### Per-template configuration (end-user)

These show up in the Studio editor when the template is bound to the connector:

| Option | Required | Description |
| --- | --- | --- |
| `queryMode` | no | `view` (default) or `rpc`. |
| `targetName` | yes | Name of the table, view, or function. |
| `idColumn` | no | Primary key column for `getPageItemById`. Defaults to `id`. |
| `rpcParams` | no (rpc only) | JSON object passed as the function arguments, e.g. `{"campaign_slug":"spring-fresh"}`. |
| `columnsOverride` | no | JSON array `[{"name":"foo","type":"singleLine"}]`. Bypasses OpenAPI auto-discovery — use for views/RPCs not exposed in the OpenAPI doc, or to trim the column list. |

## Column type inference

By default the connector hits `GET /rest/v1/` (PostgREST's auto-generated OpenAPI), reads the `definitions.<targetName>.properties` object, and maps Postgres types:

| Postgres → OpenAPI | Studio model type |
| --- | --- |
| `integer`, `bigint`, `numeric`, `real`, `double precision` | `number` |
| `boolean` | `boolean` |
| `date`, `timestamp`, `timestamptz`, `timestamp with time zone` | `date` |
| everything else (text, varchar, uuid, jsonb…) | `singleLine` |

JSONB / array values are stringified into `singleLine`. Use `columnsOverride` if you want a different mapping.

## Publish

```sh
connector-cli publish \
  -b ENV_API_URL -e ENV -n Supabase \
  --runtimeOption SUPABASE_URL=https://<ref>.supabase.co \
  --proxyOption.allowedDomains "*.supabase.co"
```

## Development

```sh
yarn build           # compile TypeScript → out/connector.js
yarn test            # run tests.json against the QuickJS harness
yarn connector-cli debug -p 3300 -w   # local dev server
```

## Limitations & roadmap

- `getPageItemById` is only supported in `view` mode (RPCs aren't addressable by primary key).
- For RPC mode, columns are discovered by calling the function once with `limit=1` and the user's `rpcParams`, then sampling the first row. If the RPC returns no rows for those params, supply `columnsOverride` instead.
- Pagination uses `limit`/`offset`. For very large tables (>10k rows) consider a stable-ordered view backed by a keyset cursor and pass the cursor through `rpcParams`.
- Auth is a single static key. If you need per-end-user JWTs (sign-in flows), this connector isn't the right starting point — use Supabase Auth + an Edge Function in front.
