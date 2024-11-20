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

```
connector-cli set-auth \
    --connectorId {CONNECTOR_ID} \
    -e {ENVIRONMENT} \
    -b https://{ENVIRONMENT}.chili-publish.online/grafx \
    -au server \
    -at oAuth2ResourceOwnerPassword \
    --auth-data-file oauth-resource-owner.json
```

## Authorization setup

### Create the authentication json files
https://docs.chiligrafx.com/GraFx-Developers/connectors/authorization-for-connectors/

The ones needed
- oAuth2ResourceOwnerPassword

### Example

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