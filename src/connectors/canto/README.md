# Media Connector for Canto

|  | Connector Type |
| --- | --- |
|  | Built-in |
|  | Built by CHILI publish |
| :fontawesome-regular-square-check: | Third party |

[See Connector Types](/GraFx-Studio/concepts/connectors/#types-of-connectors)

## Support

Please open a issue on the connectors [github](https://github.com/spicy-labs/canto-media-connector/issues) page.

## Installation

How to deploy or install a connector to your environment?

[See Installation Through Connector Hub](/GraFx-Studio/guides/connector-hub/)

## Canto Media Connector Configuration 

!!! info
    Add the necessary references to settings that need to be made on the X-Y-Z side

Consult your [Canto API documentation](https://api.canto.com/) or Canto System Admin to obtain the correct values for the fields.

- **OAuth settings**
``` html
https://api.canto.com/#canto-oauth-page
```

## CHILI GraFx Connector Configuration 

From the overview of Environments, click on "Settings" on the right to your environment, where you want to install or configure the Connector.

![screenshot-full](docs/sch13.jpg)

Then click the installed Connector to access the configuration.

![screenshot-full](docs/sch12.png)

### Base Configuration

Your instance of the Connector needs to know which **Canto** instance it should communicate with and how to authenticate.

![screenshot-full](docs/sch01.png)

### Authentication

Select your type of authentication:

**Supported on Server:** OAuth 2.0 Client Credentials 

**Supported on Browser:** OAuth 2.0 Client Credentials

![screenshot](docs/sch02.png)

- **Client ID** and **Client Secret**: These are customer-specific credentials provided by the **Canto** Admin when creating integrations within **Canto**.
- **Username** and **Password**: User-specific credentials for authentication.
- **Token Endpoint**: Developer-oriented settings available in **X-Y-Z** documentation. These settings are generic for all **X-Y-Z** clients.
- **Scope**: Consult your **X-Y-Z** Admin to determine the appropriate scope.

You can configure separate authentication for machine-to-machine and browser use cases or use the same setup for both.

Consult your **Canto** System Admin for assistance in configuring these fields.

### Server Authentication

The credentials used for machine-to-machine authentication determine the governance on assets in automation workflows. 

This means that if the credentials restrict access to specific assets, only those assets will be available during batch processing.

### Browser Authentication or Impersonation

GraFx Studio accesses assets available in your Media Provider via impersonation, where the credentials configured for the connector determine which assets are visible to the user in the template.

**Impersonation** is the process of granting GraFx Studio users access to the DAM system using pre-configured credentials. This ensures seamless integration while respecting the DAM's security and governance rules.

## Using Assets from Your **Canto** System

### Place Assets in Your Template

- Select the **Canto** Connector.

![screenshot-full](docs/sch07.png)

![screenshot-full](docs/sch08.png)

![screenshot-full](docs/sch09.png)  

Note that the current version of the Canto GraFx Media Connector does not currently support pulling in PDFs as image assets due to limitations within Canto.

### Image Variables

When using [image variables](/GraFx-Studio/guides/template-variables/assign/#assign-template-variable-to-image-frame), you will see the same list of assets when selecting an image.

![screenshot-full](docs/var01.png)

### Configuration Options

#### Introduction

To filter the assets suggested to template users, you can use tags, keywords, or other search parameters (see the **Filter View** section below)  

**Canto** supports search queries through its query language. Consult the [**Canto API** Documentation](https://api.canto.com) or your **Canto** Administrator for guidance.  

### Folder view
This can be toggled on and off with the "Folder View" boolean value in the Connector options:  
![image](https://github.com/user-attachments/assets/e9d2d2f1-9990-421f-9e76-ae1287a0a213)  

When enabled, you can browse through folders and albums within the Canto environment to find the media asset you want.  


### Filter view
When the "Folder View" boolean value is toggled to false, the Connector will be in filter view mode. While here, there are a number of ways you can filter assets.

The "Keyword filter" configuration option:  
![image](https://github.com/user-attachments/assets/c50894d8-b478-4f03-ac31-aeed517f0fcf)  
Will perform a keyword search across the Canto environment. This acts as a general search, similar to the search functionality within Canto itself.  

The "Tag filter" configuration option:  
![image](https://github.com/user-attachments/assets/d8a0f4e8-248b-4a6c-bc19-e6206001f0a9)  
Will filter assets based on the supplied tag value.  

Both of the above configuration options allow for any values that Canto's API allows, for example a Keyword search of "Beach|Office" would return anything with a keyword of "Beach" or "Office".  

The "Album filter" option:  
![image](https://github.com/user-attachments/assets/5c57a5b5-6da5-4f73-b291-10df16141df9)  
Will filter based on specific Albums within the Canto environment. This takes Canto Album IDs, _not_ album names (i.e. IUO3O, T36LE, or N3GIN).  
You can also add multiple Album IDs to this field, separated by a `&` character, to search in multiple albums at the same time, for example:  
![image](https://github.com/user-attachments/assets/b543572b-8c38-48bb-9ab9-63365533666a)  

The "Only show approved" option:  
![image](https://github.com/user-attachments/assets/13ef1f07-98f9-4744-860a-1af6ed939eaf)  
Is a boolean field that allows you to hide any assets that aren't marked as `approved` within Canto.  

The "Fail Loading and Output if not approved" configuration option:  
![image](https://github.com/user-attachments/assets/4f528d9f-ac6f-4a34-bf42-26b29c0673b5)  
Will add an extra check to disallow images loading, and make GraFx Studio outputs fail, if they aren't marked as `approved` within Canto.  

For more dynamic queries, you can use [variables](/GraFx-Studio/concepts/variables/), [actions](/GraFx-Studio/concepts/actions/), and [GraFx Genie](/GraFx-Studio/concepts/grafx-genie/) to automate and refine your queries.
