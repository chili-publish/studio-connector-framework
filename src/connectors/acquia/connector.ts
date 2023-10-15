import * as Conn from '@chili-publish/studio-connectors/types/Connector.Shared'
import * as Media from '@chili-publish/studio-connectors/types/MediaConnector'

export default class AcquiaConnector implements Media.MediaConnector{
    /**
     *
     */
    constructor(runtime: Conn.ConnectorRuntimeContext) {        
        this.runtime = runtime;
    }

    runtime: Conn.ConnectorRuntimeContext;

    detail(id: string, context: Conn.Dictionary): Promise<Media.MediaDetail> {
        throw new Error('Method not implemented.')
    }
    async query(options: Conn.QueryOptions, context: Conn.Dictionary): Promise<Media.MediaPage> {
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
    async download(id: string, previewType: Media.DownloadType, context: Conn.Dictionary): Promise<Conn.ArrayBufferPointer> {
        try {
            const t = await this.runtime.fetch("https://chili-publish.com/", { method:"GET"});
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
        throw new Error('Method not implemented.')
    }
    getCapabilities(): Conn.ConnectorCapabilities {
        throw new Error('Method not implemented.')
    }

}