# Releases

# 1.0.5

- [NO-TICKET] Fixed character encoding — UTF-8 files that the runtime decodes as Latin-1 (mangling ®, ™ and accented characters) are now detected via the BOM and re-decoded correctly
- [NO-TICKET] Fixed number type inference — columns whose values include a bare `0` are now correctly detected as numbers (only multi-digit leading zeros like `007` and a leading `+` are kept as text)

# 1.0.4
- [NO-TICKET] Enable auth settings (staticKey, oAuth2ClientCredentials, oAuthAuthorizationCode, oAuth2ResourceOwnerPassword) in connector config

# 1.0.2

- [NO-TICKET] Add support for CSV files with empty column headers — empty columns are silently ignored and no longer cause errors in GraFx Studio
- [NO-TICKET] Add fail-fast error when all header cells are empty
- [NO-TICKET] Updated Content-Type guidance to reflect that text/plain, text/csv, and application/json are all supported

# 1.0.1

- [NO-TICKET] Fixed content type error message
