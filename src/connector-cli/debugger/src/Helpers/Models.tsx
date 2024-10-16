import {
  UpdateHttpParamsSettings,
  UpdateRuntimeOptionsSettings,
  UpdateSettingsFn,
} from '../core/useConnectorSettings';
import {
  ConnectorMetadata,
  InvokableDataModel,
  SettableDataModel,
} from './DataModel';

export const Models: {
  ConnectorMetadata: ConnectorMetadata | null;
  ConnectorInstance: any;
  Settings: SettableDataModel[];
  Media: InvokableDataModel[];
  Data: InvokableDataModel[];
  updateSettings: UpdateSettingsFn;
} = {
  ConnectorMetadata: null,
  ConnectorInstance: null,
  updateSettings: () => ({}),
  Settings: [
    {
      name: 'http-params',
      displayName: 'HTTP Params',
      parameters: [
        {
          name: 'headers',
          componentType: 'complex',
          complex: [
            {
              name: 'authorization',
              componentType: 'dictionary',
              rectrictModification: true,
            },
            {
              name: 'other',
              componentType: 'dictionary',
            },
          ],
        },
        {
          name: 'query',
          componentType: 'dictionary',
        },
      ],
      set: ([
        headers,
        queryParams,
      ]: Parameters<UpdateHttpParamsSettings>[1]) => {
        console.debug('Set "http-params"', headers, queryParams);
        Models.updateSettings('http-params', [headers, queryParams]);
        window.alert('Settings were applied');
      },
    },
    {
      name: 'Runtime options',
      parameters: [
        {
          name: 'runtime-options',
          componentType: 'dictionary',
        },
      ],
      set: async (values: Parameters<UpdateRuntimeOptionsSettings>[1]) => {
        console.debug('Set "Runtime options"', values);
        Models.updateSettings('runtime-options', values);
        window.alert('Settings were applied');
      },
    },
  ],
  Data: [
    {
      name: 'getPage',
      parameters: [
        {
          name: 'config',
          componentType: 'complex',
          complex: [
            {
              name: 'filters',
              componentType: 'list',
            },
            {
              name: 'sorting',
              componentType: 'list',
            },
            {
              name: 'continuationToken',
              componentType: 'text',
            },
            {
              name: 'limit',
              componentType: 'number',
              min: 0,
              value: 0,
            },
          ],
        },
        {
          name: 'context',
          componentType: 'dictionary',
        },
      ],
      invoke: async (values: any[]) => {
        console.debug('Invoke "GetPage"', values);
        const result = await Models.ConnectorInstance.getPage(
          values[0] || {},
          values[1] || {}
        );

        console.table({ request: values, result });

        return result;
      },
      returnJson: true,
      returnJsonArray: true,
      returnsImage: false,
    },
    {
      name: 'getModel',
      parameters: [
        {
          name: 'context',
          componentType: 'dictionary',
        },
      ],
      invoke: async (values: any[]) => {
        console.debug('Invoke "GetModel"', values);
        const result = await Models.ConnectorInstance.getModel(values[0] || {});

        console.table({ request: values, result });

        return result;
      },
      returnJson: true,
      returnJsonArray: false,
      returnsImage: false,
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
              name: 'pageSize',
              componentType: 'number',
              min: 0,
              value: 0,
            },
            {
              name: 'pageToken',
              componentType: 'text',
            },
            {
              name: 'sortOrder',
              componentType: 'text',
            },
            {
              name: 'sortBy',
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
        console.debug('Invoke "Media:Query"', values);
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
        console.debug('Invoke "Media:Detail"', values);
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
        console.debug('Invoke "Media:Download"', values);
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
