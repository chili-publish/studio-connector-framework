# Google Sheets

This connector allows you to fetch the data from the Google spreadsheet document.

## Publish

```
connector-cli publish \
    -e {ENVIRONMENT} \
    -b https://{ENVIRONMENT}.chili-publish.online/grafx \
    --proxyOption.allowedDomains sheets.googleapis.com \
    --connectorId={CONNECTOR_ID}
```

## Authorization setup

### Supported authentication

- OAuth2AuthorizationCode
- OAuth2JwtBearer

### Setup Google Cloud Project

Following [instructions ](https://support.google.com/cloud/answer/6158849?hl=en) setup your OAuth Client ID and Service user

- OAuth Client ID for OAuth2AuthorizationCode
- Service user for OAuth2JwtBearer

Redirect url: https://{ENVIRONMENT}.chili-publish.online/grafx/api/v1/environment/{ENVIRONMENT}/connectors/${CONNECTOR_ID}/auth/oauth-authorization-code/redirect

NOTE: To make connector working correctly, you should enable at least `Google Sheets API` from the list of APis

### Authentication json files

https://docs.chiligrafx.com/GraFx-Developers/connectors/authorization-for-connectors/

`"oauth-authorization-code.json"`

```json
{
  "clientId": "{CLIENT_ID}",
  "clientSecret": "{CLIENT_SECRET}",
  "scope": "https://www.googleapis.com/auth/spreadsheets.readonl",
  "authorizationServerMetadata": {
    "authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&include_granted_scopes=true",
    "token_endpoint": "https://oauth2.googleapis.com/token",
    "token_endpoint_auth_methods_supported": ["client_secret_post"]
  }
}
```

`"oauth-jwt-bearer.json"`

IN PROGRESS

## Limitations

1. **Column Range**:

   - Only columns from A to Z are used.

2. **Header Row**:

   - The first row must always contain header values

3. **Column Data Types**:

   - By default, all columns are considered as 'singleLine' text.
   - To format columns as 'number' or 'date', enable the corresponding formatting:
     - **Number**: Format => Number => Number.
     - **Date**: Format => Number => Date or Format => Number => Date Time.

4. **Boolean Columns**:

   - Boolean columns must always have a value (cells cannot be empty).
   - Define boolean columns using checkboxes.

5. **Row Structure**:
   - The spreadsheet must not contain empty rows between rows with data, as pagination logic relies on it.
