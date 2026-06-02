# Changelog

## 1.0.0

- Initial Contentful data connector (read-only, Content Delivery API).
- Per-template `contentType` / `locale` / `columnsOverride`; admin runtime options
  for base host, space, environment and image width.
- Schema discovery via `GET /content_types/{id}`; offset pagination via `skip`/`limit`.
- Server-side filtering (`fields.x` / `[match]`) and sorting (`order=`).
- Linked assets resolved to absolute `images.ctfassets.net` URLs (optional `?w=`);
  rich text, arrays, locations and objects flattened to scalars.
- `staticKey` Bearer delivery-token auth.
