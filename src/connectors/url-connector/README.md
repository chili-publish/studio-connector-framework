# URL Connector

This connector is designed to take a URL in the browse settings and display the image in the template.

## How to use

You would set up a variable in the template to pass in the URL, and in your Browse Options, wire the URL option to your variable.

This connector supports `baseUrl` if you want to define a base URL to be used with every request.

## Installation CLI call

Here is an example CLI call for publishing the connector to use the Unsplash API:

```bash
connector-cli publish \
 -e {ENVIRONMENT} \
 -b https://{ENVIRONMENT}.chili-publish.online/grafx \
 -n "Unsplash" \
 --proxyOption.allowedDomains "\*.unsplash.com" \
 -ro baseUrl="https://images.unsplash.com/" \
```

