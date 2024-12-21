

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


## Set authenticator

```
connector-cli set-auth \
    --connectorId {CONNECTOR_ID} \
    -e {ENVIRONMENT} \
    -b https://{ENVIRONMENT}.chili-publish.online/grafx \
    -au server \
    -at staticKey \
    --auth-data-file static-key.json
```

```
connector-cli set-auth \
    --connectorId {CONNECTOR_ID} \
    -e {ENVIRONMENT} \
    -b https://c{ENVIRONMENT}.chili-publish.online/grafx \
    -au browser \
    -at staticKey \
    --auth-data-file static-key.json
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
