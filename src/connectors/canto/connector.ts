import { Connector, Media } from "@chili-publish/studio-connectors";
type CantoItem = CantoFolder | CantoAlbum;

type CantoFolder = {
  id: string,
  idPath: string,
  name: string,
  namePath: string
  scheme: "folder",
  size: number,
  children: CantoItem[]
}

type CantoAlbum = {
  id: string,
  idPath: string,
  name: string,
  namePath: string,
  size: number,
  scheme: "album"
}

type ContextOptions = {
  startindex: number,
  pageSize: number,
  filter: string,
  collection: any,
  query: string,
  tagFilter: string,
  albumFilter: string,
  folderView: boolean,
  approved: boolean,
}

export default class MyConnector implements Media.MediaConnector {

  private runtime: Connector.ConnectorRuntimeContext;

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  async query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {

    // Hold context options
    const contextOptions = {
      startindex: Number(options.pageToken) || 0,
      pageSize: options.pageSize || 0,
      filter: options.filter[0] ?? '',
      collection: options.collection ?? null,
      query: context['query'] ?? '',
      tagFilter: context['tagFilter'] ?? '',
      albumFilter: context['albumFilter'] ?? '',
      folderView: context['folderView'] ?? false,
      approved: context['approved'] ?? false,
    } as ContextOptions;

    // query before download check
    if (checkQueryBeforeDownload(options)) {
      return this.handleQueryBeforeDownload(contextOptions);
    }

    // Filter query (left-hand panel)
    if (contextOptions.filter != '') {
      return this.handleFilterQuery(contextOptions);
    }

    // Folder browsing
    if (contextOptions.folderView) {
      return this.handleFolderBrowsing(contextOptions);
    }

    // Search query
    return this.handleSearchQuery(contextOptions);
  }
  async detail(
    id: string,
    context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
    const url = `${this.runtime.options["baseURL"]}/api/v1/image/${id}`;
    const resp = await this.runtime.fetch(url, {
      method: "GET"
    });

    if (!resp.ok) {
      throw new ConnectorHttpError(
        resp.status,
        `Canto: Detail failed ${resp.status} - ${resp.statusText}`
      );
    }
    const data = JSON.parse(resp.text);

    return {
        id: data.id,
        name: data.name,
        relativePath: "",
        type: 0,
        metaData: parseMetadata(data),
        width: Number(data.width),
        height: Number(data.height)
    };
  }
  async download(
    id: string,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {


    if (context["failNotApproved"]) {

      const url = `${this.runtime.options["baseURL"]}/api/v1/image/${id}`;

      const resp = await this.runtime.fetch(url, {
        method: "GET"
      });

      if (!resp.ok) {
        throw new ConnectorHttpError(
          resp.status,
          `Canto: Download failed ${resp.status} - ${resp.statusText}`
        );
      }

      const data = JSON.parse(resp.text);

      if (data.approvalStatus != "Approved") {
        throw new Error("Image Not Approve");
      }

    }

    this.runtime.logError(id)

    switch (previewType) {
      case "thumbnail": {
        const picture = await this.runtime.fetch(`${this.runtime.options["baseURL"]}/api_binary/v1/image/${id}/preview/240`, { method: "GET" });
        return picture.arrayBuffer;
      }
      case "mediumres": {
        const picture = await this.runtime.fetch(`${this.runtime.options["baseURL"]}/api_binary/v1/image/${id}/preview/400`, { method: "GET" });
        return picture.arrayBuffer;
      }
      case "highres": {
        const picture = await this.runtime.fetch(`${this.runtime.options["baseURL"]}/api_binary/v1/image/${id}/preview/400`, { method: "GET" });
        return picture.arrayBuffer;
      }
      case "fullres": {
        const picture = await this.runtime.fetch(`${this.runtime.options["baseURL"]}/api_binary/v1/image/${id}/PNG`, { method: "GET" });
        return picture.arrayBuffer;
      }
      case "original": {
        const picture = await this.runtime.fetch(`${this.runtime.options["baseURL"]}/api_binary/v1/image/${id}`, { method: "GET" });
        return picture.arrayBuffer;
      }
      default: {
        const picture = await this.runtime.fetch(`${this.runtime.options["baseURL"]}/api_binary/v1/image/${id}/preview/240`, { method: "GET" });
        return picture.arrayBuffer;
      }
    }
  }
  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [
      {
        name: "folderView",
        displayName: "Folder View (keyword and tag will be ignored)",
        type: "boolean"
      },
      {
        name: "query",
        displayName: "Keyword filter",
        type: "text"
      }, {
        name: "tagFilter",
        displayName: "Tag filter",
        type: "text"
      },
      {
        name: "albumFilter",
        displayName: "Album filter",
        type: "text"
      },
      {
        name: "approved",
        displayName: "Only show approved",
        type: "boolean"
      },
      {
        name: "failNotApproved",
        displayName: "Fail Loading and Output if not approved",
        type: "boolean"
      }];
  }
  getCapabilities(): Media.MediaConnectorCapabilities {
    return {
      query: true,
      detail: true,
      filtering: true,
      metadata: true,
    };
  }
  // custom functions
  buildSearchURL(keyword: string, tag: string, album: string, approved: boolean, pageSize: number, startIndex: number) {
    let url = `${this.runtime.options["baseURL"]}/api/v1/search?scheme=image&limit=${pageSize}&start=${startIndex * pageSize}`;
    // Check if there's an album provided first, that changes the base endpoint
    if (album != '') {
      url = `${this.runtime.options["baseURL"]}/api/v1/album/${album}?scheme=image&limit=${pageSize}&start=${startIndex * pageSize}`;
    }
    if (keyword != '') {
      url += `&keyword=${keyword}`;
    }
    if (tag != '') {
      url += `&tags=${tag}`;
    }
    if (approved) {
      url += `&approval=approved`;
    }

    return url;
  }

  async handleQueryBeforeDownload(contextOptions: ContextOptions): Promise<Media.MediaPage> {
    const id = contextOptions.filter;
    const url = `${this.runtime.options["baseURL"]}/api/v1/image/${id}`;
    const resp = await this.runtime.fetch(url, {
      method: "GET"
    });

    if (!resp.ok) {
      throw new ConnectorHttpError(
        resp.status,
        `Canto: Query failed ${resp.status} - ${resp.statusText}`
      );
    }

    const data = JSON.parse(resp.text);

    // For now, doesn't use buildMediaPage, as this is its own unique case
    return {
      pageSize: contextOptions.pageSize,
      data: [{
        id: contextOptions.filter,
        name: "",
        relativePath: "",
        type: 0,
        metaData: parseMetadata(data),
      }],
      links: {
        nextPage: ""
      }
    }
  }

  async handleFolderBrowsing(contextOptions: ContextOptions): Promise<Media.MediaPage> {
    this.runtime.logError("BROSWER");
    this.runtime.logError(JSON.stringify(contextOptions));

    const [_, ...pathParts] = (contextOptions.collection ?? "/")
      .split("/") as string[];

    if (pathParts == null) {
      throw new Error("pathParts was null");
      // super rare with behavior - not sure is possible, but do something about it
    }

    const pathPartsClean = pathParts.filter(s => s).filter(s => s != "..");

    this.runtime.logError(JSON.stringify(pathParts));

    const currentCantoItem = await this.getCurrentCantoItem(pathPartsClean);
    const previousPath = (currentCantoItem.namePath == "/") ? null : currentCantoItem.namePath.replace(currentCantoItem.name, "/");

    this.runtime.logError(JSON.stringify(currentCantoItem));
    this.runtime.logError(previousPath);

    return currentCantoItem.scheme == "folder"
      ? buildMediaPage(
        contextOptions,
        formatData(currentCantoItem.children, contextOptions.pageSize, previousPath, true),
      )
      : this.handleSearchAlbum(contextOptions, currentCantoItem);
  }

  async getCurrentCantoItem(pathParts: Array<string>): Promise<CantoItem> {

    this.runtime.logError("getCurrentCantoItem");
    let url = `${this.runtime.options["baseURL"]}/api/v1/tree?sortBy=scheme&sortDirection=ascending&layer=-1`;
    const resp = await this.runtime.fetch(url, {
      method: "GET"
    });


    if (!resp.ok) {
      throw new ConnectorHttpError(
        resp.status,
        `Canto: Query failed ${resp.status} - ${resp.statusText}`
      );
    }

    const rootCantoItems = JSON.parse(resp.text).results as CantoItem[];
    const toplevelFolder: CantoFolder = {
      children: rootCantoItems,
      id: "",
      idPath: "/",
      namePath: "/",
      name: "/",
      scheme: "folder",
      size: rootCantoItems.length,
    };

    return pathParts.reduce(
      (currentCantoFolder: CantoFolder, pathPart: string, index) => {
        const matchCantoItem = currentCantoFolder.children
          .filter((item) => item.scheme == "folder" || item.scheme == "album")
          .find((item) => item.name == pathPart);

        if (!matchCantoItem)
          throw new Error(`Could not find item with name: ${pathPart} on ${pathParts.join("/")}`);

        if (pathParts.length == index + 1) return matchCantoItem;

        if (matchCantoItem.scheme == "album")
          throw new Error(`Expecting folder but got album at ${pathPart} path on ${pathParts.join("/")}`);

        return matchCantoItem;
      },
      toplevelFolder,
    );
  }

  async handleSearchAlbum(contextOptions: ContextOptions, cantoAlbum: CantoAlbum): Promise<Media.MediaPage> {
    // The album search endpoint used here normally behaves very differently to the one used everywhere else. I've replaced it, but keeping the old one in comments for now
    let url = this.buildSearchURL('', '', cantoAlbum.id, false, contextOptions.pageSize, contextOptions.startindex);
    // let url = `${this.runtime.options["baseURL"]}/rest/search/album/${id}?aggsEnabled=true&sortBy=created&sortDirection=false&size=${options.pageSize}&type=image&start=${startIndex}`;

    const resp = await this.runtime.fetch(url, {
      method: "GET"
    });

    if (resp.ok) {


      this.runtime.logError(JSON.parse(resp.text));

      const imagesFound = JSON.parse(resp.text).results;

      const dataFormatted = formatData(
        imagesFound ?? [],
        contextOptions.pageSize,
        cantoAlbum.namePath.replace(cantoAlbum.name, ""),
      )

      return buildMediaPage(contextOptions, dataFormatted);
    }

    throw new ConnectorHttpError(
      resp.status,
      `Canto: Query failed ${resp.status} - ${resp.statusText}`
    );
  }

  async handleSearchQuery(contextOptions: ContextOptions): Promise<Media.MediaPage> {
    const albums = (contextOptions.albumFilter as string).split("&");
    let dataFormatted = [];

    for (let i = 0; i < albums.length; i++) {
      let url = this.buildSearchURL(
        contextOptions.query as string,
        contextOptions.tagFilter as string,
        albums[i].trim(),
        contextOptions.approved as boolean,
        contextOptions.pageSize,
        contextOptions.startindex
      );
      const resp = await this.runtime.fetch(url, {
        method: "GET"
      });

      if (resp.ok) {
        const data = (JSON.parse(resp.text)).results;
        if (data) {
          dataFormatted = dataFormatted.concat(formatData(data, contextOptions.pageSize));
        }
      } else {
        throw new ConnectorHttpError(
          resp.status,
          `Canto: Query failed ${resp.status} - ${resp.statusText}`
        );
      }
    }
    return buildMediaPage(contextOptions, dataFormatted);

  }

  async handleFilterQuery(contextOptions: ContextOptions): Promise<Media.MediaPage> {
    let url = this.buildSearchURL(
      contextOptions.filter as string,
      contextOptions.tagFilter as string,
      contextOptions.albumFilter as string,
      contextOptions.approved as boolean,
      contextOptions.pageSize,
      contextOptions.startindex
    );
    const resp = await this.runtime.fetch(url, {
      method: "GET"
    });

    if (resp.ok) {
      const data = (JSON.parse(resp.text)).results;
      const dataFormatted = formatData(data, contextOptions.pageSize);
      return buildMediaPage(contextOptions, dataFormatted);
    }
    throw new ConnectorHttpError(
      resp.status,
      `Canto: Query failed ${resp.status} - ${resp.statusText}`
    );
  }
}

function toDictionary(obj: Record<string, any>): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = "";
    } else if (typeof value === "boolean") {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value.join(",");
    } else if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (typeof value === "object") {
      result[key] = JSON.stringify(value);
    } else if (typeof value === "symbol" || typeof value === "bigint" || typeof value === "function") {
      result[key] = value.toString();
    } else {
      result[key] = String(value);
    }
  }

  return result;
}

function checkQueryBeforeDownload(options: Connector.QueryOptions): boolean {
  return options.pageSize === 1 && !options.collection;
}

function parseMetadata(data: any): Record<string, string | boolean> {
  return {
    owner: data.ownerName ?? '',
    resolution: data.dpi ?? '',
    approvalStatus: data.approvalStatus ?? '',
    width: data.width ?? '',
    height: data.height ?? '',
    ...toDictionary(data.default),
    ...toDictionary(data.additional)
  };
}

function formatData(results: any[], pageSize: number, previousPath?: string, isFolder?: boolean): Array<any> {

  // I don't really like this being a whole if/else block
  let dataFormatted;
  if (isFolder) {
    dataFormatted = results.filter(d => d.scheme == "folder" || d.scheme == "album").map(d => ({
      id: d.id,
      name: d.name,
      relativePath: d.namePath,
      type: 1,
      metaData: {}
    })) as Array<any>;
  }
  else {
    dataFormatted = results.map(d => ({
      id: d.id,
      name: d.name,
      relativePath: "/",
      type: 0,
      metaData: {}
    })) as Array<any>;
  }

  return !previousPath
    ? dataFormatted
    : [
      {
        id: "back",
        name: "../",
        relativePath: previousPath + "/",
        type: 1,
        metaData: {},
      },
      ...dataFormatted,
    ];
}

function buildMediaPage(contextOptions: ContextOptions, data: any[]): Media.MediaPage {
  // I'm not sure if having a static pagination string in the nextPage link for everything will break things? I don't think this ever explicitly needs to be blank
  return {
    pageSize: contextOptions.pageSize,
    data: data,
    links: {
      nextPage: `${data.length < contextOptions.pageSize ? '' : contextOptions.startindex + 1}`
    }
  }
}