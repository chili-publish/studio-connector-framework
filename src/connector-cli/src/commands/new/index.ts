import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { info, startCommand, verbose } from '../../core';
import { ConnectorType, ExecutionError } from '../../core/types';
import { isGitDirectory } from './isGitDirectory';
import { getProjectParams } from './steps/getProjectParams';
import {
  getDataConnectorFile,
  getGitIgnoreFile,
  getMediaConnectorFile,
  getMediaConnectorTestFile,
  getPackageJson,
  getTsConfig,
} from './templates';
import { NewCommandOptions } from './types';

export async function runNewProject(
  projectNameOrOptions: string | NewCommandOptions,
  options: NewCommandOptions | undefined
): Promise<void> {
  startCommand('new', { projectNameOrOptions, options });
  const [projectDir, projectName, config] = await getProjectParams(
    typeof projectNameOrOptions === 'string'
      ? { projectName: projectNameOrOptions, ...options }
      : { ...projectNameOrOptions }
  );

  verbose(
    `Create "${projectName}" project in ${projectDir} for ${config.type} type`
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
  const packageJson = getPackageJson(
    projectName,
    config.type,
    config.connectorName
  );
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
    config.type === ConnectorType.Media
      ? getMediaConnectorFile()
      : getDataConnectorFile();

  info('Creating ' + fileName);
  fs.writeFileSync(path.join(projectDir, fileName), content);

  if (config.type === ConnectorType.Media) {
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
