import fs from 'fs';
import path from 'path';
import { error, startCommand } from '../logger';
import { info } from 'console';

interface InitCommandOptions {
  name: string;
  type: 'media' | 'fonts';
}

export async function runInit(
  directory: string,
  options: InitCommandOptions
): Promise<void> {
  startCommand('init', { directory, options });
  const resultDirectory = path.resolve(directory);

  info(`Generating "${options.name}" ${options.type} connector template...`);

  if (!fs.existsSync(resultDirectory)) {
    info('Creating directory ' + resultDirectory);
    fs.mkdirSync(resultDirectory, { recursive: true });
  }
  // intialize a new node project in current folder
  // 1. check if no existing projects in current folder
  if (fs.existsSync(path.join(resultDirectory, './package.json'))) {
    error('package.json already exists in current folder: ' + resultDirectory);
    return;
  }

  // 2. create package.json
  const packageJson = {
    name: options.name,
    description: '',
    version: '1.0.0',
    author: {
      name: 'CHILI publish',
      email: 'info@chili-publish.com',
      url: 'https://github.com/chili-publish',
    },
    config: {
      type: options.type,
      options: {},
      mappings: {},
    },
    license: 'MIT',
    main: 'out/connector.js',
    dependencies: {
      typescript: '^5.2.2',
      '@chili-publish/studio-connectors': '^1',
    },
    scripts: {
      build: 'yarn connector-cli build',
      test: 'yarn connector-cli test -t tests.json && yarn connector-cli stress',
    },
    devDependencies: {
      '@chili-publish/connector-cli': '^1',
    },
  };

  info('Creating package.json');
  fs.writeFileSync(
    path.join(resultDirectory, './package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // 3. create tsconfig.json
  const tsConfig = {
    compilerOptions: {
      lib: ['ES2020'],
      noEmitHelpers: true,
      module: 'ES2020',
      outDir: 'out',
      target: 'ES2020',
      moduleResolution: 'Node',
      preserveConstEnums: false,
      esModuleInterop: false,
      removeComments: true,
      declaration: false,
    },
    include: ['connector.ts'],
    exclude: ['node_modules', 'out'],
  };

  info('Creating tsconfig.json');
  fs.writeFileSync(
    path.join(resultDirectory, './tsconfig.json'),
    JSON.stringify(tsConfig, null, 2)
  );

  // 4. create connector.ts
  const connectorTs = `
    import { Connector, Media } from '@chili-publish/studio-connectors';

    export default class MyConnector implements Media.MediaConnector {
        detail(id: string, context: Connector.Dictionary): Promise<Media.MediaDetail> {
          throw new Error('Method not implemented.');
        }
        query(options: Connector.QueryOptions, context: Connector.Dictionary): Promise<Media.MediaPage> {
            throw new Error('Method not implemented.');
        }
        download(id: string, previewType: Media.DownloadType, intent: Media.DownloadIntent, context: Connector.Dictionary): Promise<Connector.ArrayBufferPointer> {
            throw new Error('Method not implemented.');
        }
        getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
            return []
        }
        getCapabilities(): Media.MediaConnectorCapabilities {
            return {
              query: false,
              detail: false,
              filtering: false
            }
        }
    }
    `;

  info('Creating ./connector.ts');
  fs.writeFileSync(path.join(resultDirectory, './connector.ts'), connectorTs);

  // 5. create tests.json
  const testsJson = `
    {
        "setup": {
            "runtime_options": {
                "BASE_URL": "https://localhost:3000"
            }
        },
        "tests": [
            {
                "name": "test1",
                "method": "download",
                "arguments": {
                    "id": "id",
                    "url": "url",
                    "options": {}
                },
                "asserts": {
                    "fetch": [
                        {
                            "url": "url",
                            "method": "GET",
                            "count": 1
                        }
                    ]
                }
            }
        ]
    }
    `;

  info('Creating tests.json');
  fs.writeFileSync(path.join(resultDirectory, './tests.json'), testsJson);

  // 6. create .gitignore
  const gitIgnore = `
    node_modules
    out
    `;

  info('Creating .gitignore');
  fs.writeFileSync(path.join(resultDirectory, './.gitignore'), gitIgnore);
}
