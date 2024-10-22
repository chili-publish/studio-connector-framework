export interface ContenthubEntity {
  properties: Record<string, unknown>;
  relations: Record<string, any>;
  id: number;
  identifier: string;
  version: number;
  renditions: Record<
    "downloadOriginal" | "thumbnail" | string,
    { href: string }[]
  >;
  related_paths?: Record<
    string,
    {
      values: {
        [key: string]: string;
      };
      entity: string;
      definition: string;
    }[][]
  >;
}

export interface ContenthubQueryResult {
  items: Array<ContenthubEntity>;
  total_items: number;
  next?: {
    href: string;
  };
  prev?: {
    href: string;
  };
  returned_items: number;
  offset: number;
}
