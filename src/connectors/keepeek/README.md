# Media Connector for **Keepeek**

|  | Connector Type |
| --- | --- |
|  | Built-in |
| | Built by CHILI publish |
| :fontawesome-regular-square-check:  | Third party |

## Installation

How to deploy or install a connector to your environment?

[See Installation Through Connector Hub](/GraFx-Studio/guides/connector-hub/)

## Keepeek Configuration 

Contact us on [Graphique alliance - Contact](https://graphique-alliance.com/contact/) or by email (info@graphique-alliance.com) to get an access to the connector.

- **OAuth settings**
``` html
{
    "name": "KeepeekAuthorizationCode",
    "clientId": "<client-id>",
    "clientSecret": "<client-secret>",
    "scope": "openid",
    "tokenEndpoint": "https://auth.keepeek.com/auth/realms/<env-name>/protocol/openid-connect/token"
}
```

## CHILI GraFx Connector Configuration 

From the overview of Environments, click on "Settings" on the right to your environment, where you want to install or configure the Connector.

![screenshot-full](sch13.jpg)

Then click the installed Connector to access the configuration.

![screenshot-full](sch12.png)

### Base Configuration

Your instance of the Connector needs to know which **Keepeek** instance it should communicate with and how to authenticate.
- **Proxy settings** *.keepeek.com
- **Runtime options** 
    - **KEEPEEK_URL** https://{client-name}.keepeek.com

![screenshot-full](sch01.png)

### Authentication

**Supported on Browser:** OAuth 2.0 Client Credentials

![screenshot](sch02.png)

- **Client ID** and **Client Secret**: These are customer-specific credentials provided by [Graphique alliance](https://graphique-alliance.com/contact/).
- **Token Endpoint**: Developer-oriented settings available in **Keepeek** documentation. These settings depends on each **Keepeek** clients.
- **Scope**: openid.

![screenshot-full](sch04.png)

- **Token Endpoint** https://auth.keepeek.com/auth/realms/{env-name}/protocol/openid-connect/token

Consult Graphique alliance for assistance in configuring these fields.

### Server Authentication

The credentials used for machine-to-machine authentication determine the governance on assets in automation workflows. 

This means that if the credentials restrict access to specific assets, only those assets will be available during batch processing.

### Browser Authentication or Impersonation

GraFx Studio accesses assets available in your Media Provider via impersonation, where the credentials configured for the connector determine which assets are visible to the user in the template.

**Impersonation** is the process of granting GraFx Studio users access to the DAM system using pre-configured credentials. This ensures seamless integration while respecting the DAM's security and governance rules.

## Using Assets from Your **Keepeek** System

### Place Assets in Your Template

- Select the **Keepeek** Connector.

![screenshot-full](sch07.png)

![screenshot-full](sch08.png)

![screenshot-full](sch09.png)

Depending on the configuration, you may need to authenticate.

![screenshot-full](sch10.png)

- Once authenticated, **Keepeek** assets behave like any other asset in GraFx Studio.

### Image Variables

When using [image variables](/GraFx-Studio/guides/template-variables/assign/#assign-template-variable-to-image-frame), you will see the same list of assets when selecting an image.

![screenshot-full](var01.png)