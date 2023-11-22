import fs from 'fs';
import { error, startCommand } from '../logger';
import { info } from 'console';

export async function runInit(options: any): Promise<void> {
  startCommand('init', { options });
  // intialize a new node project in current folder
  // 1. check if no existing projects in current folder
  if (fs.existsSync('./package.json')) {
    error('package.json already exists in current folder');
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
        BASE_URL: '',
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
  fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));

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
  fs.writeFileSync('./tsconfig.json', JSON.stringify(tsConfig, null, 2));

  // 4. create src folder
  fs.mkdirSync('./src');

  // 5. create src/index.ts
  const indexTs = `
    import { MediaConnector } from '@chili-publish/studio-connectors';

    export class MyConnector extends MediaConnector {
        async onInit() {
            // called when connector is initialized
        }
    }
    `;

  info('Creating src/connector.ts');
  fs.writeFileSync('./src/connector.ts', indexTs);

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
  fs.writeFileSync('./tests.json', testsJson);

  // 7. create .gitignore
  const gitIgnore = `
    node_modules
    out
    `;

  info('Creating .gitignore');
  fs.writeFileSync('./.gitignore', gitIgnore);
}
