# Releases

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
