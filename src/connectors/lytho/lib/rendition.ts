import { Media } from '@chili-publish/studio-connectors';

// GraFx expects PNG/JPEG for on-screen (web) display. Assets already in these formats are
// served as their original bytes; any other supported type (EPS/PDF/PSD/TIFF/AI) is served
// as the DAM's rasterized `hrpreview` twin so the canvas can decode it. Matched case-insensitively
// — the DAM stores `extension` as a case-sensitive keyword, so `.JPG`/`.Png` must be lower-cased first.
const WEB_NATIVE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg']);

// Per-intent allowlists of the types CHILI can ingest as raw original bytes. Anything outside an
// intent's set is rerouted to a rendition that intent's pipeline can read. Per CHILI's Media
// Connector docs, `fullres`/`print` takes PNG/JPEG/PDF ("for asset types other than PNG / JPEG /
// PDF one should serve the asset wrapped as a PDF file") and `fullres`/`animation` takes PNG/JPEG
// ("for asset types other than PNG / JPEG" serve it converted). So print reroutes to the DAM's
// on-demand `pdf` rendition; animation reroutes to the rasterized `hrpreview` twin.
//
// AI and PDF are print-native but NOT animation-native. The PDF export engine ingests both
// directly, while the animation renderer fails on their raw bytes, so the two intents keep
// separate sets rather than sharing one list of types to reroute.
//
// An extension in neither set is treated as non-native and rerouted rather than passed through:
// handing CHILI bytes it cannot decode is the failure this routing exists to prevent. That case is
// only reachable for an asset referenced by id in an existing template — query() filters browse to
// SUPPORTED_EXTENSIONS, so one cannot be picked.
//
// Matched case-insensitively: `extension` is stored as a case-sensitive value, so `.EPS` and `.Tif`
// must be lower-cased before lookup.
const PRINT_NATIVE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'pdf', 'ai']);
const ANIMATION_NATIVE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg']);

// Picks the Lytho rendition (`preview`, `hrpreview`, `content` or `pdf`) that
// download() fetches for a download tier and intent. `getExtension` returns
// the asset's lower-cased extension; it is called only for the tiers that
// route by file type, since each call is an extra metadata request.
export async function selectVariant(
  previewType: Media.DownloadType,
  intent: Media.DownloadIntent,
  getExtension: () => Promise<string>
): Promise<string> {
  switch (previewType) {
    case 'thumbnail':
      return 'preview';
    case 'mediumres':
      return 'hrpreview';
    case 'highres': {
      if (intent === 'web') {
        // Loaded into editor frames for on-screen display. GraFx expects a decodable raster
        // (PNG/JPEG) here for every file type — it has no "serve original" carve-out — so web
        // always serves the rasterized twin, no type lookup needed.
        return 'hrpreview';
      }
      // print / animation. The contract asks for a high-quality image, but routing *every* type
      // here would downscale a 4000px JPEG that exports correctly today, so stay type-aware:
      // only the types that intent cannot ingest are rerouted. Same native sets as `fullres`,
      // so a type never changes ingestibility between the two tiers — the tier only changes
      // what the fallback is (`hrpreview` here; `fullres`/print falls back to `pdf`).
      //
      // DEFENSIVE. Studio has not been observed requesting `highres` on any intent — the display
      // path uses `mediumres`/`web`. These branches cost nothing and the contract permits the
      // tier, but the behaviour is unobserved rather than confirmed.
      const ext = await getExtension();
      const nativeExtensions =
        intent === 'print'
          ? PRINT_NATIVE_EXTENSIONS
          : ANIMATION_NATIVE_EXTENSIONS;
      return nativeExtensions.has(ext) ? 'content' : 'hrpreview';
    }
    case 'fullres': {
      // download() isn't handed the file type, so look it up — one extra metadata call per
      // fullres download. Accepted cost; revisit only if this ever proves to be a hot path.
      const ext = await getExtension();
      if (intent === 'web') {
        // Serve PNG/JPEG originals as-is; anything else becomes the rasterized twin so the
        // canvas can decode it.
        return WEB_NATIVE_EXTENSIONS.has(ext) ? 'content' : 'hrpreview';
      }
      if (intent === 'print') {
        // CHILI's PDF export engine ingests only PNG/JPEG/PDF, so PDF and AI pass through as
        // their original bytes. Everything else gets the DAM's on-demand PDF rendition. If
        // conversion fails the DAM degrades to raster server-side and still returns 200 — there
        // is nothing for the connector to retry or detect.
        return PRINT_NATIVE_EXTENSIONS.has(ext) ? 'content' : 'pdf';
      }
      // animation: the contract wants PNG/JPEG, and `hrpreview` is exactly that. Note the
      // narrower native set — PDF and AI pass through on print but not here, because the
      // animation renderer fails on those raw bytes.
      return ANIMATION_NATIVE_EXTENSIONS.has(ext) ? 'content' : 'hrpreview';
    }
    // 'original' → full-resolution original bytes, every intent.
    //
    // Deliberately NOT intent-aware, unlike `highres`/`fullres` above. `original` means the
    // original file; rerouting it to a rendition would make the one tier with an unambiguous
    // contract lie about what it returns.
    //
    // If Studio is ever seen requesting `original` for animation and failing on a PDF, that is
    // a contract question to settle rather than another reroute to add here.
    default:
      return 'content';
  }
}
