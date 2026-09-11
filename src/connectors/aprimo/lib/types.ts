// Aprimo API shapes, narrowed to the parts this connector actually reads.
// These are hand-written from live responses on the trial tenant — Aprimo
// publishes no schema — so every property that the API can legitimately omit or
// null out is optional here, and the code that consumes them treats a missing
// property and an empty one the same way.

// One `labels[]` entry on an option item or a classification: the display text
// for a single language. With a `languages: <id>` request header the server
// returns only that language's entry (substituting `name` when the language has
// no label of its own), so `labels[0]` is the localized text whenever one was
// asked for.
export interface AprimoLabel {
  value: string;
  languageId?: string;
}

// A record link target. `modifiedOn` and `tag` are server-managed; we only ever
// need the record id it points at.
export interface AprimoRecordLinkItem {
  recordId: string;
  modifiedOn?: string;
  tag?: string | null;
}

// One entry of a HyperlinkList field value. `displayText` is null when the
// editor typed a bare URL.
export interface AprimoHyperlink {
  url: string;
  displayText?: string | null;
}

// One language's value for a field. WHICH property carries the payload depends
// on the field's dataType, and only one of them is ever populated:
//   • scalars (SingleLineText, Numeric, Date, …)       → `value` (numbers arrive
//     as strings, which is why nothing here re-types them)
//   • TextList                                          → `values` (plain text)
//   • OptionList                                        → `values` (item ids)
//   • ClassificationList                                → `values` (classification ids)
//   • RecordLink                                        → exactly one of `links`,
//     `parents`, `children` — which one is decided by the field DEFINITION's
//     link type, so a consumer has to look at all three
//   • HyperlinkList                                     → `hyperlinks`
export interface AprimoLocalizedValue {
  languageId?: string;
  value?: string | number | boolean | null;
  values?: (string | number | boolean | null)[] | null;
  links?: AprimoRecordLinkItem[] | null;
  parents?: AprimoRecordLinkItem[] | null;
  children?: AprimoRecordLinkItem[] | null;
  hyperlinks?: AprimoHyperlink[] | null;
}

// One field on a record, from `_embedded.fields.items[]`. NOTE: `id` is the
// field DEFINITION id, not a per-record id — it is the key used to look an
// OptionList's items up at /fielddefinition/{id}.
export interface AprimoFieldItem {
  id: string;
  dataType?: string;
  fieldName?: string;
  label?: string;
  localizedValues?: AprimoLocalizedValue[];
}

// One selectable item of an OptionList field definition. `disabledInDAMUI`
// items are kept: a record can still carry an id that was disabled after it was
// picked, and dropping it would turn a real value into an unresolved id.
export interface AprimoOptionItem {
  id: string;
  name?: string;
  label?: string | null;
  labels?: AprimoLabel[];
  disabledInDAMUI?: boolean;
}

// GET /fielddefinition/{id} for an OptionList field.
export interface AprimoOptionListDefinition {
  dataType?: string;
  items?: AprimoOptionItem[];
}

// One hit of POST /search/classifications.
export interface AprimoClassificationHit {
  id: string;
  name?: string;
  labels?: AprimoLabel[];
}

// Everything the reference-resolving round-trips produced, keyed for O(1)
// lookup while building the metaData bag.
export interface Lookups {
  // field DEFINITION id → (option item id → display label)
  optionItems: Map<string, Map<string, string>>;
  // classification id → display name
  classifications: Map<string, string>;
}

// The ids a record's whitelisted fields refer to, gathered in one pass over the
// field items so the lookups can be batched instead of fetched per field.
export interface References {
  optionListDefIds: Set<string>;
  classificationIds: Set<string>;
}
