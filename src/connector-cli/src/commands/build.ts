import * as fs from 'fs';
import path from 'path';
import { compile } from '../compiler/connectorCompiler';
import {
  error,
  info,
  readConnectorConfig,
  startCommand,
  success,
  verbose,
} from '../core';
import { ExecutionError } from '../core/types';
import {
  getConnectorProjectFileInfo,
  outputDirectory,
  outputFilename,
} from '../utils/connector-project';
import { watchConnectorProject } from '../utils/watch-connector-project';

interface BuildCommandOptions {
  watch?: boolean;
}

export async function runBuild(
  projectPath: string,
  options: BuildCommandOptions
): Promise<void> {
  startCommand('build', { projectPath, options });

  // store all options as vars
  const { watch } = options;

  const { projectDir, connectorFile, packageJson } =
    getConnectorProjectFileInfo(projectPath);

  if (!watch) {
    // Doing validation for config
    readConnectorConfig(packageJson);
  }

  // if no outfolder, user the directory of the connector file and create subfolder 'out'
  const out = path.resolve(path.join(projectDir, outputDirectory));

  // if outfolder does not exist, create it
  if (!fs.existsSync(out)) {
    verbose(`Creating out folder ${out}`);
    fs.mkdirSync(out);
  }

  const compilation = await compile(connectorFile);

  if (compilation.errors.length > 0) {
    throw new ExecutionError(compilation.formattedDiagnostics);
  }

  // write to output file
  fs.writeFileSync(path.join(out, outputFilename), compilation.script);
  verbose(`Written to ${path.join(out, outputFilename)}`);

  success('Build succeeded');

  if (watch) {
    info(
      'Watching for changes on project .ts files... (press ctrl+c to exit)'
    );
    const watcher = watchConnectorProject(projectDir, async (changedFile) => {
      verbose(`Detected change: ${changedFile}`);
      info('Rebuilding...');
      const watchCompilation = await compile(connectorFile);
      if (watchCompilation.errors.length > 0) {
        error(watchCompilation.formattedDiagnostics);
        info('');
        info('Watching for changes... (press ctrl+c to exit)');
        return;
      }

      verbose(`Recompiling to ${path.join(out, outputFilename)}`);
      fs.writeFileSync(path.join(out, outputFilename), watchCompilation.script);
      success('Rebuild succeeded');

      info('');
      info('Watching for changes... (press ctrl+c to exit)');
    });

    process.on('SIGINT', () => {
      watcher.close();
      process.stdin.pause();
      process.exit(0);
    });

    // wait for user to press ctrl+c
    await new Promise((resolve) => {
      process.stdin.resume();
      process.stdin.on('data', resolve);
    });
  }
}
