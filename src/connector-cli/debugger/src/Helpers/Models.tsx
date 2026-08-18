import {
  UpdateHttpParamsSettings,
  UpdateRuntimeOptionsSettings,
  UpdateSettingsFn,
} from '../core/useConnectorSettings';
import { InvokableDataModel, SettableDataModel } from './DataModel';

export const Models: {
  Settings: SettableDataModel[];
  Media: InvokableDataModel[];
  Data: InvokableDataModel[];
} = {
  Settings: [
    {
      name: 'http-params',
      displayName: 'HTTP Params',
      parameters: [
        {
          name: 'Authorization Header',
          componentType: 'text',
        },
        {
          name: 'Headers',
          componentType: 'dictionary',
        },
        {
          name: 'Query',
          componentType: 'dictionary',
        },
      ],
      set: (
        [
          authorization,
          httpHeaders,
          httpQuery,
        ]: Parameters<UpdateHttpParamsSettings>[1],
        updateSettings: UpdateSettingsFn
      ) => {
        console.debug(
          'Set "http-params"',
          authorization,
          httpHeaders,
          httpQuery
        );
        updateSettings('http-params', [authorization, httpHeaders, httpQuery]);
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
      set: (
        values: Parameters<UpdateRuntimeOptionsSettings>[1],
        updateSettings: UpdateSettingsFn
      ) => {
        console.debug('Set "Runtime options"', values);
        updateSettings('runtime-options', values);
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
              name: 'previousPageToken',
              componentType: 'text',
            },
            {
              name: 'continuationToken',
              componentType: 'text',
            },
            {
              name: 'limit',
              componentType: 'number',
              min: 0,
              value: 10,
            },
          ],
        },
        {
          name: 'context',
          componentType: 'dictionary',
        },
      ],
      invoke: async (values: any[], connector: any) => {
        console.debug('Invoke "GetPage"', values);
        const result = await connector.getPage(values[0] || {}, values[1] || {});

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
      invoke: async (values: any[], connector: any) => {
        console.debug('Invoke "GetModel"', values);
        const result = await connector.getModel(values[0] || {});

        console.table({ request: values, result });

        return result;
      },
      returnJson: true,
      returnJsonArray: false,
      returnsImage: false,
    },
    {
      name: 'getPageItemById',
      parameters: [
        {
          name: 'id',
          componentType: 'id',
        },
        {
          name: 'pageOptions',
          componentType: 'complex',
          complex: [
            {
              name: 'sorting',
              componentType: 'list',
            },
            {
              name: 'limit',
              componentType: 'number',
              min: 1,
              value: 10,
            },
          ],
        },
        {
          name: 'context',
          componentType: 'dictionary',
        },
      ],
      invoke: async (values: any[], connector: any) => {
        console.debug('Invoke "getPageItemById"', values);
        const result = await connector.getPageItemById(
          values[0] ?? '',
          values[1] || {},
          values[2] || {}
        );

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
      invoke: async (values: any[], connector: any) => {
        console.debug('Invoke "Media:Query"', values);
        const result = await connector.query(values[0] || {}, values[1] || {});

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
          componentType: 'id',
        },
        {
          name: 'context',
          componentType: 'dictionary',
        },
      ],
      invoke: async (values: any[], connector: any) => {
        console.debug('Invoke "Media:Detail"', values);
        const result = await connector.detail(values[0] || '', values[1] || {});

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
          componentType: 'id',
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
      invoke: async (values: any[], connector: any) => {
        console.debug('Invoke "Media:Download"', values);
        const result = await connector.download(
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
