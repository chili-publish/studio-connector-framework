import { Connector, Media  }  from '@chili-publish/studio-connectors'

export default class AcquiaConnector implements Media.MediaConnector{
    
    constructor(runtime: Connector.ConnectorRuntimeContext) {        
        this.runtime = runtime;
    }

    runtime: Connector.ConnectorRuntimeContext;

    detail(id: string, context: Connector.Dictionary): Promise<Media.MediaDetail> {
        return Promise.resolve({
            "name": "dummy",
            "extension": ""
        } as Media.MediaDetail)
    }
    async query(options: Connector.QueryOptions, context: Connector.Dictionary): Promise<Media.MediaPage> {
        try {
            const t = await this.runtime.fetch("https://chili-publish.com/", { method:"GET"});
            var data = JSON.parse(t.text);

            return {
                pageSize: 10,
                data: data.items.map((item) => {
                    return {
                        id: item.id,
                        name: item.name,
                        relativePath: item.url,
                        type: 0,
                        metaData: item.context
                    }
                }),
                links: {
                    nextPage: ""
                }
            };

        } catch (error) {
            this.runtime.logError(error);
        }
    }
    async download(id: string, previewType: Media.DownloadType, context: Connector.Dictionary): Promise<Connector.ArrayBufferPointer> {
        try {
            // random string
            // var r = Math.random().toString(36).substring(7);
            // this.runtime[r] = "test";
            const t = await Promise.resolve({arrayBuffer: {id:"{}", bytes: 1000}});
            return t.arrayBuffer;
        } catch (error) {
            this.runtime.logError(error);
        }
    }
    upload(name: string, blob: Connector.ArrayBufferPointer, context: Connector.Dictionary): Promise<Media.Media> {
        throw new Error('Method not implemented.')
    }
    remove(id: string, context: Connector.Dictionary): Promise<boolean> {
        throw new Error('Method not implemented.')
    }
    copy(id: string, newName: string, context: Connector.Dictionary): Promise<Media.Media> {
        throw new Error('Method not implemented.')
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
    getCapabilities(): Connector.ConnectorCapabilities {
        return {
            detail: true,
            query: true,
            copy: false,
            remove: false,
            filtering: false,
            upload: false
        }
    }
}