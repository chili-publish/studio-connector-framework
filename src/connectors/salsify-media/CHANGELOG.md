# Releases

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
