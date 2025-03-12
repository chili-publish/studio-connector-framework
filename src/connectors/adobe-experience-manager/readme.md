# Adobe Experience Manager

This connector allows you to fetch the data from your AEM Site.

## Publish

```
connector-cli publish \
    -e {ENVIRONMENT} \
    -b https://{ENVIRONMENT}.chili-publish.online/grafx \
    -n "Adobe Experience Manager" \
    --proxyOption.allowedDomains "*.adobeaemcloud.com" \
    --runtimeOption="BASE_URL=https://{AUTHOR_ENVIRONMENT}.adobeaemcloud.com/" \
    --connectorId={CONNECTOR_ID}
```

## Renditions

For Aem we use the Renditions specified in the AEM platform, These renditions are default used

```
{
  "thumbnail": "cq5dam.thumbnail.140.100.png",
  "mediumres": "cq5dam.thumbnail.319.319.png",
  "highres": "cq5dam.web.1280.1280.jpeg",
  "fullresfallback": "cq5dam.zoom.2048.2048.jpeg",
  "pdf": "cq5dam.preview.pdf",
}
```

You can override them by adding them to the runtime options by example you can replace them thumbnail with "eam.customthumb.png" by publishing with this runtime command

```
connector-cli publish \
    -e {ENVIRONMENT} \
    -b https://{ENVIRONMENT}.chili-publish.online/grafx \
    -n "Adobe Experience Manager" \
    --proxyOption.allowedDomains "*.adobeaemcloud.com" \
    --runtimeOption="BASE_URL=https://{AUTHOR_ENVIRONMENT}.adobeaemcloud.com/" \
    --runtimeOption="renditionOverrides={\"thumbnail\": \"eam.customthumb.png\"}" \
    --connectorId={CONNECTOR_ID}
```

## Docs Querybuilder

We use the querybuilder to load the different assets + folders you can extend these query by the Search Query Field

https://experienceleague.adobe.com/en/docs/experience-manager-65/content/implementing/developing/platform/query-builder/querybuilder-api

## Authorization setup

### Supported authentication

- OAuth2JwtBearer
- StaticKey

### Setup Service account

Following [instructions](https://experienceleague.adobe.com/en/docs/experience-manager-learn/getting-started-with-aem-headless/authentication/service-credentials) setup service credentials for OAuth2JwtBearer authentication flow

### Authentication json files

https://docs.chiligrafx.com/GraFx-Developers/connectors/authorization-for-connectors/

`"oauth-jwt-bearer.json"`

```json
{
  "signatureConfig": {
    "algorithm": "RS256",
    "privateKey": "secretPrivateKeyValueInPemFormat"
  },
  "jwtPayload": {
    "iss": "organizationId",
    "sub": "technicalAccountId",
    "aud": "https://ims-na1.adobelogin.com/c/your-client-id"
  },
  "requestBodyParams": {
    "client_id": "your-client-id",
    "client_secret": "your-client-secret"
  }
}
```
