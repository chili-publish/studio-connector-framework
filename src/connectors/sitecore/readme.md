## Publish
```
connector-cli publish \
    -e cp-dcl-432 \
    -b https://cp-dcl-432.chili-publish.online/grafx \
    -n "Sitecore Content Hub" \
    --proxyOption.allowedDomains "*.sitecoresandbox.cloud" \
    --runtimeOption="BASE_URL=https://chili-sbx.sitecoresandbox.cloud/" \
    --connectorId=43d8f5cf-b1bb-477b-a877-80e45188efe4
```

Load relation metadata properties below example loads all the metadata from `PCMProductToAsset`
```
connector-cli publish \
    -e cp-dcl-432 \
    -b https://cp-dcl-432.chili-publish.online/grafx \
    -n "Sitecore Content Hub" \
    --proxyOption.allowedDomains "*.sitecoresandbox.cloud" \
    --runtimeOption="BASE_URL=https://chili-sbx.sitecoresandbox.cloud/" \
    --runtimeOption="relationMetadataIncludes=PCMProductToAsset" \
    --connectorId=43d8f5cf-b1bb-477b-a877-80e45188efe4
```


## Set authenticator

```
connector-cli set-auth \
    --connectorId 43d8f5cf-b1bb-477b-a877-80e45188efe4 \
    -e cp-dcl-432 \
    -b https://cp-dcl-432.chili-publish.online/grafx \
    -au server \
    -at oAuth2ResourceOwnerPassword \
    --auth-data-file oauth-resource-owner.json
```

```
connector-cli set-auth \
    --connectorId 43d8f5cf-b1bb-477b-a877-80e45188efe4 \
    -e cp-dcl-432 \
    -b https://cp-dcl-432.chili-publish.online/grafx \
    -au browser \
    -at oAuth2AuthorizationCode \
    --auth-data-file oauth-authorization-code.json
```

## query example
Info about query https://doc.sitecore.com/ch/en/developers/cloud-dev/generic-properties.html

Attached to product
`Exists("PCMProductToAsset")`


