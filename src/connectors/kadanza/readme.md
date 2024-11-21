## Publish
```
connector-cli publish \
    -e {ENVIRONMENT} \
    -b https://{ENVIRONMENT}.chili-publish.online/grafx \
    -n "Kadanza DAM Media Connector v0.0.1" \
    --proxyOption.allowedDomains "*.kadanza.io" \
    -ro BASE_URL="https://dam2.kadanza.io" \
    --connectorId={CONNECTOR_ID}
```

Enable debug messages
```
connector-cli publish \
    -e {ENVIRONMENT} \
    -b https://{ENVIRONMENT}.chili-publish.online/grafx \
    -n "Kadanza DAM Media Connector v0.0.1" \
    --proxyOption.allowedDomains "*.kadanza.io" \
    -ro BASE_URL="https://dam2.kadanza.io" \
    -ro DEBUG=true \
    --connectorId={CONNECTOR_ID}
```

## Set authenticator

### Server
```
connector-cli set-auth \
    --connectorId {CONNECTOR_ID} \
    -e {ENVIRONMENT} \
    -b https://{ENVIRONMENT}.chili-publish.online/grafx \
    -au server \
    -at oAuth2ResourceOwnerPassword \
    --auth-data-file oauth-resource-owner.json
```

### Browser
```
connector-cli set-auth \
    --connectorId {CONNECTOR_ID} \
    -e {ENVIRONMENT} \
    -b https://{ENVIRONMENT}.chili-publish.online/grafx \
    -au browser \
    -at oAuth2AuthorizationCode \
    --auth-data-file oauth-authorization-code.json
```

## Authorization setup

### Create the authentication json files
https://docs.chiligrafx.com/GraFx-Developers/connectors/authorization-for-connectors/

The ones needed
- oAuth2ResourceOwnerPassword
- oAuth2AuthorizationCode

### Examples

oauth-resource-owner.json
```
{
  "clientId": "{CLIENT_ID}",
  "clientSecret": "{CLIENT_SECRET}",
  "username": "{FUSIONAUTH_USERNAME}",
  "password": "{FUSIONAUTH_PASSWORD}",
  "tokenEndpoint": "https://idp.kadanza.io/oauth2/token"
}
```

oauth-authorization-code.json
```
{
  "clientId": "{CLIENT_ID}",
  "clientSecret": "{CLIENT_SECRET}",
  "scope": "",
  "authorizationServerMetadata": {
    "authorization_endpoint": "https://idp.kadanza.io/oauth2/authorize",
    "token_endpoint": "https://idp.kadanza.io/oauth2/token",
    "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"]
  }
}
```
