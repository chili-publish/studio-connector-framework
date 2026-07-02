# Salsify media connector

Visualize **Salsify PXM digital assets** (images) in CHILI Studio. It pairs with the Salsify
**data** connector: a product record exposes an image asset id (the data connector's `image:id`
column, or a named image attribute like `Style Image`), that id is bound to an image variable on
this media connector, and the connector resolves it to the actual image.

Targets **Salsify PXM** (`developers.salsify.com`), not SupplierXM.

## How it works

Salsify stores images as digital assets. Each asset has a **public** Cloudinary URL
(`salsify:url`, e.g. `https://images.salsify.com/image/upload/<hash>.jpg`) plus width/height/format.

- **`download(id, previewType, intent)`** — `GET /orgs/{org}/digital_assets/{id}` to resolve the
  asset's `salsify:url`, then fetch the bytes. For image assets it inserts a Cloudinary size
  transform per `previewType` so Studio gets a right-sized rendition:

  | previewType | Transform | Result |
  | --- | --- | --- |
  | `thumbnail` | `w_240` | 240px-wide |
  | `mediumres` | `w_800` | 800px-wide |
  | `highres` | `w_1600` | 1600px-wide |
  | `fullres` / `original` | *(none)* | full-size original |

  Non-image assets are served untouched.
- **`detail(id)`** — `GET /digital_assets/{id}` → name, extension, width, height.
- **`query(options)`** — `GET /digital_assets?per_page&cursor&filter` (same `meta.cursor`
  pagination as records) so Studio can show an asset picker.

Because `salsify:url` is public, only the id→url resolution and browsing need the API token; the
image bytes are fetched from the public CDN.

## Configuration

### Publish-time runtime options

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `SALSIFY_ORG_ID` | yes | — | The Salsify org id (same value as the data connector). |
| `logTiming` | no | `"false"` | Log per-method / per-fetch timings via `runtime.logError`. |

### Per-variable configuration

| Field | Required | Description |
| --- | --- | --- |
| `assetFilter` | no | Raw Salsify filter expression to limit the browsable asset list, e.g. `='salsify:format':'jpg'`. |

### Authentication

`supportedAuth: ["staticKey"]` — the same personal API token as the data connector, as an
`Authorization: Bearer <token>` header (the framework injects the literal header key/value, so the
auth-data file includes the `Bearer ` prefix). The public CDN fetch ignores the header.

```sh
# reuse the data connector's auth file, or copy it
{ "key": "Authorization", "value": "Bearer <your-personal-api-token>" }
```

### Proxy allowed domains (publish)

Both hosts must be allowed — the API host for id resolution and the CDN host for the bytes:

```sh
--proxyOption.allowedDomains "app.salsify.com" "images.salsify.com"
```

## Integration with the data connector

```
data connector row → image:id (asset id)
        │
        ▼
image variable bound to "Salsify Media" → download(id) → resolve → resize → bytes → rendered
```

Any column holding a Salsify asset id works — the derived `image:id`/`image:ids`, or a named image
attribute (`Style Image`, `CloseUp Image`) once the data connector surfaces it cleanly (v1.1.0).

## Known limitations / notes

- **Two proxy hops per download** (id→url resolve, then CDN fetch). If proxy latency becomes a
  problem, a future version can key downloads by a composite id embedding the URL+dimensions
  (Acquia pattern) so `download` skips the resolve — the data connector already has those fields.
- **Images only for v1.** Non-image assets (PDF/video) are served as their original URL without a
  transform; renditions/thumbnails for those aren't handled.
