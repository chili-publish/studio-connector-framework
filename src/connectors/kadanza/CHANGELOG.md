# Releases

## 1.0.8

- Fix boolean custom metadata values crashing Studio's `metaData` parsing (`TypeError: type 'bool' is not a subtype of type 'String'`) — Studio's runtime requires all `metaData` values to be strings despite `Connector.Dictionary`'s type allowing `boolean`; boolean values are now stringified like everything else instead of passed through raw. This also resolves a downstream "Unable to load"/thumbnail-download failure on unrelated assets caused by the same parse crash corrupting the batch response.
- Fix free-text search silently doing nothing unless a `searchQuery` template was explicitly configured on the variable — plain typed text is now searched by default. Fix searching from the top level of a `categoryGroup` always returning the unfiltered root folder list instead of actually searching; it now runs a recursive asset search across the whole group, matching Kadanza's own DAM asset widget behavior.

## 1.0.7

- Fix boolean custom metadata values being silently dropped from the media picker's mapped `metaData` instead of reaching Studio's `boolean` variables

## 1.0.6

- Use the DAM thumbnail/preview instead of the raw original for TIFF (`tif`/`tiff`) assets on output-facing download paths (`highres`, `fullres`)
- Use the DAM `/pdf-wrap` rendition instead of the raw original for PDF source assets when downloaded with `print` intent
- The explicit `original` download type always returns the true source file, regardless of format or intent

## 1.0.5

- Add DAM category (folder) browsing to the media picker: configure a `categoryGroup` (entry point) and/or `category` on the connector to browse its DAM categories as folders, drilling down via subcategories down to their assets, instead of only ever listing all assets in a flat list
- Add a `searchQuery` config option to scope free-text search within the configured category context

## 1.0.4

- Use asset `title` instead of `name` in the media selection panel

## 1.0.3

- Add `/cdn` prefix to download URLs to avoid 301 redirects

## 1.0.2
- Align search query to the supported file types 

## 1.0.1

- https://github.com/chili-publish/studio-connector-framework/pull/137/files - Fix definition for OAuth2Authorization Code

## 1.0.0

Initial release of the Kadanza connector
