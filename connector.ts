import { Connector, Media } from "@chili-publish/studio-connectors";

class BynderConnector implements Media.MediaConnector {
    private runtime: Connector.ConnectorRuntimeContext;

    constructor(runtime: Connector.ConnectorRuntimeContext) {
        this.runtime = runtime;
    }

    /**
     * CENTRALIZED REQUEST HELPER
     */
    private async request(endpoint: string, context: Connector.Dictionary, method: "GET" | "POST" = "GET", body?: string) {

        // 2. Execute actual API Call
        const response = await this.runtime.fetch(endpoint, {
            method,
            headers: {
                "Accept": "application/json"
            },
            body
        });

        if (!response.ok) {
            const err = await response.text;
            throw new Error(`Bynder API Error: ${response.status} - ${err}`);
        }

        return response;
    }

    
    getConfigurationOptions(): Connector.ConnectorConfigValue[] {
        return [
            { name: "collection", displayName: "Collection Name", type: "text" },
            { name: "collectionView", displayName: "View as collections", type: "boolean" }
        ];
    }

    getCapabilities(): Media.MediaConnectorCapabilities {
        return {
              query: true,
              detail: true,
              filtering: true,
              metadata: true,
        };
    }

    async query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {
    let filter = "";
    if (options.filter[0] !== "") {
      filter = options.filter[0];
    }
    if(options.pageSize==1 && !options.collection) {
      const assetId = options.filter[0]
      const asset = await this.detail(assetId, context)
      return {
        pageSize: options.pageSize,
        data: [asset],
        links: {
          nextPage: '',
        },
      }
    }
    let collectionFilter= "";
    if (context.collectionView) {
        context.collection = "";// Ignore collection filter when in collection view mode
    }

    if (options.collection == "/") {
        if (context.collection == null || context.collection === "") {
            collectionFilter = ""; // No filter, fetch all media
        }
        else{
            collectionFilter = context.collection.toString().replace(/\//g, "");
        }
    }
    else {
        collectionFilter = options.collection.toString().replace(/\//g, "");
        context.collection = ""; // Ensure context is updated with collection filter for downstream use
    }

    if (context["collectionView"] && collectionFilter == "") {
        const res = await this.request(`https://${this.runtime.options["baseURL"]}/api/v4/collections/`, context);
        const collections = JSON.parse(res.text);
        const dataFormatted= collections.map((c: any)=> ({
            id: c.id,
            name: c.name,
            relativePath: '/',
            extention: '',
            type: 1, // type 1 for collection, 0 for asset
          }));

        return {
            pageSize: options.pageSize,
            data: dataFormatted,
            links: {
              nextPage: '',
            },
        };
    }


    let cid = "";
    if (collectionFilter !== "") {
        const res = await this.request(`https://${this.runtime.options["baseURL"]}/api/v4/collections/?keyword=${collectionFilter}${filter ? `&keyword=${filter}` : ""}`, context);
        const collections = JSON.parse(res.text);

        if (Array.isArray(collections) && collections.length > 0) {
            cid = collections[0].id;
        }
    }

    const pageNumber = Number(options.pageToken) || 1;
    const resp = await this.request(
      `https://${this.runtime.options["baseURL"]}/api/v4/media/?page=${pageNumber}&limit=${options.pageSize}${cid ? `&collectionId=${cid}` : ""}${filter ? `&keyword=${filter}` : ""}`, context);
    
    const data = JSON.parse(resp.text);

    const dataFormatted= data.map((d)=> ({
      id: d.id,
      name: d.name,
      relativePath: '/',
      extention: d.extension[0],
      type: 0, // type 1 for collection, 0 for asset
      metaData: {width: d.width.toString(), height: d.height.toString(), name: d.name.toString(), brandId: d.brandId.toString()},
    }));

    return {
      pageSize: options.pageSize,
      data: dataFormatted,
      links: {
        nextPage: dataFormatted.length === options.pageSize ? String(pageNumber + 1) : '',
      },
  }
}

    async detail(id: string, context: Connector.Dictionary): Promise<Media.MediaDetail> {
        // Fetch detailed asset info including versions for dimensions
        const res = await this.request(`https://${this.runtime.options["baseURL"]}/api/v4/media/${id}/`, context);
        const asset = JSON.parse(res.text);

        const metadata: Connector.Dictionary = {
            width: asset.width.toString(),
            height: asset.height.toString(),
            name: asset.name,
            brandId: asset.brandId.toString()
        };
        // DYNAMIC METAPROPERTY MAPPING
        // Maps Bynder "metaproperties" to the requested "property_Name" format
        Object.keys(asset)
            .filter((key) => key.startsWith("property_"))
            .forEach((key) => {
                const value = asset[key];
                const name = key.toString().replace(/^property_/, "");
                // Add the value under the raw property name (without prefix), converted to string
                metadata[name] = value.toString();
            });
        return {
            id: asset.id,
            name: asset.name,
            relativePath: "/",
            type: 0,
            metaData: metadata,
        };
    }

        async download(
        id: string,
        previewType: Media.DownloadType,
        intent: Media.DownloadIntent,
        context: Connector.Dictionary
        ): Promise<Connector.ArrayBufferPointer> {

        //get asset details to determine the correct download URL based on previewType
            const res = await this.request(`https://${this.runtime.options["baseURL"]}/api/v4/media/${id}/`, context);
        const asset = JSON.parse(res.text);
        let defaultUrl = "";
        if (previewType != "thumbnail" && previewType != "mediumres") {
            const res = await this.request(`https://${this.runtime.options["baseURL"]}/api/v4/media/${id}/download`, context);
            const asset = JSON.parse(res.text);
            defaultUrl = asset.s3_file;
        }

        switch (previewType) {
            case "thumbnail": {
                const picture = await this.runtime.fetch(`${asset.thumbnails.thul}`, { method: "GET",
                });
                return picture.arrayBuffer;
            }
            case "mediumres": {
                const picture = await this.runtime.fetch(`${asset.thumbnails.webimage}`, { method: "GET",
                });
                return picture.arrayBuffer;
            }
            case "highres": {
                const picture = await this.runtime.fetch(`${defaultUrl}`, { method: "GET",
                });
                return picture.arrayBuffer;
                }
            default: {
                const picture = await this.runtime.fetch(`${defaultUrl}`, { method: "GET",
                });
            return picture.arrayBuffer;
            }
        }
        }
}

export default BynderConnector;