import { Connector, Media } from '@chili-publish/studio-connectors';
import {
  ContenthubEntity,
  ContenthubProperties,
  ContenthubQueryResult,
} from './contenthub.interfaces';

class ContenthubEntryTransformer {
  static assetProperties: { [key: string]: string } = {
    name: 'FileName',
    properties: 'FileProperties',
  };
  static assetRelations: { [key: string]: string } = {};

  static assetToMedia(
    item: ContenthubEntity,
    locale: string,
    relatedEntities: ContenthubEntity[] = []
  ): Media.Media {
    const { properties } = (item.properties[
      this.assetProperties.properties
    ] || { properties: {} }) as {
      properties: { extension?: string };
    };
    const id = JSON.stringify({
      id: item.id,
      identifier: item.identifier,
    });

    return {
      id: id,
      name: item.properties[this.assetProperties.name] as string,
      type: 0,
      // TODO: to be defined
      relativePath: '/',
      extension: properties.extension ? properties.extension.toLowerCase() : '',
      metaData: this.getMetadataFromEntity(item, locale, relatedEntities),
    };
  }

  static assetToMediaDetail(
    item: ContenthubEntity,
    locale: string,
    relatedEntities: ContenthubEntity[] = []
  ): Media.MediaDetail {
    const { properties } = (item.properties[
      this.assetProperties.properties
    ] as {
      properties: { width: string; height: string };
    }) || { properties: { width: '0', height: '0' } };
    const media = this.assetToMedia(item, locale, relatedEntities);
    return {
      ...media,
      width: parseInt(properties.width),
      height: parseInt(properties.height),
    };
  }

  static getMetadataFromEntity(
    item: ContenthubEntity,
    locale: string,
    relatedEntities: ContenthubEntity[],
    fromRelation?: string
  ) {
    let metadata = {} as Connector.Dictionary;
    /**
     * Set the properties on the metadata bag
     */
    const setPropertiesOnMetadata = (
      properties: ContenthubProperties,
      pre = ''
    ) => {
      Object.keys(properties).forEach((property) => {
        if (!properties[property]) {
          return;
        }
        if (typeof properties[property] == 'string') {
          metadata[`${pre}${property}`] = properties[property];
        } else if (typeof properties[property] == 'number') {
          metadata[`${pre}${property}`] = `${properties[property]}`;
        } else if (
          typeof properties[property] == 'object' &&
          properties[property][locale]
        ) {
          metadata[`${pre}${property}`] = properties[property][locale];
        }
      });
    };

    setPropertiesOnMetadata(
      item.properties,
      fromRelation && `${fromRelation}.`
    );

    /**
     * Set the relation properties on the metadata bag
     */
    if (item.relations) {
      Object.keys(item.relations).forEach((relation) => {
        const rel =
          item.relations[relation].parent ||
          item.relations[relation].parents ||
          item.relations[relation].child ||
          item.relations[relation].children;

        if (!rel) {
          return;
        }
        const relInfo = Array.isArray(rel) ? rel[0] : rel;
        if (!relInfo) {
          return;
        }
        let relatedEntityId = parseInt(relInfo.href.split('/').pop());
        const relatedEntity = relatedEntities.find(
          (e) => e.id == relatedEntityId
        );
        if (relatedEntity && !fromRelation) {
          metadata = {
            ...metadata,
            ...this.getMetadataFromEntity(
              relatedEntity,
              locale,
              relatedEntities,
              relation
            ),
          };
        } else if (relInfo.properties) {
          setPropertiesOnMetadata(relInfo.properties, `${relation}.`);
        }
      });
    }
    /**
     * Set the relation paths on the metadata bag
     */
    if (item.related_paths) {
      Object.keys(item.related_paths).forEach((path) => {
        if (
          item.related_paths[path].length &&
          item.related_paths[path][0].length
        ) {
          const related =
            item.related_paths[path][0][item.related_paths[path][0].length - 1];
          metadata[path] =
            related.values[locale] || Object.values(related.values)[0];

          let relatedEntityId = parseInt(related.entity.split('/').pop());
          const relatedEntity = relatedEntities.find(
            (e) => e.id == relatedEntityId
          );
          if (relatedEntity && !fromRelation) {
            metadata = {
              ...metadata,
              ...this.getMetadataFromEntity(
                relatedEntity,
                locale,
                relatedEntities,
                path
              ),
            };
          }
        } else if (item.relations[path]) {
        }
      });
    }
    return metadata;
  }
}

export default class ContenthubConnector implements Media.MediaConnector {
  static Constants = {
    standardRepository: 'M.Content.Repository.Standard',
    approvedStatus: 'M.Final.LifeCycle.Status.Approved',
    defaultLocale: 'en-US',
  };
  private runtime: Connector.ConnectorRuntimeContext;
  identifierIdMapping: { [key: string]: number } = {};
  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }
  private get relatedMetadataRelations() {
    const runtimeOption = this.runtime.options[
      'relationMetadataIncludes'
    ] as string;
    if (!runtimeOption || !runtimeOption.length) {
      return [];
    }
    return runtimeOption.split(',');
  }

  private get baseUrl() {
    const root = (this.runtime.options['BASE_URL'] as string) || '';
    return root.endsWith('/') ? root : `${root}/`;
  }

  query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {
    const skip = Number(options.pageToken) || 0;
    const locale = this.getLocale(context);
    return this.getContenthubSearchQuery(options.filter || [], context).then(
      (query) => {
        return this.contenthubQuery(query, {
          skip,
          cultures: [locale],
        }).then((res) => {
          return this.getRelatedMetadataEntities(res.items, locale).then(
            (related) => {
              return {
                pageSize: options.pageSize,
                data: res.items.map((item) => {
                  const data = ContenthubEntryTransformer.assetToMedia(
                    item,
                    locale,
                    related
                  );
                  return data;
                }),
                links: {
                  nextPage: res.next ? `${skip + options.pageSize}` : '',
                },
              };
            }
          );
        });
      }
    );
  }
  detail(
    id: string,
    context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
    const locale = this.getLocale(context);

    const { identifier } = JSON.parse(id);
    return this.fetchEntity(identifier, locale).then((data) => {
      return this.getRelatedMetadataEntities([data], locale).then((related) =>
        ContenthubEntryTransformer.assetToMediaDetail(data, locale, related)
      );
    });
  }
  download(
    id: string,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    const { identifier } = JSON.parse(id);

    return this.runtime
      .fetch(
        `${this.baseUrl}api/entities/identifier/${identifier}?members=renditions`,
        {
          method: 'GET',
        }
      )
      .then((response) => {
        if (!response.ok) {
          throw new ConnectorHttpError(
            response.status,
            `Contenthub DAM: Download failed ${response.status} - ${response.statusText}`
          );
        }
        const asset = JSON.parse(response.text);
        let assetUrl = asset.renditions.preview[0].href;

        if (previewType === 'thumbnail' && asset.renditions.thumbnail?.length) {
          assetUrl = asset.renditions.thumbnail[0].href;
        } else if (
          previewType === 'mediumres' &&
          asset.renditions.bigthumbnail?.length
        ) {
          assetUrl = asset.renditions.thumbnail[0].href;
        }
        return this.runtime
          .fetch(assetUrl, {
            method: 'GET',
          })
          .then((result) => {
            if (!result.ok) {
              throw new ConnectorHttpError(
                result.status,
                `Acquia DAM: Download failed ${result.status} - ${result.statusText}`
              );
            }
            return result.arrayBuffer;
          });
      });
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [
      {
        name: 'approvedAssets',
        displayName: 'Show only approved assets',
        type: 'boolean',
      },
      {
        name: 'query',
        displayName: 'Search Query',
        type: 'text',
      },
      {
        name: 'locale',
        displayName: 'Locale',
        type: 'text',
      },
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

  private getLocale(context: Connector.Dictionary) {
    return (
      (context.locale as string) || ContenthubConnector.Constants.defaultLocale
    );
  }

  private async fetchEntity(ident: string | number, locale?: string) {
    let path =
      typeof ident === 'string'
        ? `${this.baseUrl}api/entities/identifier/${ident}`
        : `${this.baseUrl}api/entities/${ident}`;
    if (locale) {
      path += `?culture=${locale}`;
    }
    return this.runtime
      .fetch(path, {
        method: 'GET',
      })
      .then((response) => {
        if (!response.ok) {
          throw new ConnectorHttpError(
            response.status,
            `Contenthub DAM: Detail failed ${response.status} - ${response.statusText}`
          );
        }
        return JSON.parse(response.text) as ContenthubEntity;
      });
  }

  private async getContenthubSearchQuery(
    filters: string[],
    context: Connector.Dictionary
  ) {
    const query = (context['query'] as string) ?? null;

    let queryString = `Definition.Name=="M.Asset"`;
    if (filters && filters.length && filters[0].length) {
      // Check if id is in filters
      try {
        const temp = JSON.parse(filters[0]);
        queryString += ` AND FullText == "id=${temp.id}"`;
      } catch (error) {
        queryString += ` AND FullText == "${filters[0]}"`;
      }
    }

    const idenifiers = await this.getEntityIdsFromIdentifiers([
      ContenthubConnector.Constants.standardRepository,
      ContenthubConnector.Constants.approvedStatus,
    ]);
    queryString += `AND Parent("ContentRepositoryToAsset").id == ${
      idenifiers[ContenthubConnector.Constants.standardRepository]
    }`;
    if (context['approvedAssets'] as boolean) {
      queryString += `AND Parent("FinalLifeCycleStatusToAsset").id == ${
        idenifiers[ContenthubConnector.Constants.approvedStatus]
      }`;
    }
    if (query) {
      queryString += `AND (${query})`;
    }
    return queryString;
  }

  private async contenthubQuery(
    query: string,
    {
      members,
      take,
      skip,
      order,
      sort,
      cultures,
    }: {
      members?: string[];
      take?: number;
      skip?: number;
      order?: string;
      sort?: string;
      cultures?: string[];
    }
  ) {
    let queryingRoute = `api/entities/query?query=${query}`;
    if (members) {
      queryingRoute += `&members=${members.join(',')}`;
    }
    if (cultures && cultures.length) {
      queryingRoute += `&culture=${cultures.join(',')}`;
    }

    const otherQueryParams = {
      skip,
      sort,
      order,
      take,
    };
    Object.keys(otherQueryParams).forEach((key) => {
      if (otherQueryParams[key]) {
        queryingRoute += `&${key}=${otherQueryParams[key]}`;
      }
    });

    const res = await this.runtime.fetch(`${this.baseUrl}${queryingRoute}`, {
      method: 'GET',
    });

    if (!res.ok) {
      throw new ConnectorHttpError(
        res.status,
        `Contenthub DAM: Query failed ${res.status} - ${res.statusText}`
      );
    }
    return JSON.parse(res.text) as ContenthubQueryResult;
  }

  private fetchEntityIdFromIdentier = async (identifier) => {
    const entity = await this.runtime.fetch(
      `${this.baseUrl}api/entities/identifier/${identifier}?members=id`,
      { method: 'GET' }
    );
    if (entity.ok) {
      return JSON.parse(entity.text).id;
    }
  };

  private getEntityIdsFromIdentifiers = async (identifiers: string[]) => {
    const needToBeFetched = identifiers.filter(
      (i) => !this.identifierIdMapping[i]
    );

    await Promise.all(
      needToBeFetched.map((ident) =>
        this.fetchEntityIdFromIdentier(ident).then((i) => {
          this.identifierIdMapping[ident] = i;
        })
      )
    );
    return identifiers.reduce<{ [key: string]: number }>(
      (result, identifier) => ({
        ...result,
        [identifier]: this.identifierIdMapping[identifier],
      }),
      {}
    );
  };

  /**
   * Get the related metadata entities that is provided from the runtime action relationMetadataIncludes
   * Its checks on the relations & related paths.
   * When provided in the relations the entity needs to be included
   */
  private getRelatedMetadataEntities = async (
    entities: ContenthubEntity[],
    locale
  ) => {
    const relationsToLoad = this.relatedMetadataRelations;

    if (!relationsToLoad.length) {
      return [];
    }
    const entityIds = entities.flatMap((e) => {
      if (!e.related_paths) {
        return [];
      }
      return relationsToLoad
        .map((relation) => {
          if (
            !e.related_paths[relation] ||
            !e.related_paths[relation].length ||
            !e.related_paths[relation][0].length
          ) {
            // If the related path entry not exist try to check on the relations
            if (e.relations[relation]) {
              const item =
                e.relations[relation].parent ||
                e.relations[relation].parents ||
                e.relations[relation].child ||
                e.relations[relation].children;
              const entry = item && (Array.isArray(item) ? item : [item])[0];
              return entry && parseInt(entry.href.split('/').pop());
            }

            return null;
          }
          const path =
            e.related_paths[relation][0][
              e.related_paths[relation][0].length - 1
            ].entity;
          return parseInt(path.split('/').pop());
        })
        .filter((i) => i !== null);
    });
    if (!entityIds.length) {
      return [];
    }

    return this.contenthubQuery(
      entityIds.map((e) => `FullText == "id=${e}"`).join(' OR '),
      {
        take: 100,
        cultures: [locale],
      }
    ).then((res) => res.items);
  };
}
