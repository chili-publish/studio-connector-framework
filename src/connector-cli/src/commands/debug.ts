import express from 'express';
import fs from 'fs';
import path from 'path';
import reload from 'reload';
import {
  compileToTempFile,
  introspectTsFile,
} from '../compiler/connectorCompiler';
import { error, info, startCommand, verbose } from '../core';
import { ExecutionError } from '../core/types';
import { getConnectorProjectFileInfo } from '../utils/connector-project';

interface DebuggerCommandOptions {
  port: number;
  watch?: true;
}

export async function runDebugger(
  projectPath: string,
  options: DebuggerCommandOptions
): Promise<void> {
  startCommand('debug', { projectPath, options });

  const { connectorFile } = getConnectorProjectFileInfo(projectPath);

  const connectorType = await introspectTsFile(connectorFile);
  const compilation = await compileToTempFile(connectorFile);
  if (compilation.errors.length > 0) {
    if (options.watch) {
      error(compilation.formattedDiagnostics);
    } else {
      throw new ExecutionError(compilation.formattedDiagnostics);
    }
  }

  const app = express();
  const reloadTrigger = await reload(app);
  const port = options.port;
  const indexTemplate = debuggerHandleBarTemplate;

  if (options.watch) {
    info(
      'Watching for changes on ' + connectorFile + '... (press ctrl+c to exit)'
    );
    const watcher = fs.watch(connectorFile, async function (event, filename) {
      verbose(`Triggers watch callback for ${event}, ${filename}`);
      info('Recompiling...');

      const watchCompilation = await compileToTempFile(
        connectorFile,
        compilation.tempFile
      );

      if (watchCompilation.errors.length > 0) {
        error(watchCompilation.formattedDiagnostics);
      } else {
        verbose('Compiled -> ' + watchCompilation.tempFile);
        info('Reloading browser tab...');
        reloadTrigger.reload();
      }
      info('Watching for changes... (press ctrl+c to exit)');
    });

    process.on('SIGINT', async () => {
      verbose('Destroy debug for "SIGINT"');
      verbose('Stop watching the connector file: ' + connectorFile);
      watcher.close();
    });

    process.on('exit', async () => {
      verbose('Destroy debug for "exit"');
      verbose('Stop watching the connector file: ' + connectorFile);
      watcher.close();
    });
  }

  // recursive (3 deep) find parent folder with subfolder 'out'
  function findOutFolder(folder: string, depth: number): string | undefined {
    if (depth === 5) {
      return undefined;
    }
    verbose('Looking for CLI out folder in ' + folder);
    const outFolder = path.join(folder, 'out');
    if (fs.existsSync(outFolder)) {
      return outFolder;
    }
    return findOutFolder(path.join(folder, '..'), depth + 1);
  }

  const outFolder = findOutFolder(__dirname, 0);

  if (!outFolder) {
    throw new ExecutionError('Output folder for CLI tool can not be detected');
  }

  verbose('Detected out folder: ' + outFolder);

  // make sure connectorFile is absolute path
  const tempConnectorBuild = path.resolve(compilation.tempFile);

  // handle all preflight requests
  app.options('*', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Allow-Methods', '*');
    res.send();
  });

  app.get('/', (req, res) => {
    verbose('Serving index.html');
    res.send(indexTemplate);
  });

  app.get('/bundle.js', (req, res) => {
    verbose('Serving bundle.js');

    const binFolder = outFolder;
    // find js file in the bin folder
    const files = fs.readdirSync(binFolder);
    const jsFile = files.find((f) => f.endsWith('.js'));
    const templatePath = path.join(binFolder, jsFile!);

    res.sendFile(templatePath);
  });

  app.get('/main.css', (req, res) => {
    verbose('Serving main.css');
    const binFolder = outFolder;
    // find css file in the bin folder
    const files = fs.readdirSync(binFolder);
    const cssFile = files.find((f) => f.endsWith('.css'));
    const templatePath = path.join(binFolder, cssFile!);

    res.sendFile(templatePath);
  });

  app.get('/connector.js', (req, res) => {
    verbose('Serving connector.js');
    res.sendFile(tempConnectorBuild);
  });

  const server = app.listen(port, async () => {
    const debugURL = `http://localhost:${port}?type=${connectorType}`;
    info(`Debugger running on port ${port}. Visit "${debugURL}" for testing`);
    (await import('open')).default(debugURL);
  });

  process.on('SIGINT', async () => {
    verbose('Destroy debug for "SIGINT"');
    verbose('Stoping express server...');
    server.closeAllConnections();
    server.close();
    verbose('Closing websocket connection');
    await reloadTrigger.closeServer();
  });

  process.on('exit', async () => {
    verbose('Destroy debug for "exit"');
    verbose('Stoping express server...');
    server.closeAllConnections();
    server.close();
    verbose('Closing websocket connection');
    await reloadTrigger.closeServer();
  });
}

const debuggerHandleBarTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Connector Debugger</title>
    <link rel="stylesheet" href="main.css">
</head>
<body>
    <div id="root"></div>
    <script src="/reload/reload.js"></script>
    <script src="bundle.js"></script>
    <script type="module" src="connector.js"></script>
</body>
</html>
        `;
