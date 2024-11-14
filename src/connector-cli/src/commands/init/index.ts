import { execSync } from 'child_process';
import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { info, startCommand, verbose } from '../../core';
import { Type as ConnectorType, ExecutionError } from '../../core/types';
import { isGitDirectory } from './isGitDirectory';
import {
  getDataConnectorFile,
  getGitIgnoreFile,
  getMediaConnectorFile,
  getMediaConnectorTestFile,
  getPackageJson,
  getTsConfig,
} from './templates';

interface InitCommandOptions {
  name: string;
  type: ConnectorType;
  out: string;
}

export async function runInit(options: InitCommandOptions): Promise<void> {
  const [commandName] = program.args as ['new' | 'init'];
  startCommand(commandName, { options });

  // validate project name
  verbose(`Validating project name "${options.name}"`);
  if (!/^(\w+-?)*\w+$/.test(options.name)) {
    throw new ExecutionError(
      'Invalid project name. The name must consist of letters, numbers, underscores, and hyphens'
    );
  }

  let relDirectory = options.out;
  if (commandName === 'new') {
    relDirectory = path.join(relDirectory, options.name);
  }
  const projectDir = path.resolve(relDirectory);

  verbose(
    `Create "${options.name}" project in ${projectDir} for ${options.type} type`
  );

  info(`Generating connector's project...`);
  // 1. intialize a new project in "projectDir" directory
  if (!fs.existsSync(projectDir)) {
    verbose('Creating directory ' + projectDir);
    fs.mkdirSync(projectDir, { recursive: true });
  }

  // Check if no existing projects in "resultDirectory"
  if (fs.existsSync(path.join(projectDir, './package.json'))) {
    throw new ExecutionError(
      'package.json already exists in a directory: ' + projectDir
    );
  }

  // 2. create package.json
  const packageJson = getPackageJson(options.name, options.type);
  info('Creating package.json...');
  fs.writeFileSync(
    path.join(projectDir, './package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // 3. create tsconfig.json
  info('Creating tsconfig.json');
  const tsConfig = getTsConfig();
  fs.writeFileSync(
    path.join(projectDir, './tsconfig.json'),
    JSON.stringify(tsConfig, null, 2)
  );

  // 4. create connector file
  const { content, fileName } =
    options.type === ConnectorType.Media
      ? getMediaConnectorFile()
      : getDataConnectorFile();

  info('Creating ' + fileName);
  fs.writeFileSync(path.join(projectDir, fileName), content);

  if (options.type === ConnectorType.Media) {
    // 5. create tests.json
    const testsJson = getMediaConnectorTestFile();
    info('Creating tests.json');
    fs.writeFileSync(
      path.join(projectDir, './tests.json'),
      JSON.stringify(testsJson, null, 2)
    );
  }

  // 6. create .gitignore
  const gitIgnore = getGitIgnoreFile();

  info('Creating .gitignore');
  fs.writeFileSync(path.join(projectDir, './.gitignore'), gitIgnore);

  // 7. init or add files to git project
  if (isGitDirectory(projectDir)) {
    info('Adding generated project files to the git...');
  } else {
    info(
      execSync(`git init`, {
        cwd: projectDir,
        encoding: 'utf-8',
      })
    );
  }
}
