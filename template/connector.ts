import { Connector, Media  }  from '@chili-publish/studio-connectors'

export default class YourConnector implements Media.MediaConnector{

    constructor(runtime: Conn.ConnectorRuntimeContext) {        
        this.runtime = runtime;
    }

    runtime: Conn.ConnectorRuntimeContext;

    detail(id: string, context: Conn.Dictionary): Promise<Media.MediaDetail> {
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
    async query(options: Conn.QueryOptions, context: Conn.Dictionary): Promise<Media.MediaPage> {
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
    async download(id: string, previewType: Media.DownloadType, context: Conn.Dictionary): Promise<Conn.ArrayBufferPointer> {
        try {
            const t = await this.runtime.fetch(`https://chili-publish.com/asset/${id}`, { method:"GET"});
            return t.arrayBuffer;
        } catch (error) {
            this.runtime.logError(error);
        }
    }
    upload(name: string, blob: Conn.ArrayBufferPointer, context: Conn.Dictionary): Promise<Media.Media> {
        throw new Error('Method not implemented.')
    }
    remove(id: string, context: Conn.Dictionary): Promise<boolean> {
        throw new Error('Method not implemented.')
    }
    copy(id: string, newName: string, context: Conn.Dictionary): Promise<Media.Media> {
        throw new Error('Method not implemented.')
    }
    getConfigurationOptions(): Conn.ConnectorConfigOptions | null {
        return [
            {
                name: "MyOption1",
                displayName: "Option 1",
                type: 'text'
            }
        ]
            
        
    }
    getCapabilities(): Conn.ConnectorCapabilities {
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