import fs from 'fs';
import path from 'path';
import { info, readConnectorConfig, startCommand, warn } from '../core';
import { readConnectorCodeConfig } from '../core/connector-code-config';
import { getConnectorProjectFileInfo } from '../utils/connector-project';
import { getInstalledPackageVersion } from '../utils/version-reader';

interface GetInfoCommandOptions {
  out?: string;
}

export async function runGetInfo(
  projectPath: string,
  options: GetInfoCommandOptions
): Promise<void> {
  startCommand('info', { projectPath, options });

  const { packageJson, connectorFile, projectDir } =
    getConnectorProjectFileInfo(projectPath);

  const connectorCodeConfig = await readConnectorCodeConfig(connectorFile);

  const connectorConfig = readConnectorConfig(packageJson);

  const apiVersion = getInstalledPackageVersion(
    '@chili-publish/studio-connectors',
    projectDir
  );

  if (options.out) {
    const properties = {
      apiVersion: apiVersion,
      ...connectorCodeConfig,
      type: connectorConfig.type,
      logoUrl: connectorConfig.iconUrl,
      supportedAuth: connectorConfig.supportedAuth,
      runtimeOptions: connectorConfig.options,
    };
    fs.writeFileSync(
      path.resolve(options.out),
      JSON.stringify(properties, null, 2)
    );
    info(`Written to ${options.out} file`);
    return;
  }

  info('');
  // API version
  info(`Framework version: ${apiVersion}`);

  // Connector type
  info(`Type: "${connectorConfig.type}"`);

  if (connectorConfig.iconUrl) {
    // Connector logo
    info(`Logo: "${connectorConfig.iconUrl}"`);
  } else {
    info('Logo: There is no connector logo URL specified for this connector');
  }

  if (connectorConfig.type === 'media') {
    // Connector capability
    const formattedCapabilities = Object.entries(
      connectorCodeConfig.capabilities
    )
      .filter(([_, value]) => !!value)
      .map(([key, value]) => {
        return {
          capability: key,
        };
      });

    if (formattedCapabilities.length === 0) {
      warn('Capabilities: Connector does not have any enabled capabilities.');
    } else {
      info('Capabilities...');
      console.table(formattedCapabilities, ['capability']);
    }

    // Connector query options
    const formattedConfigurationOptions =
      connectorCodeConfig.configurationOptions;

    if (formattedConfigurationOptions.length === 0) {
      info('Query options: Connector does not have any query options defined');
    } else {
      info('Settings...');
      console.table(formattedConfigurationOptions, [
        'type',
        'name',
        'displayName',
      ]);
    }
  }

  // Runtime settings
  if (Object.values(connectorConfig.options).length === 0) {
    info(
      'Runtime settings: Connector does not have any runtime settings defined'
    );
  } else {
    const formattedOptinos = Object.entries(connectorConfig.options).map(
      ([key, value]) => {
        const required = value === null || value === undefined;
        return {
          name: key,
          required,
          default: required ? 'N/A' : value,
        };
      }
    );

    info('Runtime settings...');
    console.table(formattedOptinos, ['name', 'required', 'default']);
  }

  // Supported authentication

  if (
    !connectorConfig.supportedAuth ||
    Object.values(connectorConfig.supportedAuth).length === 0
  ) {
    info(
      'Authentication: There is no any supported authentication defined for this connector'
    );
  } else {
    const formattedOptinos = connectorConfig.supportedAuth.map((auth) => {
      return {
        type: auth,
      };
    });

    info('Supported authentication...');
    console.table(formattedOptinos, ['type']);
  }
}
