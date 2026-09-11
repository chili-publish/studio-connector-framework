# Releases

## 1.1.1

- [Fix] `metaDataLanguageId` now accepts a dashed GUID or a pasted path/URL like the other two configuration options: a dashed GUID no longer reads labels and field values in two different languages, and a pasted URL no longer fails the asset with an HTTP 400
- [Fix] The rate-limit documentation now distinguishes asset queries (a second 429 fails the call) from `fullres`/`original` downloads (a second 429 falls back to the rendered preview, so output can silently get preview pixels)
- [Fix] `Name` and `Name.ids` on option-list and classification-list fields are index-aligned: an unresolved reference leaves an empty slot instead of shifting the rest, matching what `Name.text` already did for hyperlinks
- [Fix] Resolving an image variable set to an asset **name** now scans up to 300 matching records for a supported file type instead of 6, so a name whose top matches are videos or documents still resolves

## 1.1.0

- [Feature] Typed metadata for option lists, classification lists, record links, and hyperlinks — readable names on the mappable key, with `.ids` and `.text` companion keys
- [Feature] Metadata is resolved only on single-asset calls; search and browse pages in the picker carry none
- [Feature] `META_DATA_FIELDS` is sent to Aprimo as `select-record-fields`, so only the listed fields are embedded in the record response
- [Feature] Root folders are fetched with a server-side filter instead of downloading the whole classification tree
- [Fix] A rate-limited (429) request is retried once, and a persistent failure raises an error naming the rate limit as the cause
- [Fix] All metadata values are guaranteed to be strings

## 1.0.0

Initial release of the Aprimo connector
