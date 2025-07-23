import { type Connector, type Media } from "@chili-publish/studio-connectors";

export default class MyConnector implements Media.MediaConnector {
  private runtime: Connector.ConnectorRuntimeContext;

  private log(...messages: string[]) {
    if (!this.runtime.options["logEnabled"]) return;
    this.runtime.logError(messages.join(" "));
  }

  private getFullUrl(url: string): string {
    if (this.runtime.options["baseUrl"]) {
      return this.runtime.options["baseUrl"] + url;
    }
    return url;
  }

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  async query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary,
  ): Promise<Media.MediaPage> {
    this.log(
      "QUERY",
      JSON.stringify(options, null, 4),
      JSON.stringify(context, null, 4),
    );

    return {
      pageSize: options.pageSize ?? 1, // Note: pageSize is not currently used by the UI

      data: [
        {
          id: "5",
          name: context["url"] as string,
          relativePath: "",
          type: 0,
          metaData: {},
        },
      ],

      links: {
        nextPage: "", // Pagination is ignored in this example
      },
    };
  }

  async detail(
    id: string,
    context: Connector.Dictionary,
  ): Promise<Media.MediaDetail> {
    return {
      name: id,
      id: id,
      metaData: {},
      relativePath: "/",
      type: 0,
    };
  }

  async download(
    id: string,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    context: Connector.Dictionary,
  ): Promise<Connector.ArrayBufferPointer> {
    this.log(
      "DOWNLOAD",
      JSON.stringify(context, null, 4),
      JSON.stringify(previewType, null, 4),
      JSON.stringify(intent, null, 4),
    );

    const picture = await this.runtime.fetch(
      this.getFullUrl(context["url"] as string),
      {
        method: "GET",
      },
    );
    return picture.arrayBuffer;
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [
      {
        name: "url",
        displayName: "Image URL",
        type: "text",
      },
    ];
  }

  getCapabilities(): Media.MediaConnectorCapabilities {
    return {
      query: true,
      detail: true,
      filtering: true,
      metadata: false,
    };
  }
}
