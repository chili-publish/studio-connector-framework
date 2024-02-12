import fs from 'fs';
import path from 'path';
import { error, startCommand } from '../logger';
import { info } from 'console';

export async function runInit(directory: string, options: any): Promise<void> {
  startCommand('init', { directory, options });
  const resultDirectory = path.resolve(directory);

  if (!fs.existsSync(resultDirectory)) {
    fs.mkdirSync(resultDirectory, { recursive: true });
    info('Created directory -> ' + resultDirectory);
  }
  // intialize a new node project in current folder
  // 1. check if no existing projects in current folder
  if (fs.existsSync(path.join(resultDirectory, './package.json'))) {
    error('package.json already exists in current folder: ' + resultDirectory);
    return;
  }

  // 2. create package.json
  const packageJson = {
    name: 'publisher',
    description: '',
    version: '1.0.0',
    author: {
      name: 'CHILI publish',
      email: 'info@chili-publish.com',
      url: 'https://github.com/chili-publish',
    },
    config: {
      options: {
        BASE_URL: null,
        DEBUG: '0',
      },
      mappings: {},
    },
    license: 'MIT',
    main: 'out/connector.js',
    dependencies: {
      typescript: '^5.2.2',
      '@chili-publish/studio-connectors': '*',
    },
    scripts: {
      build: 'yarn connector-cli build',
      test: 'yarn connector-cli test -t tests.json && yarn connector-cli stress',
    },
    devDependencies: {
      '@chili-publish/connector-cli': '*',
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
      target: 'es2017',
      module: 'commonjs',
      outDir: './out',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'out'],
  };

  info('Creating tsconfig.json');
  fs.writeFileSync(
    path.join(resultDirectory, './tsconfig.json'),
    JSON.stringify(tsConfig, null, 2)
  );

  // 4. create src folder
  fs.mkdirSync(path.join(resultDirectory, './src'));

  // 5. create src/index.ts
  const indexTs = `
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
            throw new Error('Method not implemented.');
        }
        getCapabilities(): Media.MediaConnectorCapabilities {
            throw new Error('Method not implemented.');
        }
    }
    `;

  info('Creating src/connector.ts');
  fs.writeFileSync(path.join(resultDirectory, './src/connector.ts'), indexTs);

  // 6. create tests.json
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

  // 7. create .gitignore
  const gitIgnore = `
    node_modules
    out
    `;

  info('Creating .gitignore');
  fs.writeFileSync(path.join(resultDirectory, './.gitignore'), gitIgnore);
}
