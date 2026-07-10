# Releases

# 1.0.3

- [NO-TICKET] Fixed number type inference — columns whose values include a bare `0` are now correctly detected as numbers (only multi-digit leading zeros like `007` and a leading `+` are kept as text)
- [NO-TICKET] Improved BOM handling — UTF-8 and UTF-16 byte-order marks are now stripped whether the runtime decodes them as `U+FEFF` or as Latin-1 characters (`ï»¿` / `ÿþ`), so Excel "CSV UTF-8" exports no longer add a stray character to the first column header

# 1.0.2

- [NO-TICKET] Add support for CSV files with empty column headers — empty columns are silently ignored and no longer cause errors in GraFx Studio
- [NO-TICKET] Add fail-fast error when all header cells are empty
- [NO-TICKET] Updated Content-Type guidance to reflect that text/plain, text/csv, and application/json are all supported

# 1.0.1

- [NO-TICKET] Fixed content type error message
