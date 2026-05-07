# Supabase data connector

Read tables, views, or RPC functions from any Supabase project as a CHILI Studio data source. The connector is intentionally **schema-agnostic** — it doesn't know about a specific data shape. The end user picks a table, view or function per template, and the connector adapts.

## How it works

Supabase exposes every table/view/function in your project's `public` schema as a REST endpoint via PostgREST:

| Mode | What it reads | HTTP call | Default access |
| --- | --- | --- | --- |
| `rpc` (default) | A Postgres function | `POST /rest/v1/rpc/<name>` with JSON body of arguments | always available |
| `view` | A table or view | `GET /rest/v1/<name>?col=eq.x&order=col.asc&limit=N&offset=M` | requires `ALLOW_TABLE_VIEW=true` |

`rpc` is the default and only-always-on mode by design: it pushes the data shape into named, version-controlled Postgres functions. `view` widens the surface and is gated per-environment by an admin runtime option (see [Query mode access control](#query-mode-access-control)).

For server-side filtering and sorting the connector translates the framework's `BidirectionalPageConfig` into PostgREST query params:

- `filters: [{property: "brand_id", value: "1", type: "exact"}]` → `brand_id=eq.1`
- `filters: [{property: "name", value: "chips", type: "contains"}]` → `name=ilike.*chips*`
- `sorting: [{property: "name", direction: "asc"}]` → `order=name.asc`

Pagination uses a numeric offset (`continuationToken` / `previousPageToken`).

## Configuration

### Publish-time runtime options

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `SUPABASE_URL` | yes | — | Your project URL, e.g. `https://abcdefgh.supabase.co`. |
| `ALLOW_TABLE_VIEW` | no | `"false"` | Set to `"true"` to allow `queryMode=view`. |

Both runtime options are admin-editable in the platform's Configuration tab post-publish.

## Query mode access control

The connector ships with a fail-safe default: only `rpc` mode works out of the box. To enable `view`, an admin sets `ALLOW_TABLE_VIEW=true` in the connector's Configuration tab. This is per-environment policy — the same connector code runs in dev with the flag on and prod with it off.

When a designer picks `queryMode=view` without the flag set, the connector throws `"view" query mode is disabled in this environment.` The error surfaces immediately in Studio's data binding panel, telling the designer which flag the admin needs to flip.

### Authentication

`supportedAuth: ["staticKey"]`. Configure with the Supabase **anon key** (RLS-protected) or **service-role key** (bypasses RLS). Two slots — `browser` for end-user editor sessions, `server` for headless rendering — typically both with the same key.

```sh
# auth.json
{ "key": "apikey", "value": "<your-supabase-anon-or-service-role-key>" }

connector-cli set-auth -b ENV_API_URL -e ENV --connectorId <id> -au browser -at staticKey --auth-data-file ./auth.json
connector-cli set-auth -b ENV_API_URL -e ENV --connectorId <id> -au server  -at staticKey --auth-data-file ./auth.json
```

> **Note**: The `apikey` header alone is sufficient — PostgREST validates the JWT it contains and resolves the role from there. No `Authorization: Bearer` header is needed for either anon or service-role keys.

### Row Level Security

The connector is RLS-aware out of the box: the `apikey`-only header strategy makes PostgREST evaluate every request under the role encoded in the key (`anon` or `service_role`).

Recommended setup for a public-data connector:

1. Enable RLS on every table the connector reads (silences Supabase's "Unrestricted" warning and gives you a hook to tighten later):
   ```sql
   alter table public.<table> enable row level security;
   ```
2. Add a permissive `SELECT` policy for `public` (covers `anon`, `authenticated`, and `service_role`):
   ```sql
   create policy "public read <table>" on public.<table>
     for select to public using (true);
   ```
3. Verify with the anon key — should return rows, not `[]`:
   ```sh
   curl -i "https://<ref>.supabase.co/rest/v1/<table>?limit=1" -H "apikey: <anon-key>"
   ```

If you ship the **anon** key (recommended for public demos) the policies above are required — without a matching policy, RLS silently returns `[]`. If you ship the **service-role** key, RLS is bypassed entirely.

> **Audit your public-schema functions.** PostgREST exposes every public function as `POST /rest/v1/rpc/<name>`. Any function with `EXECUTE` granted to `anon` is reachable by anyone holding the anon key. Run `select proname, has_function_privilege('anon', oid, 'EXECUTE') from pg_proc where pronamespace = 'public'::regnamespace;` and revoke EXECUTE from anon on anything that shouldn't be publicly callable (especially generic SQL-execution helpers).

### Per-template configuration (end-user)

These show up in the Studio editor when the template is bound to the connector:

| Option | Required | Description |
| --- | --- | --- |
| `queryMode` | no | `rpc` (default) or `view`. The latter requires admin opt-in via `ALLOW_TABLE_VIEW`. |
| `targetName` | yes | Function name (rpc) or table/view name (view). |
| `idColumn` | no | Primary key column for `getPageItemById`. Defaults to `id`. Only used in `view` mode. |
| `rpcParams` | no (rpc only) | JSON object passed as the function arguments, e.g. `{"campaign_slug":"spring-fresh"}`. |
| `columnsOverride` | no | JSON array `[{"name":"foo","type":"singleLine"}]`. Bypasses auto-discovery — use when the function returns no rows for the given params, or to trim the column list. |

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
  --runtimeOption ALLOW_TABLE_VIEW=false \
  --proxyOption.allowedDomains "*.supabase.co"
```

Pass `ALLOW_TABLE_VIEW=true` for environments that should allow `view` mode. (Admins can also flip the value later in the Configuration tab without re-publishing — but the publish command requires every option to be supplied each time, so include it.)

## Development

```sh
yarn build           # compile TypeScript → out/connector.js
yarn test            # run tests.json against the QuickJS harness
yarn connector-cli debug -p 3300 -w   # local dev server
```

## Limitations & roadmap

- `getPageItemById` is only supported in `view` mode (RPCs aren't addressable by primary key).
- For `rpc` mode, columns are discovered by calling the function once with `limit=1` and the user's `rpcParams`, then sampling the first row. If the function returns no rows for those params, supply `columnsOverride` instead.
- Pagination uses `limit`/`offset`. For very large tables (>10k rows) consider a stable-ordered view backed by a keyset cursor and pass the cursor through `rpcParams`.
- Auth is a single static key. If you need per-end-user JWTs (sign-in flows), this connector isn't the right starting point — use Supabase Auth + an Edge Function in front.
