
`https://author-p140431-e1433829.adobeaemcloud.com/` => chili publish omgeving

## Publish
```
connector-cli publish \
    -e cp-dcl-432 \
    -b https://cp-dcl-432.chili-publish.online/grafx \
    -n "Adobe Experience Manager" \
    --proxyOption.allowedDomains "*.adobeaemcloud.com" \
    --runtimeOption="BASE_URL=https://author-p64403-e609779.adobeaemcloud.com/" \
    --connectorId=2c850829-ee8f-47a6-afe2-836e4e9d881f
```


## Set authenticator

```
connector-cli set-auth \
    --connectorId 2c850829-ee8f-47a6-afe2-836e4e9d881f \
    -e cp-dcl-432 \
    -b https://cp-dcl-432.chili-publish.online/grafx \
    -au server \
    -at staticKey \
    --auth-data-file static-key.json
```

```
connector-cli set-auth \
    --connectorId 2c850829-ee8f-47a6-afe2-836e4e9d881f \
    -e cp-dcl-432 \
    -b https://cp-dcl-432.chili-publish.online/grafx \
    -au browser \
    -at staticKey \
    --auth-data-file static-key.json
```





## Docs Querybuilder
https://experienceleague.adobe.com/en/docs/experience-manager-65/content/implementing/developing/platform/query-builder/querybuilder-api
