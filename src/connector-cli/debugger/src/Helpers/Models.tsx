import {
  ConnectorMetadata,
  InvokableDataModel,
  SettableDataModel,
} from './DataModel';

export const Models: {
  ConnectorMetadata: ConnectorMetadata | null;
  ConnectorInstance: any;
  Configuration: SettableDataModel[];
  Media: InvokableDataModel[];
  updateConfiguration: (name: 'headers' | 'options', values: unknown) => void;
} = {
  ConnectorMetadata: null,
  ConnectorInstance: null,
  updateConfiguration: () => ({}),
  Configuration: [
    {
      name: 'headers',
      parameters: [
        {
          name: 'AuthenticationHeader',
          componentType: 'dictionary',
          rectrictModification: true,
        },
        {
          name: 'HttpHeaders',
          componentType: 'dictionary',
        },
      ],
      set: (values: any[]) => {
        Models.updateConfiguration('headers', {
          authorization: {
            name: Object.keys(values[0])[0],
            value: Object.values(values[0])[0],
          },
          other: Object.entries(values[1] ?? []).map((h) => ({
            name: h[0],
            value: h[1],
          })),
        });
        window.alert('Settings were applied');
      },
    },
    {
      name: 'Runtime options',
      parameters: [
        {
          name: 'options',
          componentType: 'dictionary',
        },
      ],
      set: async (values: any[]) => {
        Models.updateConfiguration('options', values[0]);
        window.alert('Settings were applied');
      },
    },
  ],
  Media: [
    {
      name: 'query',
      parameters: [
        {
          name: 'queryOptions',
          componentType: 'complex',
          complex: [
            {
              name: 'filter',
              componentType: 'list',
            },
            {
              name: 'collection',
              componentType: 'text',
            },
            {
              name: 'pageToken',
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
          values[0] || {},
          values[1] || {}
        );

        console.table({ request: values, result });

        return result;
      },
      returnJson: true,
      returnJsonArray: false,
      returnsImage: false,
    },
    {
      name: 'detail',
      parameters: [
        {
          name: 'id',
          componentType: 'text',
        },
        {
          name: 'context',
          componentType: 'dictionary',
        },
      ],
      invoke: async (values: any[]) => {
        const result = await Models.ConnectorInstance.detail(
          values[0] || '',
          values[1] || {}
        );

        console.table({ request: values, result });

        return result;
      },
      returnJson: true,
      returnJsonArray: false,
      returnsImage: false,
    },
    {
      name: 'download',
      parameters: [
        {
          name: 'id',
          componentType: 'text',
        },
        {
          name: 'downloadType',
          componentType: 'select',
          options: ['thumbnail', 'mediumres', 'highres', 'fullres', 'original'],
        },
        {
          name: 'downloadIntent',
          componentType: 'select',
          options: ['web', 'print', 'animation'],
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
      returnJson: false,
      returnJsonArray: false,
      returnsImage: true,
    },
  ],
};
