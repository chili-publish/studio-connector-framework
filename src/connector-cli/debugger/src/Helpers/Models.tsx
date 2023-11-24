import { ConnectorMetadata, DataModel } from './DataModel';

export const Models: {
  ConnectorMetadata: ConnectorMetadata | null;
  ConnectorInstance: any;
  Auth: DataModel;
  Media: DataModel[];
} = {
  ConnectorMetadata: null,
  ConnectorInstance: null,
  Auth: {
    name: 'Authentication',
    parameters: [
      {
        name: 'HttpHeaders',
        componentType: 'dictionary',
      },
    ],
    isAsync: false,
    invoke: async (values: any[]) => {
      console.log('invoke authentication', values);
      return {};
    },
    returnJson: false,
    returnJsonArray: false,
    returnsImage: false,
    isInvokable: false,
  },
  Media: [
    {
      name: 'download',
      parameters: [
        {
          name: 'id',
          componentType: 'text',
        },
        {
          name: 'downloadType',
          componentType: 'list',
          list: ['thumbnail', 'preview', 'original'],
        },
        {
          name: 'downloadIntent',
          componentType: 'list',
          list: ['attachment', 'inline'],
        },
        {
          name: 'context',
          componentType: 'dictionary',
        },
      ],
      invoke: async (values: any[]) => {
        const result = await Models.ConnectorInstance.download(
          values[0],
          values[1],
          values[2],
          values[3]
        );
        console.table({ request: values, result });
        return result;
      },
      isAsync: true,
      returnJson: false,
      returnJsonArray: false,
      returnsImage: true,
      isInvokable: true,
    },
    {
      isInvokable: true,
      name: 'query',
      parameters: [
        {
          name: 'queryOptions',
          componentType: 'complex',
          complex: [
            {
              name: 'token',
              componentType: 'text',
            },
            {
              name: 'filter',
              componentType: 'text',
            },
            {
              name: 'collection',
              componentType: 'text',
            },
            {
              name: 'pageSize',
              componentType: 'text',
            },
          ],
        },
        {
          name: 'context',
          componentType: 'dictionary',
        },
      ],
      invoke: async (values: any[]) => {
        const result = await Models.ConnectorInstance.query(
          values[0],
          values[1]
        );

        console.table({ request: values, result });

        return result;
      },
      isAsync: true,
      returnJson: true,
      returnJsonArray: false,
      returnsImage: false,
    },
  ],
};
