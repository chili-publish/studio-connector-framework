# Releases

# 1.1.2

- [NO-TICKET] Crash-hardening pass (mirrors data connector v1.1.3):
  - **`nextPage` forward-progress guard** — never return a cursor from an empty page or one
    identical to the request's `pageToken`, so the asset picker can't page forever.
  - **Validated, bounded asset cache** — only plain-object assets with a real `salsify:url` are
    cached (an empty/garbage response stays retryable instead of poisoning the id for the
    session); FIFO-capped at 500 entries; non-object single-asset responses throw a clear error.
  - **401 retry once per instance** — same guard as the data connector.

# 1.1.1

- [NO-TICKET] Robust id handling. Binding an image variable to a raw named image attribute (a
  localised, multi-value field like `{"en-US":["hash1","hash2"]}`) previously 404'd because the
  whole JSON string was used as the asset id. `download`/`detail` now normalise the id — unwrapping
  localised objects, arrays, and pipe-joined `image:ids` down to the first asset id — before
  resolving. Binding `image:id` / `image:url` remains the recommended clean path.

# 1.1.0

- [NO-TICKET] Faster previews. (1) **One-hop downloads:** `download`/`detail` accept an id that is
  already a public Salsify CDN URL (bind the data connector's `image:url` column) and skip the
  id→url resolve call — one proxy round-trip instead of two. Asset-hash ids (from the browser)
  still resolve. (2) **Resolve caching:** id→asset lookups are cached per connector instance, and
  `query` warms the cache. (3) **Smaller renditions:** transforms now use `c_limit` (never upscale
  — bare `w_1600` inflated an 800px asset to 441KB) + `q_auto` (recompress); e.g. thumbnail is
  `c_limit,w_240,q_auto`. fullres/original remain untouched.

# 1.0.0

- [NO-TICKET] Initial version — visualize Salsify PXM digital assets in CHILI Studio. `download`
  resolves a Salsify asset id to its public Cloudinary URL and streams the bytes, requesting a
  size-appropriate rendition per preview type (thumbnail/medium/high via on-the-fly Cloudinary
  transforms; full/original untouched). `query`/`detail` browse the `/digital_assets` endpoint
  (same `meta.cursor` pagination as the data connector). Optional `logTiming` diagnostics.
