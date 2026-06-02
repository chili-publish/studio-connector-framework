# Contentful Data Connector

Read-only data connector for the [Contentful Content Delivery API (CDA)](https://www.contentful.com/developers/docs/references/content-delivery-api/).
Surfaces entries of a chosen content type as bindable rows in CHILI GraFx Studio,
and resolves linked assets to public image URLs.

## How it works

- The **admin** configures the Contentful space, environment and base host once
  per environment (runtime options) plus the delivery token (auth slots).
- The **template designer** picks a `contentType` (and optionally a `locale`) per
  binding. Clicking **Create variables** calls `getModel`, which reads
  `GET /content_types/{id}` and maps each field to a Studio column type.
- At render, `getPage` reads `GET /entries?content_type=…&skip=…&limit=…&include=1`,
  flattens every field to a scalar, and resolves linked assets to
  `https://images.ctfassets.net/...` URLs.

### Field flattening

A Studio row value must be `string | number | boolean | Date | null`, so:

| Contentful field | Column type | Flattening |
| --- | --- | --- |
| Symbol | singleLine | direct |
| Text / RichText | multiLine | RichText → plain text |
| Integer / Number | number | direct |
| Boolean | boolean | direct |
| Date | date | ISO string |
| Link → Asset | singleLine | resolved `images.ctfassets.net` URL (with `?w=` if `IMAGE_WIDTH` set) |
| Link → Entry | singleLine | linked entry `sys.id` |
| Array | singleLine | items flattened and joined with `, ` |
| Location / Object | singleLine | `lat,lon` / compact JSON |

Two system columns are always added: `sys.createdAt`, `sys.updatedAt`. Each row's
unique id (`__id__`) is the entry's `sys.id`.

## Images in templates (POC pairing)

A data connector cannot back an image frame directly. For the POC, pair this with
a **URL media connector** instance scoped to `*.ctfassets.net`: emit the asset URL
column here, then wire the URL connector's `url` browse option to that data
variable on the image frame. Set `IMAGE_WIDTH` to bake a width transform into the
emitted URLs (e.g. `1000`).

## Runtime options (admin)

| Option | Required | Default | Notes |
| --- | --- | --- | --- |
| `CONTENTFUL_BASE_URL` | no | `https://cdn.contentful.com` | Use `https://cdn.eu.contentful.com` for EU data residency |
| `CONTENTFUL_SPACE_ID` | **yes** | — | Contentful space id |
| `CONTENTFUL_ENVIRONMENT` | no | `master` | Environment id |
| `IMAGE_WIDTH` | no | — | If a positive integer, appended as `?w=` to asset URLs |
| `logEnabled` | no | — | `true` to log outgoing requests via `logError` |

## Per-template configuration (designer)

| Field | Notes |
| --- | --- |
| `contentType` | **Required.** API identifier of the content type (e.g. `product`). |
| `locale` | Optional locale code (e.g. `en-US`). Leave blank for the space default. `*` is rejected — multi-locale responses cannot be flattened to scalars. |
| `columnsOverride` | Optional JSON array `[{"name","type"}]` to bypass schema discovery. |

## Auth

CDA delivery token via the framework's `staticKey` slot. The connector never sets
the Authorization header itself. Configure **both** slots:

```sh
# ~/.chili/contentful-auth.json  →  { "key": "Authorization", "value": "Bearer <delivery-token>" }
yarn connector-cli set-auth -au browser -at staticKey --auth-data-file ~/.chili/contentful-auth.json ...
yarn connector-cli set-auth -au server  -at staticKey --auth-data-file ~/.chili/contentful-auth.json ...
```

> A delivery token is read-only and environment-scoped. Keep it out of git.

## Capabilities

`filtering` (CDA `fields.x=` / `[match]`), `sorting` (CDA `order=`), `model`,
`dataSourceVariable`. Pagination is offset-based (`skip`/`limit`), reported via
`continuationToken` = next `skip`.

## Allowed domains (publish)

```
--proxyOption.allowedDomains "cdn.contentful.com"
# add "cdn.eu.contentful.com" for EU residency
```

## Build & test

```sh
yarn build
yarn test
```
