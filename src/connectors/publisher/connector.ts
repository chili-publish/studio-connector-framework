import { Connector, Media  }  from '@chili-publish/studio-connectors'

export default class PublisherConnector implements Media.MediaConnector{

    constructor(runtime: Connector.ConnectorRuntimeContext) {        
        this.runtime = runtime;
    }

    runtime: Connector.ConnectorRuntimeContext;

    detail(id: string, context: Connector.Dictionary): Promise<Media.MediaDetail> {
        return Promise.resolve({
            id: "",
            name: "dummy",
            extension: "",
            type: 0,
            width: 0,
            height: 0,
            relativePath: "",
            metaData: {},            
        } as Media.MediaDetail)
    }
    async query(options: Connector.QueryOptions, context: Connector.Dictionary): Promise<Media.MediaPage> {
        return Promise.resolve({
            links: {
                nextPage: ""
            },
            pageSize: 10,
            data: [
                {
                    id: "",
                    name: "dummy",
                    extension: "",
                    type: 0,
                    width: 0,
                    height: 0,
                    relativePath: "",
                    metaData: {},            
                }
            ]
        }) as Promise<Media.MediaPage>;
    }
    async download(id: string, previewType: Media.DownloadType, context: Connector.Dictionary): Promise<Connector.ArrayBufferPointer> {
        try {
            const t = await this.runtime.fetch(`https://chili-publish.com/asset/${id}`, { method:"GET"});
            return t.arrayBuffer;
        } catch (error) {
            this.runtime.logError(error);
        }
    }
    getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
        return [
            {
                name: "MyOption1",
                displayName: "Option 1",
                type: 'text'
            }
        ]
            
        
    }
    getCapabilities(): Media.MediaConnectorCapabilities {
        return {
            detail: true,
            query: true,
            filtering: false
        }
    }
}