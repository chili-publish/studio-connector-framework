import {
  AuthenticationConfig,
  ExecutionError,
  OAuth2JwtBearer,
  OAuth2JwtBearerOption,
} from '../../../core/types';

import {
  FetchingJSONSchemaStore,
  InputData,
  JSONSchemaInput,
  quicktype,
} from 'quicktype-core';

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { verbose } from '../../../core';

type EditableOption = Required<Omit<OAuth2JwtBearerOption, 'value'>>;
type StaticOption = Required<Pick<OAuth2JwtBearerOption, 'key' | 'value'>>;

export async function prefillForOAuth2JwtBearer(
  rawData: Record<string, unknown>,
  config: AuthenticationConfig['oAuth2JwtBearer']
): Promise<Record<string, unknown>> {
  if (!config) {
    throw new ExecutionError(
      `"OAuth2JwtBearer" requires authentication configuration to be defined. Provide all required data under "config.authenticationConfig.oAuth2JwtBearer"`
    );
  }

  const schemaInput = await getSchemaInput(config);

  const file = await createDynamicType(schemaInput);

  const basicAuthData = await transformAndValidate(rawData, file);

  const withDefaults = appendDefaults(basicAuthData, config);

  verbose(
    `Proccessed raw data with defaults \n ${JSON.stringify(
      withDefaults,
      null,
      2
    )}`
  );

  return withDefaults;
}

async function getSchemaInput(
  config: Required<AuthenticationConfig>['oAuth2JwtBearer']
) {
  const schema = {
    $schema: 'https://json-schema.org/draft-07/schema',
    title: 'Type',
    type: 'object',
    properties: getPropsSchema(config),
    required: ['jwtPayload'],
  };

  verbose(`Generated schema: \n ${JSON.stringify(schema, null, 2)}`);

  const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());

  await schemaInput.addSource({
    name: 'Schema',
    schema: JSON.stringify(schema),
  });

  return schemaInput;
}

function getPropsSchema(
  config: Required<AuthenticationConfig>['oAuth2JwtBearer']
) {
  const editableJwtPayload = config.jwtPayload.filter(
    (o) => !!o.ui
  ) as EditableOption[];
  const editableRequestBodyParams = config.requestBodyParams?.filter(
    (o) => !!o.ui
  ) as EditableOption[] | undefined;

  const properties = {} as Record<string, unknown>;

  function processOptions(options: EditableOption[]) {
    return {
      type: 'object',
      properties: options.reduce(
        (propSchema, cur) => {
          propSchema[cur.key] = {
            type: 'string',
          };
          return propSchema;
        },
        {} as Record<string, unknown>
      ),
      required: options.filter((jp) => jp.required).map((jp) => jp.key),
    };
  }

  properties.jwtPayload = processOptions(editableJwtPayload);
  if (editableRequestBodyParams?.length) {
    properties.requestBodyParams = processOptions(editableRequestBodyParams);
  }
  return properties;
}

async function createDynamicType(schemaInput: JSONSchemaInput) {
  const inputData = new InputData();
  inputData.addInput(schemaInput);

  const result = await quicktype({
    lang: 'javascript',
    inputData,
  });

  const dynamicTypeFile = path.join(os.tmpdir(), 'authType.js');

  verbose(
    `Generated file type: \n Destination: ${dynamicTypeFile} \n Content: \n ${result.lines.join(
      '\n'
    )}`
  );

  await fs.writeFile(dynamicTypeFile, result.lines.join('\n'));

  return dynamicTypeFile;
}

type Type = Pick<OAuth2JwtBearer, 'jwtPayload' | 'requestBodyParams'> &
  Partial<Omit<OAuth2JwtBearer, 'jwtPayload' | 'requestBodyParams'>>;

interface TransformerFile {
  toSchema: (rawData: string) => Type;
}

async function transformAndValidate(
  rawData: Record<string, unknown>,
  file: string
) {
  try {
    const module: TransformerFile = await import(file);
    return module.toSchema(JSON.stringify(rawData));
  } catch (error) {
    // Invalid data provided
    const err = error as Error;
    if (err.message.startsWith('Invalid value')) {
      verbose(err.message);
      throw new ExecutionError(
        `Provided "jwtPayload" or "requestBodyParams" are in invalid format. Execute command with --verbose flag for more information about error`
      );
    }
    throw err;
  }
}

function appendDefaults(
  basicData: Type,
  config: Required<AuthenticationConfig>['oAuth2JwtBearer']
) {
  const staticJwtPayload = config.jwtPayload.filter(
    (o) => !o.type
  ) as StaticOption[];
  const staticRequestBodyParams = config.requestBodyParams?.filter(
    (o) => !o.ui
  ) as StaticOption[] | undefined;

  const defaults = {
    tokenEndpoint: config.tokenEndpoint,
    jwtTokenParamName: config.jwtTokenParamName,
  };

  return {
    ...defaults,
    ...basicData,
    jwtPayload: {
      ...staticJwtPayload.reduce(
        (p, cur) => {
          p[cur.key] = cur.value;
          return p;
        },
        {} as OAuth2JwtBearer['jwtPayload']
      ),
      ...basicData.jwtPayload,
    },
    requestBodyParams:
      staticRequestBodyParams?.length ||
      Object.keys(basicData.requestBodyParams ?? {}).length
        ? {
            ...staticRequestBodyParams?.reduce(
              (p, cur) => {
                p[cur.key] = cur.value;
                return p;
              },
              {} as Required<OAuth2JwtBearer>['requestBodyParams']
            ),
            ...basicData.requestBodyParams,
          }
        : undefined,
  };
}
