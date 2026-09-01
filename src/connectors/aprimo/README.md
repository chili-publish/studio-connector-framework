# Media Connector for Aprimo

|  | Connector Type |
| --- | --- |
|  | Built-in |
| ✅ | Built by CHILI publish |
|  | Third party |

[See Connector Types](/GraFx-Studio/concepts/connectors/#types-of-connectors)

A **media connector** for **[Aprimo](https://www.aprimo.com/)** — a Digital Asset
Management (DAM) platform that holds images, documents, and other digital assets.
This connector lets CHILI GraFx **Studio** browse, search, inspect, and download
assets from an Aprimo tenant so they can be placed on a canvas and used in output.

It implements the `Media.MediaConnector` interface: `query`, `detail`,
`download`, `getCapabilities`, and `getConfigurationOptions`.

## Capabilities

| Capability  | Supported | Notes |
|-------------|-----------|-------|
| `query`     | ✅ | Browse the classification tree and search the library. |
| `detail`    | ✅ | Fetch metadata (and pixel dimensions) for a single asset. |
| `filtering` | ✅ | Server-side full-text search against Aprimo. |
| `metadata`  | ✅ | Expose Aprimo field values as asset metadata, with GUID references resolved to readable labels. See [Metadata fields](#metadata-fields). |
| `upload`    | ❌ | Read-only connector — no asset creation. |

Servable file types: **JPG/JPEG, PNG, PDF, TIF/TIFF** — restrictable per
deployment via the [`SUPPORTED_FILE_TYPES`](#supported-file-types) runtime option.

## Support

Please open an issue on the
[studio-connector-framework](https://github.com/chili-publish/studio-connector-framework/issues)
GitHub page.

## Installation

How to deploy or install a connector to your environment?

[See Installation Through Connector Hub](/GraFx-Studio/guides/connector-hub/)

## Prerequisites

Before configuring the connector you need, from your Aprimo administrator:

1. **An Aprimo DAM tenant.** Its two hostnames matter and are *different*:
   - **DAM/API host** — `https://<tenant>.dam.aprimo.com` — used as
     [`BASE_URL`](#runtime-options). The connector appends `/api/core`.
   - **Identity host** — `https://<tenant>.aprimo.com` — hosts the OAuth token
     endpoint (`/login/connect/token`) used for authentication.
2. **A registered OAuth client** (client credentials grant) in Aprimo, giving you
   a **Client ID** and **Client Secret** with the **`api`** scope. Create it in the
   Aprimo DAM under **Administration → Integration → Registrations**: add a new
   registration, choose the **Client Credentials** flow, and note the generated
   Client ID and Client Secret. See
   [Creating client registrations](#creating-the-oauth-client) below.
3. **Sufficient permissions** on the service account behind that client:
   - Read access to the classifications, collections, and records you want to expose.
   - To serve original master files at full resolution, the account needs
     permission to create **download orders**. For unprocessed originals it
     additionally needs *"Disable file processing of download orders"* — without
     it, the connector still returns a processed full-resolution copy, and if the
     order fails entirely it falls back to the rendered preview (see
     [How downloads work](#how-downloads-work)).

### Aprimo documentation

Reference material for setting up the API side (consult your Aprimo administrator
for tenant-specific values and access):

| Topic | Link |
|-------|------|
| Developer portal (entry point) | <https://developers.aprimo.com/> |
| DAM — Getting Started tutorial | <https://developers.aprimo.com/docs/tutorials/dam-developer-tutorial> |
| REST API authorization (OAuth 2.0, client credentials) | <https://developers.aprimo.com/marketing-operations/rest-api/authorization/> |
| DAM REST API reference / Postman examples | <https://developers-api.aprimo.com/> |
| DAM Core API docs (per tenant) | `https://<tenant>.dam.aprimo.com/api/core/docs/` |
| ADAM Administrator Guide — File Types (media engine & preview format) | <https://help.aprimo.com/> → *ADAM Administrator Guide → File Types → Creating and modifying file types* |

#### Creating the OAuth client

1. In the Aprimo DAM, go to **Administration → Integration → Registrations**.
2. Add a registration; set **OAuth Flow Type** to **Client Credentials**.
3. Provide a name/description and the service **User** whose governance the
   connector should inherit.
4. Save, then copy the **Client ID** and **Client Secret** (the secret is shown
   once — treat it like a password).
5. Request a token to confirm it works — `POST https://<tenant>.aprimo.com/login/connect/token`
   with URL-encoded `grant_type=client_credentials`, `scope=api`, `client_id`,
   `client_secret`. A success returns `access_token`, `token_type: Bearer`, and
   `expires_in: 3600`.

### Network access (allowlist)

The connector runs through the GraFx proxy and reaches the following hosts. If your
environment restricts outbound traffic, these must be reachable:

| Host | Purpose |
|------|---------|
| `https://<tenant>.aprimo.com` | OAuth token endpoint (`/login/connect/token`). |
| `https://<tenant>.dam.aprimo.com` | DAM Core REST API (`/api/core/...`) — search, records, classifications, orders, image endpoints. |
| `https://*.previews.aprimo.com` | Signed, short-lived CDN URLs for rendered **thumbnail/preview** images (e.g. `s1.previews.aprimo.com`; the region prefix varies by tenant). |
| Aprimo storage / CDN (Azure Blob Storage, `https://*.blob.core.windows.net`) | Signed delivery URLs for **download-order** master files (`fullres`/`original`). Host is region/tenant-dependent. |

> The two Aprimo hostnames are **different**: authentication uses `<tenant>.aprimo.com`,
> while all data API calls use `<tenant>.dam.aprimo.com`. Both must be allowlisted.
> The previews and storage hosts serve **pre-signed** URLs, so the connector fetches
> them *without* the Authorization header (see [How downloads work](#how-downloads-work)).

## Authentication

- **Type:** OAuth 2.0 Client Credentials (`oAuth2ClientCredentials`)
- **Supported on Server:** ✅
- **Supported on Browser:** ✅ (impersonation)

When configuring the connector in a GraFx environment you supply:

| Field           | Value |
|-----------------|-------|
| **Client ID**     | From your Aprimo OAuth client registration. |
| **Client Secret** | From your Aprimo OAuth client registration. |
| **Token Endpoint**| `https://<tenant>.aprimo.com/login/connect/token` |
| **Scope**         | `api` |

The credentials the connector authenticates with determine which assets are
visible — Aprimo's own governance rules apply. For browser use, GraFx Studio
accesses assets via **impersonation**: the connector's configured credentials
determine what a template user can see. Consult your Aprimo administrator to
confirm the appropriate scope and account governance.

## Configuration

There are two distinct kinds of setting:

- **Runtime options** — set once per deployment (in `package.json` →
  `config.options`, or in the GraFx environment settings). They configure *how the
  connector talks to Aprimo*.
- **Configuration options** — surfaced to the template designer and delivered
  per-call in the request `context`. They *scope what a given template sees*.

The two intentionally use different casing so it's obvious which is which:
runtime options are `SCREAMING_SNAKE_CASE`, configuration options are `camelCase`.

### Runtime options

| Key                    | Required | Example                              | Purpose |
|------------------------|----------|--------------------------------------|---------|
| `BASE_URL`             | **Yes**  | `https://acme.dam.aprimo.com`        | Aprimo DAM tenant base URL. The connector appends `/api/core`. There is **no default** — an unset `BASE_URL` raises an error rather than silently targeting a wrong tenant. |
| `META_DATA_FIELDS`     | No       | `ADAM_Video_Width, _PMDominantColors` | Comma-separated whitelist of Aprimo field **system names** (not display labels) to expose as metadata. Empty / unset → expose **all** fields that have a value. **Setting this explicitly is recommended** — see [Metadata fields](#metadata-fields). |
| `RESOLVE_CLASSIFICATIONS` | No    | `true`                               | When `true` (the default), classification field values carry a readable `label` alongside their `id`. Set to `false` on tenants with very large taxonomies to skip that lookup — values still carry `id`, but lose `label`. **This changes what appears on rendered output.** See [Classification labels](#classification-labels). |
| `SUPPORTED_FILE_TYPES` | No       | `JPG, PNG, PDF, TIF`                 | Comma-separated, case-insensitive list of file types to serve. Empty / unset → all four types. See [Supported file types](#supported-file-types). |
| `DEBUG_LOG`            | No       | `false`                              | When truthy, emits diagnostic log lines via `runtime.logError`. **Leave OFF for production** — on the browser these lines surface in the end user's DevTools console. Never logs tokens or request bodies. |

### Configuration options

These appear in the template/designer UI and are passed back per request in
`context`.

| Key                  | Type | Purpose |
|----------------------|------|---------|
| `classificationId`   | text | Aprimo classification ID (32-char GUID). When set, browsing starts in this classification and searches are confined to it (exact match — records filed only under descendant classifications appear once the designer navigates into them). Empty → browse the whole library. |
| `collectionId`       | text | Aprimo collection ID (32-char GUID). When set, browse and search return only records that belong to this collection (static *or* dynamic). Combines with `classificationId` as an **AND** — a record must satisfy both. Folder navigation narrows *within* the collection but never escapes it. Empty → not filtered by collection. |
| `metaDataLanguageId` | text | Aprimo language GUID used when reading field values for metadata. Empty → use the language-neutral value. If a field has no value for this language, the neutral value is used as a fallback. |

All three accept a dashed GUID (`576ee5bf-24db-4830-8cbf-abc201167e3d`), a bare
32-char GUID, or a pasted path/URL containing one — the connector extracts the
GUID. A non-GUID (or empty) value is treated as "not set".

## How browsing & scoping works

The connector mirrors Aprimo's own Browse experience:

- **Root browse** shows the real top-level **classification folders** only (no loose
  records), matching what the Aprimo DAM browser shows.
- **Drilling into a classification** shows that classification's direct sub-folders
  followed by its records.
- **Typing a search term** switches to records-only results across the current
  scope.

Two configuration options scope the *whole* connector, and they behave differently:

- `classificationId` is a **folder axis** — it sets the starting folder and confines
  navigation. A live folder navigation by the designer always wins over it (so they
  can still drill into sub-folders).
- `collectionId` is a **membership filter** — it ANDs onto every query and is never
  escaped by folder navigation. Drilling into a classification folder narrows
  *within* the collection, never out of it.

## How search and ID lookup work

A `query` call carries a `filter` value, which can be either a **search term**
(typed in the picker, or set on an image variable by an action) or an **Aprimo
record ID**. The connector decides which path to take by inspecting the value:

- If the single filter value is a **32-character hex string** (the shape of an
  Aprimo record GUID), the connector does a direct `GET /record/{id}` and returns
  exactly that one asset.
- Otherwise it runs a **keyword search** and returns a page of matches.

Keyword search first tries the whole term as an exact adjacent **phrase**; if that
matches nothing and the term is multi-word, it falls back to matching each word as
its own prefix, ANDed together (this catches partial/reordered multi-word searches
like `chill logo` → `chillchips logo`). Aprimo full-text has no substring or fuzzy
matching, so a typo won't be rescued.

This matters when a value is set programmatically. When an action sets an image
variable to a **name** (e.g. `"chillchips"`), the engine resolves it by asking the
connector for that keyword and then taking the **first** result — Aprimo's
top-ranked match. If several assets match the name, the variable silently resolves
to whichever Aprimo ranks first; if none match, the variable fails to resolve. For
deterministic results, set the variable to the **record ID** rather than a display
name.

### ⚠️ Don't name records as 32 hex characters

Routing is based purely on the value's shape, so a record whose **name happens to
be exactly 32 hex characters** (`0–9`, `a–f`) — e.g.
`deadbeefdeadbeefdeadbeefdeadbeef` — is indistinguishable from a record ID. The
connector will treat it as an ID and do a `GET /record/{...}` lookup instead of a
keyword search. This is extremely unlikely for real-world names, but if you set an
image variable by name through an action, **avoid names that are exactly 32 hex
characters.** Any other length, or any character outside `0–9`/`a–f`, routes to
search as expected.

## How downloads work

CHILI requests one of several download tiers via `previewType`. The connector maps
them to the right Aprimo endpoint:

| `previewType`            | Source |
|--------------------------|--------|
| `thumbnail`              | Aprimo rendered thumbnail (~160px). |
| `mediumres` / `highres`  | Aprimo rendered `preview` (larger rendered image). |
| `fullres` / `original`   | The true **master file**, delivered via an Aprimo *download order*. Falls back to the rendered `preview` if the order fails (e.g. a download agreement or processing permission blocks it). |

When CHILI produces **output**, it requests the `fullres`/`original` tier, so output
uses the original master file (with a rendered-preview fallback).

Rendered previews and master files are delivered as short-lived **signed URLs**.
These are self-authenticating, so the connector deliberately strips the
`Authorization` header when fetching them (via `X-GraFx-Proxy-Exclude-Headers`) —
forwarding it would cause the storage origin to reject a valid signature.

## Metadata fields

`META_DATA_FIELDS` controls which Aprimo field values are exposed as asset metadata.
Fields with no value are omitted.

**Every metadata value reaches Studio as a string.** That is a hard constraint of the
engine, not a choice this connector makes — a number or a boolean would fail to
deserialize. Aprimo's list-shaped types are therefore emitted as **JSON encoded in a
string**, which a JavaScript action parses. See
[What each field type becomes](#what-each-field-type-becomes).

### Choosing which fields to expose

- **Format:** a comma-separated list of field **system names**, e.g.
  `ADAM_Video_Width, _PMDominantColors`.
- **Whitespace:** spaces around each name are trimmed; spaces *within* a name are
  preserved.
- **Empty / unset:** every field that has a value is exposed.

> **Use the system name, not the display label.** These are usually different — the
> field labelled "Width" is named `ADAM_Video_Width`, and "Dominant Colors" is
> `_PMDominantColors`. A whitelist written in labels matches nothing and silently
> yields no metadata. Find system names with `GET /api/core/fielddefinitions` and read
> the `name` property (the `label` property is the display text).

**Setting `META_DATA_FIELDS` explicitly is recommended.** Left unset, every populated
field is exposed — commonly 30–55 fields and up to ~20 KB *per asset*, on every row of
every page. Raw XMP/IPTC blocks and AI-generated summaries are among the heaviest, and
nothing is truncated.

The language used to read values is controlled by the `metaDataLanguageId`
configuration option, falling back to the language-neutral value.

### What each field type becomes

The **"On a text variable"** column is what a designer sees with *no action written*.
Five types need an action before a human-readable value appears on artwork.

| Aprimo type | Example in Aprimo | Metadata value | On a text variable, no action | In an action |
|---|---|---|---|---|
| SingleLineText, MultiLineText | `Autumn hero` | `"Autumn hero"` | Autumn hero | `getVariableValue('Title')` |
| Numeric | `6142` | `"6142"` | 6142 — also maps to a Number variable | `Number(v)` |
| Date | `2026-12-31` | `"2026-12-31"` | 2026-12-31 — also maps to a Date variable | `new Date(v)` |
| Duration | 32.37 seconds | `"00:00:32.3686170"` | raw ticks; a Number variable fails | parse manually |
| Html | rich text | `"<div>Autumn</div>"` | markup shown literally | strip tags yourself |
| Json | `{ "k": 1 }` | `"{\"k\":1}"` | the raw JSON | `JSON.parse(v)` |
| TextList | `Green, Black` | `"[\"Green\",\"Black\"]"` | the JSON string | `JSON.parse(v).join(', ')` |
| OptionList | `English` | `"[{\"id\":\"12fa…\",\"label\":\"English\"}]"` | the JSON string | `JSON.parse(v)[0].label ?? …id` |
| ClassificationList | `Benelux` | `"[{\"id\":\"55ce…\",\"label\":\"Benelux\"}]"` | the JSON string | `JSON.parse(v)[0].label ?? …id` |
| HyperlinkList | a link | `"[{\"url\":\"https://…\",\"displayText\":null}]"` | the JSON string | `JSON.parse(v)[0].url` |
| RecordLink | a linked asset | `"[\"4b820ab3…\"]"` | the JSON string | `JSON.parse(v)[0]` |
| UserList | `Becky Lane` | *key absent* | empty string | — not exposed, [see below](#user-fields-are-not-exposed) |

**List types always emit an array, even for a single value**, so an action never has
to branch on how many values it received.

### Reading values in an action

```js
// A label to display. `label ?? id` is the idiom: a reference whose label could
// not be resolved keeps its id and simply has no label key.
const brand = JSON.parse(getVariableValue('Brand'))[0];
setVariableValue('BrandText', brand.label ?? brand.id);

// A link. displayText is nullable, so fall back to the url.
const link = JSON.parse(getVariableValue('ReportLink'))[0];
setVariableValue('LinkText', link.displayText ?? link.url);

// A linked asset: the record ID feeds straight back into this connector,
// which resolves a bare 32-hex GUID to a record.
const pdf = JSON.parse(getVariableValue('AssociatedPDF'))[0];
setVariableValue('PdfImage', pdf);

// A list of plain text values.
const keywords = JSON.parse(getVariableValue('Keywords')).join(', ');
```

`label` and `displayText` are **optional**. When a lookup cannot resolve a reference,
the key is omitted rather than filled with the raw GUID — so `label ?? id` reliably
tells you whether you have a real label or are falling back.

### Classification labels

Classification and option values are stored in Aprimo as GUIDs; the connector looks up
their readable labels once and caches them.

`RESOLVE_CLASSIFICATIONS=false` skips the classification lookup on tenants whose
taxonomy is very large. Values keep the same shape and still carry `id`, but lose
`label` — so an action using `label ?? id` keeps working and renders the GUID instead
of the name. **This changes what appears on rendered output**, so it is not a setting
to flip casually on a tenant whose templates already display classification names.

Labels are leaf names. If your taxonomy reuses a name across branches (a `Brochure`
under both *AssetType* and *Channel*), the labels alone will not distinguish them.

### User fields are not exposed

Aprimo `UserList` fields — `Owner` and similar — are **deliberately excluded** from
metadata. Resolving them means placing a named individual's details into a Studio
document and, from there, into rendered output. No template-building use case has been
identified that requires it, so the connector does not open that door.

This is a decision, not an oversight. If a genuine use case appears, it should be
added deliberately rather than enabled by default.

### Mapping metadata onto Studio variables

Metadata reaches a template by being mapped onto a variable. Mismatches **fail
silently** — the variable keeps its previous value and the error goes only to the
engine log.

| Variable type | Given | Result |
|---|---|---|
| Text | anything | Works. A missing key sets `''`. |
| Number | `"6142"` | Works. A duration, a GUID, or a comma decimal separator fails. |
| Date | `"2026-12-31"` | Works; `yyyy-MM-dd`, and datetimes are truncated at `T`. |
| Boolean | a GUID | Fails. Only `true/yes/1/false/no/0/''` are accepted. |
| List | a value not among the list items | Fails. |

Because JSON-shaped values are strings, mapping one directly onto a Number, Date, or
Boolean variable will not work — parse it in an action and write the result instead.

### Field names with commas

The comma is the delimiter, so a field whose system name contains a literal comma
cannot be whitelisted. This is rare — if you hit it, rename the field in Aprimo.
Names containing **spaces** are fully supported.

## Supported file types

`SUPPORTED_FILE_TYPES` restricts which file types the connector will serve. Assets
whose type isn't in the list are filtered out of query results and details.

- **Allowed values:** `JPG` (or `JPEG`), `PNG`, `PDF`, `TIF` (or `TIFF`).
- **Format:** comma-separated and **case-insensitive** — `jpg, png, pdf, tif` and
  `JPG,PNG,PDF,TIF` are equivalent.
- **Dual names collapse to one type.** `JPG` and `JPEG` are the same type, and `TIF`
  and `TIFF` are the same type. Listing both members of a pair is harmless. A `.jpeg`
  asset is served whenever `JPG` is enabled (and vice versa), and `.tiff` whenever
  `TIF` is enabled.
- **Unrecognised entries are ignored.**
- **Empty / unset** (or a list with no recognised entries) → **all four** types are
  allowed.

### ⚠️ TIFF and PDF: set the Aprimo preview format to PNG

For `thumbnail`, `mediumres`, and `highres` tiers the connector serves Aprimo's
**rendered preview** — an image Aprimo generates in whatever **Preview format** is
configured for that file type. **The default preview format is JPEG.** JPEG cannot
represent transparency and introduces compression artifacts, which is a problem for
**TIFF** and **PDF** assets (which frequently have transparent regions or line art).

To get clean renders for these types, an Aprimo administrator must set the **Preview
format to PNG** for the **TIFF** and **PDF** file types:

- In the Aprimo DAM: **Administration → File Types** → open the file type → set its
  **Preview / rendition format** to **PNG** (see the *ADAM Administrator Guide → File
  Types → Creating and modifying file types*, <https://help.aprimo.com/>).
- This affects only Aprimo's rendered preview/thumbnail. The `fullres`/`original`
  tier already delivers the true master file untouched, so it is unaffected.

If the preview format is left at JPEG, TIFF/PDF thumbnails and previews will still
load, but transparency is flattened (typically onto a black or white background) and
edges may show JPEG artifacts.

## Finding Aprimo IDs

The configuration options take 32-char GUIDs. To find them:

- **Classification ID** — open the classification in the Aprimo DAM and copy the GUID
  from the URL, or use the API (`GET /api/core/classifications`).
- **Collection ID** — open the collection in Aprimo and copy the GUID from the URL,
  or use the API. Both static (manually curated) and dynamic collections work.
- **Language ID** — the Aprimo language GUID for the locale whose field values you
  want; ask your Aprimo administrator or read it from the field metadata API. The
  all-zero GUID is the language-neutral value (the default when no language is set).
- **Field system name** — for `META_DATA_FIELDS`, use `GET /api/core/fielddefinitions`
  and read each entry's `name` property. This is *not* the display label shown in the
  Aprimo UI.

The connector accepts dashed or bare GUIDs, so paste whichever form the UI gives you.
