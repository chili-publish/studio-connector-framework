// ── reference lookups (Aprimo ids → display names) ───────────────────────────
// OptionList, ClassificationList and RecordLink fields store IDS on the record,
// never text: the names live on the field definition (options) or on the
// classification itself. Turning a record's metaData into something a designer
// can read therefore costs extra round-trips, and this module is where they are
// batched: one request per option-list DEFINITION (shared by every record that
// uses it) and one chunked search for ALL classification ids at once.
//
// Nothing here touches the runtime object. The caller passes an `AprimoFetch`
// — the connector's own wrapper, already carrying the base URL, the standard
// headers and the 429 retry — so lib/ stays independent of the sandbox.

import type { Connector } from "@chili-publish/studio-connectors";
import type {
  AprimoClassificationHit,
  AprimoOptionListDefinition,
  Lookups,
  References,
} from "./types";

// How many classification ids go into one `Id IN ?` search. Aprimo accepts far
// more, but a large body is slower to serialize on both ends and the response
// grows with it; 200 keeps a normal record (a handful of ids) to a single
// request while a pathological one still finishes in two or three. The
// request budget this protects is described in the README under "Rate limits
// and output jobs".
export const CLASSIFICATION_CHUNK_SIZE = 200;

// How many option-list DEFINITIONS one metadata resolve may fetch. Each is a
// separate GET, and Aprimo rate-limits at 15 req/s (burst 100) per environment
// — a record with dozens of option-list fields would otherwise spend the budget
// of every other user in the tenant on one detail view. Definitions past the cap
// are skipped, and their fields publish `.ids` only. See the README under
// "Rate limits and output jobs".
export const MAX_OPTION_LIST_DEFINITIONS = 8;

// The connector's Aprimo fetch wrapper, seen from lib/: takes a path relative
// to the API root (so error messages name the path, never the tenant host),
// returns the raw response — it does NOT throw on a non-OK status, so every
// caller here checks `ok` itself.
export type AprimoFetch = (
  path: string,
  init: Connector.ChiliRequestInit
) => Promise<Connector.ChiliResponse>;

// `_debug` from the connector, passed in so lib/ can report without knowing how
// logging is gated.
export type DebugLogger = (label: string, data?: unknown) => void;

// The one place the thrown error is shaped, so a failure from lib/ is
// indistinguishable from one raised in connector.ts (`_failure` delegates here).
export function httpFailure(
  response: Connector.ChiliResponse,
  path: string
): Error {
  const message =
    response.status === 429
      ? `Aprimo rate limit (429) on ${path}`
      : `Aprimo ${response.status} ${response.statusText} on ${path}`;
  return new ConnectorHttpError(response.status, message);
}

// A `languages: <id>` request header makes the server return `labels[]` for
// THAT language only, substituting the item's `name` when the language has no
// label of its own — which is exactly the fallback we want, computed server-
// side. Sent only when a language is configured; without it Aprimo returns
// every language's label and `labels[0]` would be an arbitrary one.
function languageHeaders(langId: string | null): Connector.Dictionary {
  return langId ? { languages: langId } : {};
}

// All items of one OptionList field definition, as `item id → display label`.
// Items disabled in the DAM UI are KEPT: a record can still carry an id that was
// disabled after it was picked, and dropping it would turn a real value back
// into a bare GUID.
export async function fetchOptionListItems(
  fetcher: AprimoFetch,
  defId: string,
  langId: string | null
): Promise<Map<string, string>> {
  const path = `/fielddefinition/${encodeURIComponent(defId)}`;
  const r = await fetcher(path, {
    method: "GET",
    headers: languageHeaders(langId),
  });
  if (!r.ok) throw httpFailure(r, path);
  const definition: AprimoOptionListDefinition = JSON.parse(r.text);
  const map = new Map<string, string>();
  for (const item of definition.items ?? []) {
    if (!item?.id) continue;
    // `labels[0]` is the localized text (see languageHeaders); `label` and
    // `name` are the unlocalized fallbacks Aprimo fills for definitions that
    // were never translated.
    const text = item.labels?.[0]?.value ?? item.label ?? item.name;
    if (text) map.set(item.id, text);
  }
  return map;
}

// Names for a set of classification ids, as `id → name`. Chunked, with every
// chunk in flight at once — a record referencing more than one chunk's worth of
// classifications is already unusual, and serializing them would multiply the
// latency of a detail view.
export async function fetchClassificationsByIds(
  fetcher: AprimoFetch,
  ids: string[],
  langId: string | null
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CLASSIFICATION_CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + CLASSIFICATION_CHUNK_SIZE));
  }

  const responses = await Promise.all(
    chunks.map((chunk) => fetchClassificationChunk(fetcher, chunk, langId))
  );
  for (const hits of responses) {
    for (const hit of hits) {
      if (!hit?.id) continue;
      const text = hit.labels?.[0]?.value ?? hit.name;
      if (text) out.set(hit.id, text);
    }
  }
  return out;
}

async function fetchClassificationChunk(
  fetcher: AprimoFetch,
  ids: string[],
  langId: string | null
): Promise<AprimoClassificationHit[]> {
  const path = "/search/classifications";
  // `parameters` holds ONE argument — the array of ids — so it must be an array
  // INSIDE the parameters array. Passing the ids flat is accepted and silently
  // resolves only the first id, which reads as "most of my classifications
  // don't exist" rather than as an error (verified live).
  const body = JSON.stringify({
    searchExpression: {
      expression: "Id IN ?",
      parameters: [ids],
    },
  });
  const r = await fetcher(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      page: "1",
      pageSize: String(ids.length),
      ...languageHeaders(langId),
    },
    body,
  });
  if (!r.ok) throw httpFailure(r, path);
  const data = JSON.parse(r.text);
  return (data.items ?? []) as AprimoClassificationHit[];
}

// Resolve every id a record refers to, in as few round-trips as possible.
// All lookups run concurrently and a single failure rejects the whole call:
// metadata is either complete or the call fails loudly — half a bag, with some
// fields silently showing ids and others names, is harder to diagnose than an
// error.
export async function resolveReferences(
  fetcher: AprimoFetch,
  refs: References,
  langId: string | null,
  debug: DebugLogger
): Promise<Lookups> {
  const defIds = Array.from(refs.optionListDefIds);
  const wanted = defIds.slice(0, MAX_OPTION_LIST_DEFINITIONS);
  const skipped = defIds.slice(MAX_OPTION_LIST_DEFINITIONS);
  if (skipped.length > 0) {
    debug("metadata.optionListCap", {
      cap: MAX_OPTION_LIST_DEFINITIONS,
      skipped,
    });
  }

  const [optionEntries, classifications] = await Promise.all([
    Promise.all(
      wanted.map(
        async (defId): Promise<[string, Map<string, string>]> => [
          defId,
          await fetchOptionListItems(fetcher, defId, langId),
        ]
      )
    ),
    fetchClassificationsByIds(fetcher, Array.from(refs.classificationIds), langId),
  ]);

  return { optionItems: new Map(optionEntries), classifications };
}
