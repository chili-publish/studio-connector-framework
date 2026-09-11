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
| `metadata`  | ✅ | Expose Aprimo field values as asset metadata, with references resolved to readable names. Read when a single asset is resolved, not on picker pages. See [Metadata fields](#metadata-fields). |
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
| `META_DATA_FIELDS`     | No       | `ADAM_Video_Width, _PMDominantColors` | Comma-separated whitelist of Aprimo field **system names** (not display labels) to expose as metadata. When set, the connector also asks Aprimo to send only those fields, which makes each response substantially smaller. Empty / unset → expose **all** fields that have a value. **Setting this explicitly is recommended** — see [Metadata fields](#metadata-fields). |
| `SUPPORTED_FILE_TYPES` | No       | `JPG, PNG, PDF, TIF`                 | Comma-separated, case-insensitive list of file types to serve. Empty / unset → all four types. See [Supported file types](#supported-file-types). |
| `DEBUG_LOG`            | No       | `false`                              | When truthy, emits diagnostic log lines via `runtime.logError`, including one line per metadata resolution with its request counts and timing. **Leave OFF for production** — on the browser these lines surface in the end user's DevTools console. Never logs tokens or request bodies. |

### Configuration options

These appear in the template/designer UI and are passed back per request in
`context`.

| Key                  | Type | Purpose |
|----------------------|------|---------|
| `classificationId`   | text | Aprimo classification ID (32-char GUID). When set, browsing starts in this classification and searches are confined to it (exact match — records filed only under descendant classifications appear once the designer navigates into them). Empty → browse the whole library. |
| `collectionId`       | text | Aprimo collection ID (32-char GUID). When set, browse and search return only records that belong to this collection (static *or* dynamic). Combines with `classificationId` as an **AND** — a record must satisfy both. Folder navigation narrows *within* the collection but never escapes it. Empty → not filtered by collection. |
| `metaDataLanguageId` | text | Aprimo language GUID used when reading field values for metadata. Empty → use the language-neutral value. If a field has no value for this language, the neutral value is used as a fallback. The same language is also sent to Aprimo as the **label language** for option and classification names — see [Language](#language). |

All three go through the **same** normalizer, so all three accept a dashed GUID
(`576ee5bf-24db-4830-8cbf-abc201167e3d`), a bare 32-char GUID, or a pasted path/URL
containing one — the connector strips the dashes, extracts the GUID, and lowercases it
to the form the Aprimo API uses. Case does not matter. A value that contains no GUID at
all (or an empty one) is treated as **"not set"**; when it was not empty, the connector
also logs an `option.notAGuid` line naming the option, so a typo is visible with
[`DEBUG_LOG`](#runtime-options) on instead of silently widening the scope.

## How browsing & scoping works

The connector mirrors Aprimo's own Browse experience:

- **Root browse** shows the real top-level **classification folders** only (no loose
  records), matching what the Aprimo DAM browser shows.
- **Drilling into a classification** shows that classification's direct sub-folders
  followed by its records.
- **Typing a search term** switches to records-only results across the current
  scope.

The root folder list is fetched with a **server-side filter**, so Aprimo returns only
the real top-level classifications rather than the whole taxonomy. The top level is
therefore a single request on a tenant of any size, and `classificationId` is a way to
start designers inside one branch — not a performance measure. The listing is paged at
1000 classifications per request with a safety guard of 50 pages; a tenant with more
than 50,000 root classifications would have its list cut short, and a line is logged
when `DEBUG_LOG` is on.

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

Aprimo cannot filter a search by file type, so matches outside
[`SUPPORTED_FILE_TYPES`](#supported-file-types) — a video, a DOCX — have to be discarded
by the connector after Aprimo returns them. When resolving a name, the connector
therefore **inspects up to 300 matching records** (six requests of 50) looking for the
first one it can serve. That is the whole budget: if none of those 300 is a supported
file type, the variable fails to resolve, even if a supported match exists further down
the result list. Turn `DEBUG_LOG` on and look for the `resolve.exhausted` line — it
records how many records were scanned against how many matched in total, which
distinguishes "the name matched nothing" from "everything it matched is a file type this
connector does not serve". Narrowing the name, or setting the **record ID** instead,
avoids the problem entirely.

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
| `fullres` / `original`   | The true **master file**, delivered via an Aprimo *download order*. Falls back to the rendered `preview` if the master download fails for **any** reason — a download agreement or processing permission blocking it, or a rate limit. |

When CHILI produces **output**, it requests the `fullres`/`original` tier, so output
uses the original master file — *unless* the fallback fires, in which case the frame
renders from the preview and nothing reports an error. See
[What a 429 does](#what-a-429-does) for why that matters under load.

Rendered previews and master files are delivered as short-lived **signed URLs**.
These are self-authenticating, so the connector deliberately strips the
`Authorization` header when fetching them (via `X-GraFx-Proxy-Exclude-Headers`) —
forwarding it would cause the storage origin to reject a valid signature.

## Metadata fields

`META_DATA_FIELDS` controls which Aprimo field values are exposed as asset metadata.
Fields with no value are omitted.

**Metadata keys are Aprimo field system names**, not display labels — the same names you
write in `META_DATA_FIELDS`.

**Every metadata value reaches Studio as a string.** That is a hard constraint of the
engine, not a choice this connector makes — a number or a boolean would fail to
deserialize. A field holding several values is therefore joined into one string with
`, `, and references such as options and classifications arrive as **readable names**
rather than GUIDs. See [What each field type becomes](#what-each-field-type-becomes).

### When metadata is read

**Pages of results carry no metadata.** Searching and browsing in the media picker return
assets with an empty metadata bag, and the connector does not ask Aprimo for field values
on those requests. Metadata is read only when Studio **resolves a single asset** — an
image variable being set, a render starting — and when it asks for an asset's `detail`.
A single-asset resolve is a query for one value with a page size of one, whether that
value is a record ID or a name set by an action; in the name case the metadata belongs to
the first match, as described under [How search and ID lookup work](#how-search-and-id-lookup-work).

This is a property of the connector, not a delay: a thumbnail in the picker will never
show field values, and nothing you configure changes that. It is also why picker
browsing and searching stay fast no matter how many fields you expose.

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
field is exposed — commonly 30–55 fields *per asset*, and a measured record with a full
field set came to 111 items and ~100 KB. Raw XMP/IPTC blocks and AI-generated summaries
are among the heaviest, and nothing is truncated.

Setting it does more than filter: the connector asks Aprimo to **embed only the listed
fields** in the record it fetches, which cuts the response roughly four-fold. A handful
of fields Aprimo always includes regardless are still dropped by the connector, so the
metadata bag contains exactly what you listed. Left unset, all fields are requested and
exposed, as before.

### Language

`metaDataLanguageId` selects the language in two ways:

- **Field values** are read in that language, falling back to the language-neutral value
  when the field has no entry for it.
- **Option and classification names** are requested from Aprimo in that language. Where a
  name has no label in the chosen language, Aprimo substitutes its internal name.

> When `metaDataLanguageId` is left empty, Aprimo uses the **API service account's default
> language** for option and classification names, while field values fall back to the
> language-neutral value.

The value is normalized exactly like the other two configuration options — dashed GUID,
bare GUID, or a pasted path/URL containing one all work, and anything that is not a GUID
is treated as "not set". That normalization is load-bearing here in a way it is not for
the other two, because the language is used in two places with different tolerances:
field values are matched against the **bare lowercase** GUID Aprimo writes onto each
localized value, while the label request accepts the dashed form too. Pasting a dashed
GUID used to give you option and classification names in the chosen language and field
values in the neutral one; pasting a URL failed the whole asset with an HTTP 400. Both
now normalize to the one form the two agree on.

### What each field type becomes

Below, **`Name`** stands for the field's own system name — the key a designer maps onto a
variable. Some types add a **companion key** carrying the machine-readable side of the
value, so the mappable key can stay human-readable. Every value is a string, and a field
holding several values is joined with `, `.

| Aprimo type | Example in Aprimo | Value under `Name` | Companion key |
|---|---|---|---|
| SingleLineText, MultiLineText | `Autumn hero` | `Autumn hero` | — |
| Numeric | `6142` | `6142` — also maps to a Number variable | — |
| Date | `2026-12-31` | `2026-12-31` — also maps to a Date variable | — |
| Duration | 32.37 seconds | `00:00:32.3686170` — passed through unchanged | — |
| Html | rich text | `<div>Autumn</div>` — markup passed through unchanged | — |
| Json | `{ "k": 1 }` | `{"k":1}` — the raw JSON text, passed through unchanged | — |
| TextList | Green, Black | `Green, Black` | — |
| OptionList | English, French | `English, French` — the option **labels** | `Name.ids` — the option item ids |
| ClassificationList | Benelux, Nordics | `Benelux, Nordics` — the classification **names** | `Name.ids` — the classification ids |
| RecordLink | a linked asset | `4b820ab3…` — the linked **record ids** | — |
| HyperlinkList | a link | `https://…` — the **urls** | `Name.text` — the display texts |
| UserList, UserGroupList | `Becky Lane` | *key absent* | — not exposed, [see below](#user-fields-are-not-exposed) |

Notes on the table:

- **Duration, Html and Json are raw.** The connector does not parse or reformat them —
  a Duration lands on artwork as Aprimo's tick string, and HTML as literal markup.
- **Option and classification labels come from the field definition**, in the language
  described under [Language](#language).
- **`RecordLink` carries record ids on purpose.** A record id is exactly what an image
  variable consumes: set an image variable to one and this connector resolves the bare
  32-character id straight back to that asset.
- **`Name.text` is only present when at least one link has a display text**, and links
  without one contribute a blank slot — the same alignment rule as `Name.ids`, below.

#### The companion-key contract

> **An id is never placed in the field a designer would map.** A GUID will not appear on
> artwork in place of a missing name.

Beyond that, one rule governs every companion key (`Name.ids`, `Name.text`):

- **Same length, always.** `Name` and `Name.ids` have the **same number of slots**. A
  reference that cannot be resolved — a deleted option, a classification the service
  account cannot read, a definition past the eight-definition cap — leaves an **empty
  slot** so the two lists stay aligned. On artwork that shows as a stray separator
  (`, Nordics`), which is deliberate: it signals a broken reference in Aprimo rather than
  hiding it. If **none** of them resolve, `Name` is absent altogether and only `Name.ids`
  is written — never a bare string of separators.
- **Split on the literal comma-space (`", "`).** Ids are GUIDs and can never contain it,
  so the id array is always correct.
- **Avoid commas in option and classification labels you intend to pair.** A label
  containing `", "` splits into two slots, and nothing can tell a real separator from one
  inside a label. This mirrors the existing rule that field names in `META_DATA_FIELDS`
  must not contain commas — [see below](#field-names-with-commas). Escaping is not an
  option here: `Name` is the value a designer prints, so an escape character would render
  on the proof.
- **Check the lengths.** An action pairing the two should confirm both arrays have the
  same length and treat a mismatch as **unpairable** rather than zip them anyway.
- **Escape hatch.** If a tenant cannot rename labels containing commas, a JSON companion
  key holding `[{ "id", "name" }]` pairs is the lossless alternative — a possible future
  addition, **not implemented today**.

Classification names are **leaf names**. If your taxonomy reuses a name across branches (a
`Brochure` under both *AssetType* and *Channel*), the names alone will not distinguish
them — exposing the full classification path as an extra companion key is a possible
future addition.

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

Only Numeric and Date fields map cleanly onto Number and Date variables. Multi-valued
fields, durations, HTML and JSON are text — map them onto a Text variable, or onto a List
variable whose items exactly match the incoming value.

### Field names with commas

The comma is the delimiter, so a field whose system name contains a literal comma
cannot be whitelisted. This is rare — if you hit it, rename the field in Aprimo.
Names containing **spaces** are fully supported.

## Rate limits and output jobs

Aprimo enforces a rate limit **per environment**: roughly **15 requests per second
sustained, with a burst allowance of 100**. That budget is shared with every other
integration talking to the same Aprimo environment — other connectors, scheduled jobs,
in-house scripts. Requests over the limit are not queued; Aprimo rejects them immediately
with HTTP 429.

**What resolving one asset costs:**

| Work | Requests |
|---|---|
| Reading the record and its fields — **by ID** | 1 |
| Reading the record and its fields — **by name** | 2 (one search to find it, then the record read) |
| Each exposed option-list field | 1 each (at most 8 per call) |
| Classification names | 1 per 200 classification ids, batched |

### What a 429 does

When Aprimo answers 429, the connector **waits briefly and retries once**. What happens
if the retry is *also* rejected depends on which call it was, and the two outcomes are
very different:

| Call | On a second 429 |
|---|---|
| **Asset queries** — browse, search, `query`, `detail`, and every metadata lookup behind them | **Fails** with an error naming the rate limit as the cause, so the reason is visible rather than guessed at. |
| **Downloads** of the `fullres` / `original` tier | **Falls back to the rendered preview.** The call *succeeds* and returns image bytes — but they are Aprimo's rendered preview, not the master file. |

That download fallback is the same one described under
[How downloads work](#how-downloads-work): `fullres`/`original` recovers from *any*
failure of the master-file download — a blocking download agreement, a missing processing
permission, **or a rate limit** — by serving the rendered preview instead of throwing.

> ⚠️ **A rate-limited output job can produce rendered previews in place of master files.**
> Output requests the `fullres`/`original` tier, so a 429 on the master download is not
> reported as an error at all: the frame renders, with preview-quality pixels. Under load
> this is silent — there is no preflight error and nothing on the canvas says which frames
> got the fallback. Turn `DEBUG_LOG` on to see the rate-limit lines if you suspect it.

What a *query* failure looks like:

- **In Studio** — the image variable shows *"Unable to load"* and the previously placed
  image stays on the canvas.
- **In output generation** — the record gets a preflight error and the frame shows
  *"Unable to load"*.

> ⚠️ **Output jobs driven by a data source resolve one asset per row.** A job of a few
> hundred rows can exhaust the limit on its own, and is far more likely to on a tenant
> that has other active Aprimo integrations. **Records may fail.**

Mitigations, in order of effect:

1. **Set `META_DATA_FIELDS` narrowly.** Every field you do not expose is work the
   connector never does.
2. **Do not expose option-list or classification fields unless a template actually uses
   them** — these are the only field types that cost extra requests.
3. **Run smaller batches**, so a single job never sits on the whole environment's budget.

Browsing and searching in the media picker add no metadata cost: those pages carry no
metadata, so they ask for no fields and make no lookups. They still spend requests on
thumbnails (two per asset shown), which count against the same budget.

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
