import { Connector, Media } from "@chili-publish/studio-connectors";
import {
  buildMetaData,
  collectReferences,
  parseFieldWhitelist,
  selectFields,
} from "./lib/metadata";
import {
  CLASSIFICATION_CHUNK_SIZE,
  MAX_OPTION_LIST_DEFINITIONS,
  httpFailure,
  resolveReferences,
} from "./lib/lookups";
import type { AprimoFieldItem, References } from "./lib/types";

declare function sleep(ms: number): Promise<void>;

export default class AprimoConnector implements Media.MediaConnector {
  private runtime: Connector.ConnectorRuntimeContext;

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private _api(): string {
    // BASE_URL is required — it names the Aprimo DAM tenant this connector
    // talks to (e.g. "https://acme.dam.aprimo.com"). There is deliberately no
    // default: a baked-in tenant would silently misroute every deployment that
    // forgot to set it, so fail loudly instead.
    const base = this.runtime.options["BASE_URL"] as string;
    if (!base) {
      throw new ConnectorHttpError(500, "BASE_URL option is required (e.g. https://<tenant>.dam.aprimo.com)");
    }
    return base.replace(/\/$/, "") + "/api/core";
  }

  private _headers(extra: Connector.Dictionary = {}): Connector.Dictionary {
    return { Accept: "application/hal+json", "API-VERSION": "1", ...extra };
  }

  // The single door to the Aprimo API host: it resolves the base URL, applies
  // the standard headers, and handles the one transport concern every call
  // shares — the rate limit. Aprimo allows 15 req/s with a burst of 100 PER
  // ENVIRONMENT (not per connector), and answers 429 immediately instead of
  // queueing, so a busy tenant can reject a call this connector had no way to
  // pace. One retry after a short wait turns that into a slow call rather than
  // a failed one; a second 429 is a genuinely saturated environment and is
  // surfaced to the caller. `path` may be a path relative to the API root or an
  // absolute URL (Aprimo's `_links.next` hands back absolute ones).
  //
  // NOT for the signed delivery URLs — those are a different origin, must NOT
  // carry our headers, and are fetched directly (see _SIGNED_URL_HEADERS).
  private async _aprimoFetch(
    path: string,
    init: Connector.ChiliRequestInit
  ): Promise<Connector.ChiliResponse> {
    const url = /^https?:\/\//i.test(path) ? path : this._api() + path;
    const send = () =>
      this.runtime.fetch(url, {
        ...init,
        headers: this._headers(init.headers ?? {}),
        referrer: "aprimo-connector",
      });
    const r = await send();
    if (r.status !== 429) return r;
    this._debug("fetch.rateLimited", { path, retryInMs: 700 });
    await sleep(700);
    return send();
  }

  // Every Aprimo HTTP failure is reported the same way — the status, and the
  // path that produced it, so a stack-less sandbox error still says which call
  // broke. The message is built in lib/lookups.ts so that failures raised there
  // (during metadata resolution) are indistinguishable from these.
  private _failure(response: Connector.ChiliResponse, path: string): Error {
    return httpFailure(response, path);
  }

  // ── DEBUG logging ────────────────────────────────────────────────────────────
  // `runtime.logError` is the ONLY logging sink in the sandbox — there is no
  // `console.log` (a bare console.log/fetch is undefined or unproxied here).
  // Despite the name it logs at Information level server-side, and on WEB it
  // writes to the END USER's browser DevTools console — so gate it on the
  // `DEBUG_LOG` runtime option (toggle OFF for production) and never log tokens
  // or raw request bodies. `data` is JSON-stringified onto a single line.
  private _debug(label: string, data?: unknown): void {
    const opt = this.runtime.options["DEBUG_LOG"];
    if (!(opt === true || String(opt).toLowerCase() === "true")) return;
    const suffix = data === undefined ? "" : " " + JSON.stringify(data);
    this.runtime.logError(`[aprimo] ${label}${suffix}`);
  }

  // A signed delivery URL (Aprimo previews origin or the Azure blob origin) is
  // self-authenticating via its `sig=…` query — it must be fetched WITHOUT our
  // Authorization header, or the origin rejects it 403 (BUG-20260601). The GraFx
  // proxy adds Authorization to every proxied request by default; the
  // `X-GraFx-Proxy-Exclude-Headers` header tells the proxy which headers to strip
  // before it hits the wire, so we exclude Authorization on these fetches.
  private static readonly _SIGNED_URL_HEADERS: Connector.Dictionary = {
    "X-GraFx-Proxy-Exclude-Headers": "Authorization",
  };

  // Every file type this connector can serve, mapped from each accepted (case-
  // insensitive) name to its canonical key. Dual names collapse to ONE key, so
  // "JPG"/"JPEG" are the same type (jpg) and "TIF"/"TIFF" are the same (tif).
  private static readonly _FILE_TYPE_ALIASES: Record<string, string> = {
    jpg: "jpg",
    jpeg: "jpg",
    png: "png",
    pdf: "pdf",
    tif: "tif",
    tiff: "tif",
  };
  private static readonly _ALL_FILE_TYPES = ["jpg", "png", "pdf", "tif"];

  // `SUPPORTED_FILE_TYPES` runtime option: a comma-separated, case-insensitive
  // list of file types to serve — JPG/JPEG, PNG, PDF, TIF/TIFF. Dual names
  // collapse to one canonical type (JPG/JPEG → jpg, TIF/TIFF → tif), so listing
  // both is harmless. Unrecognised entries are ignored. Empty / unset (or a list
  // with no recognised entries) → all four types are allowed.
  private _supportedTypes(): Set<string> {
    const raw = this.runtime.options["SUPPORTED_FILE_TYPES"];
    const tokens =
      raw == null ? [] : String(raw).split(",").map((s) => s.trim()).filter((s) => s !== "");
    const set = new Set<string>();
    for (const t of tokens) {
      const canon = AprimoConnector._FILE_TYPE_ALIASES[t.toLowerCase()];
      if (canon) set.add(canon);
      else this._debug("supportedTypes.unknown", { value: t });
    }
    if (set.size === 0) return new Set(AprimoConnector._ALL_FILE_TYPES);
    return set;
  }

  private _allowed(ext: string): boolean {
    if (!ext) return false; // no recognisable extension — can't serve it
    const canon = AprimoConnector._FILE_TYPE_ALIASES[ext.toLowerCase()];
    return canon != null && this._supportedTypes().has(canon);
  }

  // Aprimo classification/record IDs are 32-char hex GUIDs. The engine feeds a
  // folder's relativePath back as `collection`, but mangles it (leading slash +
  // appended folder name, e.g. "/576ee5bf…DAM"), so recover the GUID by pulling
  // the last hex match out of whatever comes back.
  private _classificationIdFromCollection(collection: string): string | null {
    const matches = collection.match(/[0-9a-f]{32}/gi);
    return matches && matches.length > 0 ? matches[matches.length - 1] : null;
  }

  // The designer-configured classification (a 32-char hex GUID) that scopes the
  // whole connector. Delivered per-call in `context` under the `classificationId`
  // key declared in getConfigurationOptions(). The Aprimo UI shows dashed GUIDs
  // (8-4-4-4-12, e.g. "576ee5bf-24db-4830-8cbf-abc201167e3d") while the API uses
  // the bare 32-char hex form, so strip dashes before running it through the same
  // GUID extractor as `collection`. That way a pasted dashed GUID, bare GUID, or
  // path/URL all yield the bare GUID; a non-GUID value (or empty) yields null →
  // unscoped, the original behaviour.
  private _configuredClassificationId(context: Connector.Dictionary): string | null {
    const raw = context["classificationId"];
    if (raw == null) return null;
    const s = String(raw).trim().replace(/-/g, "");
    return s ? this._classificationIdFromCollection(s) : null;
  }

  // The designer-configured collection (a 32-char hex GUID). Like
  // `classificationId` it scopes the whole connector, but it ANDs on as a record
  // *membership* filter rather than a folder axis: it narrows records to that
  // collection and is never escaped by folder navigation (so drilling into a
  // classification folder narrows further WITHIN the collection, never out of
  // it). Delivered per-call in `context` under the `collectionId` key declared
  // in getConfigurationOptions(). Normalized exactly like the classification id
  // (the GUID extractor is collection-agnostic — it just pulls the last 32-hex
  // run), so a dashed GUID, bare GUID, or pasted path/URL all yield the bare
  // GUID; a non-GUID value (or empty) yields null → not filtered by collection.
  private _configuredCollectionId(context: Connector.Dictionary): string | null {
    const raw = context["collectionId"];
    if (raw == null) return null;
    const s = String(raw).trim().replace(/-/g, "");
    return s ? this._classificationIdFromCollection(s) : null;
  }

  // Map one Aprimo record to a Media row. `metaData` is passed IN rather than
  // built here: filling it costs extra round-trips (see _resolveMetaData), and
  // only the calls Studio actually reads metadata from pay for it. Everything
  // else gets the empty bag.
  private _toMedia(
    record: any,
    context: Connector.Dictionary,
    metaData: Connector.Dictionary = {}
  ): Media.Media | null {
    if (!record?.id) return null;
    const title =
      typeof record.title === "string"
        ? record.title
        : (record.title?.value ?? record.id);
    const mf =
      record._embedded?.masterfilelatestversion ??
      record._embedded?.masterfileversion ??
      record.masterfilelatestversion;
    const ext = (mf?.fileExtension ?? mf?.extension ?? mf?.Extension ?? "").toLowerCase();
    if (!this._allowed(ext)) return null;
    const clsList: any[] =
      record._embedded?.classifications?.items ??
      record.classifications ??
      [];
    const path =
      clsList.length > 0 ? (clsList[0].namePath ?? clsList[0].id ?? "/") : "/";
    return {
      id: record.id,
      name: title,
      relativePath: path,
      type: 0,
      metaData,
      extension: ext || undefined,
    };
  }

  // ── metaData mapping (Aprimo fields → CHILI metaData) ───────────────────────
  // The mapping itself lives in lib/metadata.ts (pure, no runtime) and the id →
  // name lookups it needs in lib/lookups.ts. What stays here is the part that
  // needs the runtime: reading the options, making the HTTP calls, and deciding
  // WHICH calls are worth paying for (see _isSingleAssetResolve).

  // `META_DATA_FIELDS` runtime option: a comma-separated list of Aprimo field
  // names to expose, e.g. "Campaign Name, Spider Chart Count". See
  // parseFieldWhitelist for the exact parsing rules. Empty / unset means expose
  // ALL fields that have a value.
  private _metaDataFieldWhitelist(): string[] {
    return parseFieldWhitelist(this.runtime.options["META_DATA_FIELDS"]);
  }

  // `metaDataLanguageId` configuration option: the Aprimo language GUID to read
  // field values for, delivered per-call in `context` (see
  // getConfigurationOptions). Empty / null → read the neutral value directly.
  private _metaDataLanguageId(context: Connector.Dictionary): string | null {
    const raw = context["metaDataLanguageId"];
    const s = raw == null ? "" : String(raw).trim();
    return s ? s : null;
  }

  // Build the metaData bag for each of `records`, resolving every id they refer
  // to in ONE batch: the records of a single call share option-list definitions
  // and classifications, so collecting the references across all of them first
  // collapses what would be N × (definitions + classifications) requests into
  // one round of lookups.
  //
  // Records whose fields were never requested (no `fields` in `Select-Record`)
  // simply produce empty bags, so this is safe to call on any record list.
  private async _resolveMetaData(
    records: any[],
    context: Connector.Dictionary
  ): Promise<Connector.Dictionary[]> {
    const fieldsPerRecord: AprimoFieldItem[][] = records.map(
      (r) => r?._embedded?.fields?.items ?? []
    );
    if (fieldsPerRecord.every((items) => items.length === 0)) {
      return records.map(() => ({}));
    }

    const started = Date.now();
    const whitelist = this._metaDataFieldWhitelist();
    const langId = this._metaDataLanguageId(context);

    const refs: References = {
      optionListDefIds: new Set<string>(),
      classificationIds: new Set<string>(),
    };
    let fieldsKept = 0;
    for (const items of fieldsPerRecord) {
      fieldsKept += selectFields(items, whitelist).length;
      const found = collectReferences(items, whitelist, langId);
      found.optionListDefIds.forEach((id) => refs.optionListDefIds.add(id));
      found.classificationIds.forEach((id) => refs.classificationIds.add(id));
    }

    const lookups = await resolveReferences(
      (path, init) => this._aprimoFetch(path, init),
      refs,
      langId,
      (label, data) => this._debug(label, data)
    );
    const bags = fieldsPerRecord.map((items) =>
      buildMetaData(items, lookups, langId, whitelist)
    );

    const defs = refs.optionListDefIds.size;
    const classificationIds = refs.classificationIds.size;
    let optionItems = 0;
    lookups.optionItems.forEach((m) => {
      optionItems += m.size;
    });
    this._debug("metadata.resolve", {
      records: records.length,
      fieldsKept,
      optionListDefsFetched: Math.min(defs, MAX_OPTION_LIST_DEFINITIONS),
      optionListDefsSkipped: Math.max(0, defs - MAX_OPTION_LIST_DEFINITIONS),
      optionItemsResolved: optionItems,
      classificationIds,
      classificationChunks: Math.ceil(
        classificationIds / CLASSIFICATION_CHUNK_SIZE
      ),
      classificationsResolved: lookups.classifications.size,
      classificationsMissing:
        classificationIds - lookups.classifications.size,
      keys: bags.reduce((n, bag) => n + Object.keys(bag).length, 0),
      ms: Date.now() - started,
    });
    return bags;
  }

  // `Select-Record` / `select-record-fields` headers for a call that DOES want
  // metadata. `select-record-fields` narrows the embedded fields server-side,
  // which keeps a record with a hundred fields from being serialized in full for
  // the sake of three; the client-side whitelist stays authoritative because the
  // server still throws in a few fields of its own.
  private _fieldSelectHeaders(): Connector.Dictionary {
    const headers: Connector.Dictionary = {
      "Select-Record": "title,masterfilelatestversion,classifications,fields",
    };
    const whitelist = this._metaDataFieldWhitelist();
    if (whitelist.length > 0) {
      headers["select-record-fields"] = whitelist.join(",");
    }
    return headers;
  }

  // Is this `query()` call the engine resolving ONE known asset, rather than a
  // user browsing or searching? That is the only shape metadata is worth
  // fetching for: Studio never reads `metaData` off a picker page — it reads it
  // when it resolves an image variable's stored value, and from `detail`.
  //
  // The engine's reverse metadata mapping issues that resolve as a single filter
  // value with `pageSize: 1` and no `collection`. The value is whatever the
  // variable stores, which is USUALLY the record GUID but is the asset NAME when
  // an action set it — so the GUID test cannot be the discriminator, only the
  // branch taken afterwards. (The Keepeek connector applies the same rule.)
  private _isSingleAssetResolve(options: Connector.QueryOptions): boolean {
    return (
      !options.collection &&
      options.filter?.length === 1 &&
      (options.pageSize ?? 15) === 1
    );
  }

  // ── private API calls ──────────────────────────────────────────────────────

  // Page size for classification listings. Aprimo defaults to 50 and caps each
  // response with a `_links.next`; we request a large page so a normal tree
  // comes back in one round-trip, and still follow `next` as a safety net for
  // tenants whose tree exceeds it.
  private static readonly _CLASSIFICATION_PAGE_SIZE = 1000;

  // Upper bound on Aprimo page fetches per `query()` call (see the page-fill loop
  // in `_searchRecords`). Bounds worst-case latency on tenants where a long run
  // of records are unsupported file types: rather than scan the whole library in
  // one call, we yield after this many pages with a non-empty `nextPage` so the
  // engine can resume. Each fetch is ~`pageSize` records, so 6 ≈ 90 records/call.
  private static readonly _MAX_FILL_FETCHES = 6;

  // GET one record WITH its fields, for the two calls Studio actually reads
  // `metaData` from: the single-asset resolve in `query()`, and `detail()`.
  private async _fetchRecordWithFields(id: string): Promise<any> {
    const path = `/record/${encodeURIComponent(id)}`;
    const r = await this._aprimoFetch(path, {
      method: "GET",
      headers: this._fieldSelectHeaders(),
    });
    if (!r.ok) throw this._failure(r, path);
    return JSON.parse(r.text);
  }

  private async _getClassifications(parentId: string | null): Promise<Media.Media[]> {
    // Two different endpoints with different shapes:
    //  • root       → GET /classifications?filter=Parent = ''
    //                 → the ROOT classifications only, filtered server-side.
    //                 Comparing `Parent` to the empty string is the form Aprimo
    //                 accepts; the result was verified id-for-id against a full
    //                 unfiltered listing. Without the filter this endpoint
    //                 returns the WHOLE tree flattened — a couple of hundred
    //                 nodes on a typical tenant, every one of them shown as a
    //                 top-level folder instead of the handful the Aprimo DAM
    //                 browser shows. (`isRoot` is not a searchable field, and the
    //                 `IS EMPTY` / `IS NULL` forms return 200 with zero hits;
    //                 only the `= ''` comparison selects the roots.)
    //  • drill-down → GET /classification/{id} + `Select-Classification: children`
    //                 → only that node's DIRECT children, already scoped, no filter.
    const pageSize = AprimoConnector._CLASSIFICATION_PAGE_SIZE;
    let path: string | null = parentId
      ? `/classification/${encodeURIComponent(parentId)}?pagesize=${pageSize}`
      : `/classifications?filter=${encodeURIComponent("Parent = ''")}&pagesize=${pageSize}`;
    const headers: Connector.Dictionary = parentId
      ? { "Select-Classification": "children" }
      : {};

    const raw: any[] = [];
    // Follow `_links.next` so a tree wider than one page is never silently
    // truncated. Bounded by a page cap as a runaway guard.
    let pages = 0;
    for (; path && pages < 50; pages++) {
      const r = await this._aprimoFetch(path, { method: "GET", headers });
      // A folder listing that half-succeeded would look to the designer like a
      // classification that no longer exists, so fail loudly instead.
      if (!r.ok) throw this._failure(r, path);
      const data = JSON.parse(r.text);
      const items: any[] = parentId
        ? (data._embedded?.children?.items ?? [])
        : (data.items ?? data._embedded?.items ?? []);
      raw.push(...items);
      const next = data._links?.next?.href;
      path = typeof next === "string" && next ? next : null;
    }
    if (path) {
      this._debug("getClassifications.pageCap", {
        parentId,
        pages,
        fetched: raw.length,
        note: "stopped following _links.next at the 50-page guard; some classifications are not listed",
      });
    }

    // `isRoot` is no longer the filter — the server does that now — but it stays
    // as a cheap assertion on the filter's meaning. Anything that comes back
    // without it is logged and dropped rather than rendered as a bogus
    // top-level folder.
    const filtered = parentId
      ? raw
      : raw.filter((c) => {
          if (c?.isRoot === true) return true;
          this._debug("getClassifications.notRoot", { id: c?.id, name: c?.name });
          return false;
        });
    this._debug("getClassifications", {
      parentId,
      fetched: raw.length,
      roots: parentId ? undefined : filtered.length,
    });

    return filtered.map(
      (c: any): Media.Media => ({
        id: c.id,
        name: c.name ?? c.id,
        relativePath: c.id,
        type: 1,
        metaData: {},
        extension: "",
      })
    );
  }

  // `withFields` asks the search to bring each record's fields back so the
  // caller can build metaData from them (see _isSingleAssetResolve) — the raw
  // records are returned alongside the mapped Media for exactly that. Browse and
  // search pages leave it off and pay nothing.
  private async _searchRecords(
    classificationId: string | null,
    keyword: string,
    page: number,
    pageSize: number,
    context: Connector.Dictionary,
    withFields: boolean = false
  ): Promise<{ items: Media.Media[]; records: any[]; nextPage: string }> {
    // No keyword and no classification → nothing to scope a record search to.
    // Root browse shows the classification folders only (mirroring Aprimo's
    // own Browse); records appear once a classification is selected or a
    // keyword is typed. (Avoids a bogus match-all: `contentType` is shorthand
    // for `Contenttype.Label`, so `contentType = 'Asset'` would match only the
    // "Asset"-labelled content type, not Image/Document assets.)
    // A configured collection is a third thing we can scope to (besides a
    // keyword or classification), so it counts toward "is there anything to
    // search for" — collection-only browse must NOT short-circuit to empty.
    const collectionId = this._configuredCollectionId(context);
    if (!keyword && !classificationId && !collectionId) {
      this._debug("searchRecords.skip", { reason: "no keyword, classification, or collection" });
      return { items: [], records: [], nextPage: "" };
    }
    // The classification filter (when scoped) is ANDed onto whichever keyword
    // expression we run. `Classification` is a nested complex property — filter
    // by its `Id`; the flat `Classifications` field does not exist in search.
    // The collection filter (when scoped) ANDs on the same way, but via the
    // `Collection(?)` search FUNCTION, not a property: `Collection.Id` /
    // `Collections` are not searchable fields — membership is expressed as
    // `Collection(<id>)` (verified live). It resolves true
    // membership for BOTH static (manually curated) and dynamic collections.
    // When both scopes are set the record must be in both (AND = intersection).
    // All clauses are joined with AND (associative → no parentheses needed).
    const clsClause = classificationId ? "Classification.Id = ?" : null;
    const clsParams = classificationId ? [classificationId] : [];
    const collClause = collectionId ? "Collection(?)" : null;
    const collParams = collectionId ? [collectionId] : [];
    const compose = (
      keywordParts: string[],
      keywordParams: string[]
    ): { expression: string; parameters: string[] } => ({
      expression: [
        ...keywordParts,
        ...(clsClause ? [clsClause] : []),
        ...(collClause ? [collClause] : []),
      ].join(" AND "),
      parameters: [...keywordParams, ...clsParams, ...collParams],
    });

    // Attempt 1 — PHRASE: the whole keyword as ONE full-text `?` parameter.
    // Aprimo matches a multi-word `?` parameter as an exact adjacent phrase, so
    // a genuinely multi-word asset name ("Aprimo Space") stays precise — it is
    // NOT broadened into "any record mentioning both words".
    const phrase = compose(keyword ? ["?"] : [], keyword ? [keyword] : []);
    let expression = phrase.expression;
    let parameters = phrase.parameters;
    let first = await this._runRecordSearch(expression, parameters, page, pageSize, context, withFields);

    // Attempt 2 — TOKEN-AND fallback: only when the precise phrase found NOTHING
    // and the keyword is multi-word. Re-run each whitespace token as its own
    // prefix-matched `?`, ANDed together. This catches partial / reordered /
    // non-adjacent multi-word searches ("chill logo" → "chillchips logo") that
    // the phrase misses, while never widening a query the phrase already
    // satisfied. `totalCount` is page-independent, so this decision is stable
    // across pages — the chosen strategy holds for every Aprimo page we fetch in
    // the fill loop below, and on later `query()` calls (page 2, 3, …).
    // (It cannot rescue a typo like "chilichips" vs "chillchips"; Aprimo
    // full-text has no substring or fuzzy matching.)
    const tokens = keyword.trim().split(/\s+/).filter(Boolean);
    if (first.total === 0 && tokens.length > 1) {
      this._debug("searchRecords.fallback", { tokens });
      const tokenAnd = compose(tokens.map(() => "?"), tokens);
      expression = tokenAnd.expression;
      parameters = tokenAnd.parameters;
      first = await this._runRecordSearch(expression, parameters, page, pageSize, context, withFields);
    }

    // PAGE-FILL: `_runRecordSearch` already drops unsupported types client-side
    // (Aprimo can't filter by file type server-side — there is no searchable
    // extension field), so a single Aprimo page can shrink to a handful of
    // allowed items, or zero. Rather than hand the engine a tiny/empty page, we
    // pull consecutive Aprimo pages until we've accumulated at least `pageSize`
    // allowed items (or run out, or hit the per-call fetch cap).
    //
    // The connector is STATELESS — the only thing carried to the next `query()`
    // is the `nextPage` token, which can name an Aprimo *page number* but cannot
    // resume mid-page. So we only ever stop on a whole-page boundary and return
    // ALL accumulated items (even if slightly over `pageSize`); the engine
    // tolerates a page larger or smaller than requested. `nextPage` is simply
    // the next unconsumed Aprimo page (empty only when Aprimo is exhausted), so
    // a follow-up call resumes exactly where we stopped — no skips, no dupes.
    const total = first.total;
    const totalPages = Math.ceil(total / pageSize);
    const items: Media.Media[] = [...first.items];
    // Index-aligned with `items`: records[i] is the Aprimo record that produced
    // items[i], so metaData can be attached back onto the right row.
    const records: any[] = [...first.records];
    let lastFetched = page;
    let fetches = 1;
    while (
      items.length < pageSize &&
      lastFetched < totalPages &&
      fetches < AprimoConnector._MAX_FILL_FETCHES
    ) {
      lastFetched++;
      fetches++;
      const more = await this._runRecordSearch(expression, parameters, lastFetched, pageSize, context, withFields);
      items.push(...more.items);
      records.push(...more.records);
    }

    // More to come whenever we haven't consumed the last Aprimo page — this is
    // true both when we filled `pageSize` early AND when we bailed on the fetch
    // cap still short (the engine re-requests, and the next call resumes here).
    const nextPage = lastFetched < totalPages ? String(lastFetched + 1) : "";
    this._debug("searchRecords.fill", {
      startPage: page,
      lastFetched,
      fetches,
      returned: items.length,
      total,
      nextPage,
    });
    return { items, records, nextPage };
  }

  // Execute one /search/records POST and map the hits to Media. Returns the
  // mapped items, the raw records behind them, and Aprimo's `totalCount` so the
  // caller can decide on fallback and paging.
  private async _runRecordSearch(
    expression: string,
    parameters: string[],
    page: number,
    pageSize: number,
    context: Connector.Dictionary,
    withFields: boolean = false
  ): Promise<{ items: Media.Media[]; records: any[]; total: number }> {
    const path = "/search/records";
    this._debug("searchRecords.request", {
      path,
      expression,
      parameters,
      page,
      pageSize,
      withFields,
    });
    // A page of picker results asks for NO `fields`: Studio reads `metaData`
    // only when it resolves a single asset (and from `detail`), so embedding
    // every record's fields here would pay for a payload nothing looks at — on
    // a 15-record page with wide records that is the bulk of the response.
    const selection: Connector.Dictionary = withFields
      ? this._fieldSelectHeaders()
      : { "Select-Record": "title,masterfilelatestversion,classifications" };
    const r = await this._aprimoFetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        page: String(page),
        pageSize: String(pageSize),
        ...selection,
      },
      body: JSON.stringify({ searchExpression: { expression, parameters } }),
    });
    if (!r.ok) throw this._failure(r, path);
    const data = JSON.parse(r.text);
    // Keep the mapped rows and the records they came from index-aligned:
    // unsupported file types drop out of both, so the caller can attach metaData
    // built from records[i] onto items[i].
    const records: any[] = [];
    const items: Media.Media[] = [];
    for (const rec of data.items ?? []) {
      const media = this._toMedia(rec, context);
      if (!media) continue;
      records.push(rec);
      items.push(media);
    }
    const total: number = data.totalCount ?? 0;
    this._debug("searchRecords.response", {
      status: r.status,
      rawCount: (data.items ?? []).length,
      returned: items.length,
      totalCount: total,
    });
    return { items, records, total };
  }

  // ── MediaConnector interface ───────────────────────────────────────────────

  async query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {
    // Is the engine resolving ONE stored asset (metadata wanted), or is a user
    // browsing/searching (metadata never read)? See _isSingleAssetResolve.
    const singleAsset = this._isSingleAssetResolve(options);

    // Query-by-ID: re-resolve a known image variable's stored asset ID. Only
    // take this path when the lone filter value is actually a record GUID —
    // otherwise a designer typing a single-word search term would be misrouted
    // to an ID lookup (and a configured classification would never scope it).
    // Not gated on page size: a GUID pasted into the picker's search box is
    // still a direct lookup, as documented. It is one record either way, so
    // its metadata is always resolved.
    if (
      !options.collection &&
      options.filter?.length === 1 &&
      /^[0-9a-f]{32}$/i.test(options.filter[0])
    ) {
      const record = await this._fetchRecordWithFields(options.filter[0]);
      const media = this._toMedia(record, context);
      // Resolve metadata only once the record is known to be servable: the
      // id → name lookups behind it are extra round-trips, wasted on a record
      // whose file type this connector filters out anyway.
      if (media) {
        const [metaData] = await this._resolveMetaData([record], context);
        media.metaData = metaData;
      }
      return {
        data: media ? [media] : [],
        pageSize: media ? 1 : 0,
        links: { nextPage: "" },
      };
    }

    const page = options.pageToken
      ? parseInt(options.pageToken as string, 10) || 1
      : 1;
    const pageSize = options.pageSize ?? 15;
    const keyword = options.filter?.join(" ") ?? "";
    // Scoped-root behaviour: a live folder navigation (`collection`) always
    // wins, so the designer can still drill into sub-folders. With no active
    // navigation we fall back to the designer-configured classification, which
    // confines both browse and search to that classification (exact match —
    // records filed only under descendant classifications appear once the
    // designer navigates into them).
    const navId =
      options.collection && options.collection !== "/"
        ? this._classificationIdFromCollection(options.collection as string)
        : null;
    const configuredId = this._configuredClassificationId(context);
    const collectionId = navId ?? configuredId;
    this._debug("query.scope", {
      collection: options.collection ?? null,
      rawClassificationId: context["classificationId"] ?? null,
      navId,
      configuredId,
      collectionId,
      keyword,
      page,
    });

    // Search mode: records only, no folder rows
    if (keyword) {
      // A single-asset resolve whose stored value is NOT a GUID lands here: the
      // image variable holds the asset NAME (an action set it), so the engine
      // resolves it as a one-row keyword search — and still reads `metaData` off
      // the result. That is the only search that asks for `fields`.
      const result = await this._searchRecords(
        collectionId,
        keyword,
        page,
        pageSize,
        context,
        singleAsset
      );
      if (singleAsset && result.items.length > 0) {
        // The page-fill loop can hand back more than the one row that was asked
        // for; resolve every returned record in ONE batch of lookups.
        const bags = await this._resolveMetaData(result.records, context);
        result.items.forEach((media, i) => {
          media.metaData = bags[i] ?? {};
        });
      }
      return {
        data: result.items,
        pageSize: result.items.length,
        links: { nextPage: result.nextPage },
      };
    }

    // Browse mode: sub-folders on page 1, then records
    if (page === 1) {
      const [folders, records] = await Promise.all([
        this._getClassifications(collectionId),
        this._searchRecords(collectionId, "", 1, pageSize, context),
      ]);
      return {
        data: [...folders, ...records.items],
        pageSize: folders.length + records.items.length,
        links: { nextPage: records.nextPage },
      };
    }

    // Browse mode subsequent pages: records only
    const records = await this._searchRecords(collectionId, "", page, pageSize, context);
    return {
      data: records.items,
      pageSize: records.items.length,
      links: { nextPage: records.nextPage },
    };
  }

  async detail(
    id: string,
    context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
    const record = await this._fetchRecordWithFields(id);
    const base = this._toMedia(record, context);
    if (!base) throw new Error(`Record ${id} not found or unsupported type`);
    const [metaData] = await this._resolveMetaData([record], context);
    const mf =
      record._embedded?.masterfilelatestversion ??
      record._embedded?.masterfileversion ??
      record.masterfilelatestversion;
    return {
      ...base,
      metaData,
      width: mf?.width != null ? Number(mf.width) : undefined,
      height: mf?.height != null ? Number(mf.height) : undefined,
    };
  }

  async download(
    id: string,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    // Display tiers are served by Aprimo's rendered-preview endpoints. These
    // /image/{thumbnail,preview} endpoints return a HAL *descriptor* whose
    // `uri` is a short-lived pre-signed CDN link to the image — they do NOT
    // stream the bytes, so we deref (read descriptor → fetch signed `uri`).
    // `thumbnail` ≈ 160px; `preview` is the larger rendered preview.
    //
    // Placement tiers (fullres / original) need the true master file, which
    // Aprimo only delivers via a "download order" (see _downloadOriginal). If
    // that fails (e.g. a download agreement blocks it, or processing perms),
    // fall back to the rendered preview so the canvas still gets pixels rather
    // than a thrown, unrecoverable download.
    switch (previewType) {
      case "thumbnail":
        return this._previewImageBytes(id, "thumbnail");
      case "mediumres":
      case "highres":
        return this._previewImageBytes(id, "preview");
      case "fullres":
      case "original":
      default:
        try {
          return await this._downloadOriginal(id);
        } catch {
          return this._previewImageBytes(id, "preview");
        }
    }
  }

  // Fetch the original master file via a download order: Aprimo doesn't expose
  // the original bytes directly (no public links on this tenant), but a
  // `download` order delivers a short-lived signed URL to the master file.
  private async _downloadOriginal(id: string): Promise<Connector.ArrayBufferPointer> {
    // 1) Resolve the latest master file version id — a download target needs
    //    an explicit fileVersionId.
    const recPath = `/record/${encodeURIComponent(id)}`;
    const recR = await this._aprimoFetch(recPath, {
      method: "GET",
      headers: { "Select-Record": "masterfilelatestversion" },
    });
    if (!recR.ok) throw this._failure(recR, recPath);
    const mfId = JSON.parse(recR.text)?._embedded?.masterfilelatestversion?.id;
    if (!mfId) {
      throw new ConnectorHttpError(404, `No master file version for record ${id}`);
    }

    // 2) Create a download order. `targetTypes: [0]` is RecordTargetType.Version
    //    (the master file). `disableProcessing: yesifpermissiongranted` returns
    //    a direct link to the unprocessed original when the service account has
    //    the "Disable file processing of download orders" permission, otherwise
    //    a processed (still full-resolution) copy.
    const orderBody = {
      type: "download",
      disableProcessing: "yesifpermissiongranted",
      targets: [{ recordId: id, fileVersionId: mfId, targetTypes: [0] }],
    };
    const ordR = await this._aprimoFetch("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/hal+json" },
      body: JSON.stringify(orderBody),
    });
    if (!ordR.ok) throw this._failure(ordR, "/orders");
    let order = JSON.parse(ordR.text);

    // 3) Single-file orders usually complete synchronously, but the order can
    //    also be queued/executing — poll the order until it delivers a file or
    //    reaches a terminal failure state.
    const orderId = order.id;
    for (let i = 0; i < 6 && !this._orderDelivered(order) && !this._orderFailed(order); i++) {
      await sleep(500 * 1.5 ** i);
      const pollR = await this._aprimoFetch(
        `/order/${encodeURIComponent(orderId)}`,
        {
          method: "GET",
          headers: { "Select-DownloadOrder": "deliveredFiles" },
        }
      );
      // A failed poll is not fatal — the order may already have delivered, and
      // the caller falls back to a rendered preview when it has not.
      if (!pollR.ok) break;
      order = JSON.parse(pollR.text);
    }

    const uri: string | undefined = (order.deliveredFiles ?? [])[0];
    if (!uri) {
      throw new ConnectorHttpError(502, `Download order produced no file (status ${order.status})`);
    }

    // 4) Fetch the signed delivery URL → original bytes.
    const fileR = await this.runtime.fetch(uri, {
      method: "GET",
      headers: AprimoConnector._SIGNED_URL_HEADERS,
      referrer: "aprimo-connector",
    });
    if (!fileR.ok) {
      throw new ConnectorHttpError(fileR.status, `Original fetch failed ${fileR.status} ${fileR.statusText}`);
    }
    return fileR.arrayBuffer;
  }

  private _orderDelivered(order: any): boolean {
    return Array.isArray(order?.deliveredFiles) && order.deliveredFiles.length > 0;
  }

  private _orderFailed(order: any): boolean {
    return /^(failed|cancelled|partiallyfailed)$/i.test(order?.status ?? "");
  }

  private async _previewImageBytes(
    id: string,
    endpoint: "thumbnail" | "preview"
  ): Promise<Connector.ArrayBufferPointer> {
    const path = `/record/${encodeURIComponent(id)}/image/${endpoint}`;
    const descR = await this._aprimoFetch(path, { method: "GET" });
    if (!descR.ok) throw this._failure(descR, path);
    const uri = JSON.parse(descR.text)?.uri;
    if (!uri) {
      throw new ConnectorHttpError(502, `Preview ${endpoint} returned no image uri`);
    }
    const imgR = await this.runtime.fetch(uri, {
      method: "GET",
      headers: AprimoConnector._SIGNED_URL_HEADERS,
      referrer: "aprimo-connector",
    });
    if (!imgR.ok) {
      throw new ConnectorHttpError(imgR.status, `Preview image fetch failed ${imgR.status} ${imgR.statusText}`);
    }
    return imgR.arrayBuffer;
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [
      {
        name: "classificationId",
        displayName: "Classification (scopes browse & search)",
        type: "text",
        helpText:
          "Aprimo classification ID (32-char GUID). When set, browsing starts in this classification and searches are confined to it; leave empty to browse the whole library.",
      },
      {
        name: "collectionId",
        displayName: "Collection (filters browse & search)",
        type: "text",
        helpText:
          "Aprimo collection ID (32-char GUID). When set, browse and search return only records that belong to this collection (static or dynamic). Combines with Classification as an AND — a record must be in both. Folder navigation narrows within the collection but never escapes it. Leave empty to not filter by collection.",
      },
      {
        name: "metaDataLanguageId",
        displayName: "Metadata language ID",
        type: "text",
        helpText:
          "Aprimo language GUID to read field values for when populating metadata, and the language option and classification names are shown in. Leave empty to use the language-neutral value for fields and the service account's default language for names; if a field has no value for this language, the neutral value is used as a fallback.",
      },
    ];
  }

  getCapabilities(): Media.MediaConnectorCapabilities {
    return {
      query: true,
      detail: true,
      filtering: true,
      metadata: true,
      upload: false,
    };
  }
}
