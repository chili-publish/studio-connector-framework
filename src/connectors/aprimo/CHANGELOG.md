# Releases

## 1.1.0

- [Feature] Typed metadata for option lists, classification lists, record links, and hyperlinks — readable names on the mappable key, with `.ids` and `.text` companion keys
- [Feature] Metadata is resolved only on single-asset calls; search and browse pages in the picker carry none
- [Feature] `META_DATA_FIELDS` is sent to Aprimo as `select-record-fields`, so only the listed fields are embedded in the record response
- [Feature] Root folders are fetched with a server-side filter instead of downloading the whole classification tree
- [Fix] A rate-limited (429) request is retried once, and a persistent failure raises an error naming the rate limit as the cause
- [Fix] All metadata values are guaranteed to be strings

## 1.0.0

Initial release of the Aprimo connector
