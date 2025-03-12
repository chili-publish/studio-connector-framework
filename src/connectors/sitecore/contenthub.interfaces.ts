export type ContenthubDataOptionValue = {
  identifier: string;
  labels: Record<string, string>;
};
export type ContenthubProperty =
  | string
  | number
  | boolean
  | null
  | ContenthubDataOptionValue
  | any;

export type ContenthubProperties = Record<string, ContenthubProperty>;
export interface ContenthubEntity {
  properties: ContenthubProperties;
  relations: Record<string, any>;
  id: number;
  identifier: string;
  version: number;
  renditions: Record<
    'downloadOriginal' | 'thumbnail' | string,
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
