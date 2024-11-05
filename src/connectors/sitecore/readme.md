## Publish
```
connector-cli publish \
    -e {ENVIRONMENT} \
    -b https://{ENVIRONMENT}.chili-publish.online/grafx \
    -n "Sitecore Content Hub" \
    --proxyOption.allowedDomains "*.sitecoresandbox.cloud" \
    --runtimeOption="BASE_URL=https://chili-sbx.sitecoresandbox.cloud/" \
    --connectorId={CONNECTOR_ID}
```

Load relation metadata properties below example loads all the metadata from `PCMProductToAsset`
```
connector-cli publish \
    -e {ENVIRONMENT} \
    -b https://{ENVIRONMENT}.chili-publish.online/grafx \
    -n "Sitecore Content Hub" \
    --proxyOption.allowedDomains "*.sitecoresandbox.cloud" \
    --runtimeOption="BASE_URL=https://chili-sbx.sitecoresandbox.cloud/" \
    --runtimeOption="relationMetadataIncludes=PCMProductToAsset" \
    --connectorId={CONNECTOR_ID}
```


## Set authenticator

```
connector-cli set-auth \
    --connectorId {CONNECTOR_ID} \
    -e {ENVIRONMENT} \
    -b https://{ENVIRONMENT}.chili-publish.online/grafx \
    -au server \
    -at oAuth2ResourceOwnerPassword \
    --auth-data-file oauth-resource-owner.json
```

```
connector-cli set-auth \
    --connectorId 43d8f5cf-b1bb-477b-a877-80e45188efe4 \
    -e {ENVIRONMENT} \
    -b https://{ENVIRONMENT}.chili-publish.online/grafx \
    -au browser \
    -at oAuth2AuthorizationCode \
    --auth-data-file oauth-authorization-code.json
```

## query example
Info about query https://doc.sitecore.com/ch/en/developers/cloud-dev/generic-properties.html

Attached to product
`Exists("PCMProductToAsset")`


## Authorization setup

## Create oauth client in contenthub environment
https://doc.sitecore.com/ch/en/users/content-hub/create-an-oauth-client.html

- Client type: Authorization Code + Resource Owner Password Credentials
- Redirect url: https://{ENVIRONMENT}.chili-publish.online/grafx/api/v1/environment/{ENVIRONMENT}/connectors/${CONNECTOR_ID}/auth/oauth-authorization-code/redirect


## Create the authentication json files
https://docs.chiligrafx.com/GraFx-Developers/connectors/authorization-for-connectors/

The ones needed
- oAuth2ResourceOwnerPassword
- oAuth2AuthorizationCode

### templates

oauth-authorization-code.json
```
{
  "clientId": "{CLIENT_ID}",
  "clientSecret": "{CLIENT_SECRET}",
  "scope": "openid profile",
  "authorizationServerMetadata": {
    "authorization_endpoint": "https://{SITECORE_CONTENTHUB_PATH}/oauth/authorize",
    "token_endpoint": "https://{SITECORE_CONTENTHUB_PATH}/oauth/token",
    "token_endpoint_auth_methods_supported": [
      "client_secret_basic",
      "client_secret_post"
    ]
  }
}
```

oauth-resource-owner.json
```
{
  "clientId": "{CLIENT_ID}",
  "clientSecret": "{CLIENT_SECRET}",
  "username": "{SITECORE_USERNAME}",
  "password": "{SITECORE_PASSWORD}",
  "tokenEndpoint": "https://{SITECORE_CONTENTHUB_PATH}/oauth/token",
  "authorizationServerMetadata": {
    "token_endpoint_auth_methods_supported": [
      "client_secret_post"
    ]
  }
}
```