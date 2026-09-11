// ── metaData mapping (Aprimo fields → CHILI metaData) ────────────────────────
// Aprimo records carry typed, localized, sometimes multi-valued fields under
// `_embedded.fields.items` (present only when the request asks for `fields` in
// `Select-Record`). CHILI's `Media.metaData` is a flat bag, and the ENGINE
// rejects the whole call when any value is a number or a boolean — the SDK type
// (`string | boolean | number`) is looser than what the engine accepts — so
// every value written here goes through `String(...)`.
//
// This module is pure: no fetch, no runtime, no options object. It takes field
// items in and returns plain data, which keeps the id→name resolution (which
// needs the network) in lib/lookups.ts and keeps the mapping itself easy to
// reason about.

import type {
  AprimoFieldItem,
  AprimoLocalizedValue,
  Lookups,
  References,
} from "./types";

// Aprimo's all-zero GUID is the language-NEUTRAL value: the default we read
// when no `metaDataLanguageId` is configured, and the fallback when a
// configured language has no value for a given field.
export const NEUTRAL_LANGUAGE_ID = "00000000000000000000000000000000";

// Values that are multi-valued in Aprimo but single in CHILI are collapsed with
// this separator, both for the primary value and for its companion keys — so
// `Name`, `Name.ids` and `Name.text` stay index-aligned and a consumer can
// split them back apart the same way.
const JOIN = ", ";

// Fields that are never exposed. User fields carry user ids, and resolving
// them would place a named individual's details into a Studio document and
// from there into rendered output. No template use case needs that, so it is
// deliberately closed off rather than left to configuration (see the README,
// "User fields are not exposed").
const OMITTED_DATA_TYPES = ["UserList", "UserGroupList"];

// `META_DATA_FIELDS` runtime option: a comma-separated list of Aprimo field
// names to expose, e.g. "Campaign Name, Spider Chart Count". Whitespace around
// each name is trimmed, so spaces after commas don't matter; spaces *within* a
// name are preserved. Field names that contain a literal comma are NOT
// supported (rename the field in Aprimo). Empty / unset means expose ALL fields
// that have a value.
export function parseFieldWhitelist(raw: unknown): string[] {
  if (raw == null) return [];
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");
}

// The key a field is published under: its API name, falling back to its display
// label for the (rare) definitions that have no `fieldName`.
export function fieldKey(field: AprimoFieldItem): string | undefined {
  return field?.fieldName ?? field?.label ?? undefined;
}

// The field items worth looking at: named, not an always-omitted type, and —
// when a whitelist is configured — named IN it. The whitelist matches the
// PRIMARY name only; the companion keys a field may emit (`Name.ids`,
// `Name.text`) ride along implicitly, since asking for them separately would
// mean exposing the naming scheme in the option.
export function selectFields(
  items: AprimoFieldItem[],
  whitelist: string[]
): AprimoFieldItem[] {
  const wantAll = whitelist.length === 0;
  return (items ?? []).filter((f) => {
    const name = fieldKey(f);
    if (!name) return false;
    if (OMITTED_DATA_TYPES.indexOf(f?.dataType ?? "") !== -1) return false;
    return wantAll || whitelist.indexOf(name) !== -1;
  });
}

// Is there anything at all in this localized value? Used to skip past a
// language whose entry exists but is blank, so the neutral value can win.
function isEmpty(lv: AprimoLocalizedValue | undefined): boolean {
  if (lv == null) return true;
  if (lv.value != null && String(lv.value) !== "") return false;
  if (Array.isArray(lv.values) && lv.values.length > 0) return false;
  if (Array.isArray(lv.links) && lv.links.length > 0) return false;
  if (Array.isArray(lv.parents) && lv.parents.length > 0) return false;
  if (Array.isArray(lv.children) && lv.children.length > 0) return false;
  if (Array.isArray(lv.hyperlinks) && lv.hyperlinks.length > 0) return false;
  return true;
}

// Pick ONE localized value for a field: the configured language, else the
// neutral value, else the first entry that carries anything. Everything
// downstream reads only the picked entry, so a field never mixes languages.
export function pickFieldValue(
  field: AprimoFieldItem,
  langId: string | null
): AprimoLocalizedValue | undefined {
  const lvs = field?.localizedValues ?? [];
  if (lvs.length === 0) return undefined;
  const byLang = (id: string) => lvs.filter((lv) => lv?.languageId === id)[0];
  const ordered: (AprimoLocalizedValue | undefined)[] = [
    ...(langId ? [byLang(langId)] : []),
    byLang(NEUTRAL_LANGUAGE_ID),
    ...lvs,
  ];
  for (const lv of ordered) {
    if (!isEmpty(lv)) return lv;
  }
  return undefined;
}

// The non-empty entries of a localized value's `values` array, as strings —
// the plain text of a TextList, or the item / classification ids of a reference
// field, depending on the field's dataType.
function valuesOf(lv: AprimoLocalizedValue): string[] {
  return (lv.values ?? [])
    .filter((v) => v != null && String(v) !== "")
    .map((v) => String(v));
}

// Which ids a record's whitelisted fields refer to — collected in ONE pass so
// the caller can batch the lookups (one request per option-list definition, one
// chunked request for all classifications) instead of resolving field by field.
// An OptionList's items hang off the field DEFINITION, so the id we need there
// is the field item's own `id`; classification ids live in the picked value.
export function collectReferences(
  items: AprimoFieldItem[],
  whitelist: string[],
  langId: string | null
): References {
  const refs: References = {
    optionListDefIds: new Set<string>(),
    classificationIds: new Set<string>(),
  };
  for (const field of selectFields(items, whitelist)) {
    const lv = pickFieldValue(field, langId);
    if (!lv) continue;
    const ids = valuesOf(lv);
    if (ids.length === 0) continue;
    if (field.dataType === "OptionList") {
      if (field.id) refs.optionListDefIds.add(field.id);
    } else if (field.dataType === "ClassificationList") {
      for (const id of ids) refs.classificationIds.add(id);
    }
  }
  return refs;
}

// Build the metaData bag for one record. Empty and absent values are omitted so
// blank entries never crowd the bag, multi-values are joined with `", "`, and
// every value is a string (see the engine note at the top of this file).
//
// Reference fields publish TWO keys: the human-readable `Name` and a companion
// `Name.ids` holding the raw ids. The names are what a designer puts on the
// canvas; the ids are stable across renames and localization, which is what an
// automation matches on. `Name` is omitted when nothing resolved (a stale id, or
// a definition skipped by the lookup cap) — `Name.ids` is always written, so the
// value is never silently lost.
export function buildMetaData(
  items: AprimoFieldItem[],
  lookups: Lookups,
  langId: string | null,
  whitelist: string[]
): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const field of selectFields(items, whitelist)) {
    const name = fieldKey(field) as string;
    const lv = pickFieldValue(field, langId);
    if (!lv) continue;

    switch (field.dataType) {
      case "OptionList": {
        const ids = valuesOf(lv);
        if (ids.length === 0) break;
        const byId = lookups.optionItems.get(field.id);
        const labels = ids
          .map((id) => byId?.get(id))
          .filter((l): l is string => l != null && l !== "");
        if (labels.length > 0) meta[name] = labels.join(JOIN);
        meta[`${name}.ids`] = ids.join(JOIN);
        break;
      }

      case "ClassificationList": {
        const ids = valuesOf(lv);
        if (ids.length === 0) break;
        const names = ids
          .map((id) => lookups.classifications.get(id))
          .filter((n): n is string => n != null && n !== "");
        if (names.length > 0) meta[name] = names.join(JOIN);
        meta[`${name}.ids`] = ids.join(JOIN);
        break;
      }

      case "RecordLink": {
        // The definition's link type decides which of the three arrays is
        // populated, so read all of them rather than guessing. Record ids have
        // no companion key: they ARE the ids, and resolving them to titles
        // would cost one request per linked record.
        const linked = [
          ...(lv.links ?? []),
          ...(lv.parents ?? []),
          ...(lv.children ?? []),
        ]
          .map((l) => l?.recordId)
          .filter((id): id is string => id != null && id !== "");
        if (linked.length > 0) meta[name] = linked.join(JOIN);
        break;
      }

      case "HyperlinkList": {
        // Keep the url list and the display-text list index-aligned: entries
        // without a url are dropped from both, and a null displayText becomes a
        // blank slot rather than shifting the rest. The companion is written
        // only when at least one link actually has text — otherwise it would be
        // a string of commas.
        const links = (lv.hyperlinks ?? []).filter(
          (h) => h?.url != null && h.url !== ""
        );
        if (links.length === 0) break;
        meta[name] = links.map((h) => h.url).join(JOIN);
        if (links.some((h) => h.displayText != null)) {
          meta[`${name}.text`] = links
            .map((h) => h.displayText ?? "")
            .join(JOIN);
        }
        break;
      }

      default: {
        // SingleLineText, MultiLineText, Numeric, Date, DateTime, Time,
        // Duration, Html, Json — and any dataType Aprimo adds later. Shape,
        // not name, decides: a `values` array joins, a `value` stringifies.
        // Numbers arrive from Aprimo as strings already, so no formatting is
        // applied and nothing is re-parsed.
        if (Array.isArray(lv.values)) {
          const vals = valuesOf(lv);
          if (vals.length > 0) meta[name] = vals.join(JOIN);
        } else if (lv.value != null && String(lv.value) !== "") {
          meta[name] = String(lv.value);
        }
        break;
      }
    }
  }
  return meta;
}
