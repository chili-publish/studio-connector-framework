# Bynder Media Connector

This document describes the Bynder Media Connector used to integrate with the
Bynder Digital Asset Management (DAM) API. It provides information on
authentication, available endpoints, query parameters, and other useful tips.

> **Note:** The connector currently implements the OAuth 2.0 Client Credentials
grant type. A Proof of Concept (POC) is available; features may evolve
over time.

## API Base Information

- **Base URL:** `https://{your-bynder-domain}/api/v4/`
- **API docs:** https://api.bynder.com/

## Authentication

The connector uses OAuth2 Client Credentials to fetch an access token.

### Token endpoint

```
POST https://{your-bynder-domain}/v6/authentication/oauth2/token
Content-Type: application/x-www-form-urlencoded
```

### Request parameters (form data)

| Field        | Description                                      |
|--------------|--------------------------------------------------|
| clientId     | OAuth client ID from Bynder portal               |
| clientSecret | OAuth client secret from Bynder portal           |
| scope        | e.g. `asset:read collection:read`               |

Example payload:

```json
{
  "clientId": "YOUR_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "scope": "asset:read collection:read"
}
```

### Obtaining credentials

Navigate to **Advanced Settings > Portal Settings > OAuth Apps** in
your Bynder account. Create or inspect an OAuth application and note the
credentials. Configure the grant type and scopes:

- **Authorization Code + Refresh Token** (not implemented in this connector)
- **Client Credentials**

** Don't forget to set the client credentials in the oauth-client-credentials.json file! and set authentication to the connector **

Common scopes:

- `asset:read`, `asset:write`, `asset:delete`
- `collection:read`, `collection:write`, `collection:delete`
- Additional scopes such as Approval, Brandstore, MetaProperties may
  be required for extended functionality.

> **Token lifetime:** Bynder tokens expire after 1 hour by default.

## Working with Media (Assets)

Bynder does not use a traditional folder hierarchy; assets are organised
into *collections*.

### List assets

```
GET /media/
```

Query parameters supported by the connector POC:

| Parameter     | Description |
|---------------|-------------|
| collectionId  | Restrict results to a specific collection      |
| limit         | Max items per page (default 50, max 1000)      |
| page          | Page number of results                         |
| id            | Retrieve a single asset by its ID              |

Additional useful filters:

- `orderBy`
- `brandId`, `subBrandId`
- `keyword` (search across filename, tags, extensions, collection names)
- `isPublic`
- `type` (e.g. `image`, `document`, `audio`, `video`)
- `categoryId`

### Asset details

Use the `id` parameter or `/media/{id}/` to fetch details about a specific
asset.

## Working with Collections

```
GET /collections/
```

- No `id` parameter: returns all collections.
- `id`: returns a single collection.
- `keyword`: search collections by name.
- `isPublic`: filter for public collections.

## Downloading Files

Asset responses include thumbnails and preview URLs:

- `thumb` (thumbnail)
- `webimage` (medium size)
- `mini` (small size)

To download the original file:

```
GET /media/{id}/download
```

Supply the media ID. The response contains an `s3_file` URL that can be
used to fetch the original asset.

## Notes & Caveats

- Legacy assets may lack fields present on newer uploads; some endpoints
  or response properties may be missing.
- Connector filtering can be enabled by using the `keyword` parameter
  on the `/media/` endpoint.