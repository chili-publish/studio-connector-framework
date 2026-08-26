import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import chalk from 'chalk';
import reload from 'reload';
import { compileToTempFile } from '../compiler/connectorCompiler';
import { error, info, readConnectorConfig, startCommand, verbose } from '../core';
import { ExecutionError } from '../core/types';
import { ConnectorType } from '../core/types';
import { getConnectorProjectFileInfo } from '../utils/connector-project';
import { watchConnectorProject } from '../utils/watch-connector-project';

function getDebugConnectorType(configType: ConnectorType): string {
  switch (configType) {
    case ConnectorType.Data:
      return 'dataconnector';
    case ConnectorType.Media:
      return 'mediaconnector';
    default: {
      const exhaustive: never = configType;
      throw new ExecutionError(
        `Unsupported connector type "${exhaustive}" in config. Expected "data" or "media".`
      );
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildDebuggerHtml(compileError: string | null): string {
  const overlay =
    compileError === null
      ? ''
      : `
  <div id="compile-error-overlay" style="position:fixed;inset:0;z-index:99999;background:#1e1e1e;color:#f44747;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;padding:24px;overflow:auto;box-sizing:border-box;">
    <h1 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#f48771;">Compilation failed</h1>
    <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.5;color:#d4d4d4;">${escapeHtml(compileError)}</pre>
  </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Connector Debugger</title>
    <link rel="stylesheet" href="main.css">
</head>
<body>
    <div id="root"></div>
    ${overlay}
    <script src="/reload/reload.js"></script>
    <script src="bundle.js"></script>
</body>
</html>`;
}

function displayHostForUrl(host: string | undefined): string {
  if (!host || host === '0.0.0.0' || host === '::') {
    return 'localhost';
  }
  return host;
}

function logDebugServerReady(
  port: number,
  connectorType: string,
  host: string | undefined
): string {
  const localURL = `http://localhost:${port}?type=${connectorType}`;
  const arrow = chalk.green('➜');
  const label = (text: string) => chalk.bold(text);

  console.info('');
  console.info(
    `  ${arrow}  ${label('Local:')}   ${chalk.cyan(localURL)}`
  );

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    const networkURL = `http://${displayHostForUrl(host)}:${port}?type=${connectorType}`;
    // When bound to 0.0.0.0 / ::, show the bind host so remote access is obvious.
    const networkDisplay =
      host === '0.0.0.0' || host === '::'
        ? chalk.dim(`bound to ${host}:${port} — use a machine IP to access`)
        : chalk.cyan(networkURL);
    console.info(`  ${arrow}  ${label('Network:')} ${networkDisplay}`);
  }

  console.info(`  ${arrow}  ${chalk.dim('press ctrl+c to stop')}`);
  console.info('');

  return localURL;
}

interface DebuggerCommandOptions {
  port: number;
  open?: boolean;
  host?: string;
}

export async function runDebugger(
  projectPath: string,
  options: DebuggerCommandOptions
): Promise<void> {
  startCommand('debug', { projectPath, options });

  const { projectDir, connectorFile, packageJson } =
    getConnectorProjectFileInfo(projectPath);
  const config = readConnectorConfig(packageJson);
  const connectorType = getDebugConnectorType(config.type);

  // Allocate a stable temp path up front so watch rebuilds reuse it even when
  // the initial compile fails (compileToTempFile returns tempFile: '' on error).
  const tempConnectorBuild = path.join(
    os.tmpdir(),
    `file_${Date.now()}_${Math.floor(Math.random() * 10000)}.js`
  );

  let lastCompileError: string | null = null;
  let hasSuccessfulBuild = false;

  const compilation = await compileToTempFile(
    connectorFile,
    tempConnectorBuild
  );
  if (compilation.errors.length > 0) {
    lastCompileError = compilation.formattedDiagnostics;
    error(compilation.formattedDiagnostics);
  } else {
    lastCompileError = null;
    hasSuccessfulBuild = true;
  }

  const app = express();
  const reloadTrigger = await reload(app);
  const port = options.port;
  const shouldOpenBrowser = options.open === true;
  const host = options.host;

  info('Watching for changes on project .ts files...');
  const watcher = watchConnectorProject(projectDir, async (changedFile) => {
    verbose(`Triggers watch callback for ${changedFile}`);
    info('Recompiling...');

    const watchCompilation = await compileToTempFile(
      connectorFile,
      tempConnectorBuild
    );

    if (watchCompilation.errors.length > 0) {
      lastCompileError = watchCompilation.formattedDiagnostics;
      error(watchCompilation.formattedDiagnostics);
    } else {
      lastCompileError = null;
      hasSuccessfulBuild = true;
      verbose('Compiled -> ' + watchCompilation.tempFile);
      info('Reloading browser tab...');
    }
    // Always reload so the browser picks up success or the compile-error overlay.
    reloadTrigger.reload();
    info('Watching for changes...');
  });

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

  // handle all preflight requests
  app.options('*', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Allow-Methods', '*');
    res.send();
  });

  app.get('/', (req, res) => {
    verbose('Serving index.html');
    res.send(buildDebuggerHtml(lastCompileError));
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
    if (!hasSuccessfulBuild || !fs.existsSync(tempConnectorBuild)) {
      res.status(503).type('text/plain').send('Connector not compiled yet');
      return;
    }
    res.sendFile(tempConnectorBuild);
  });

  const onListening = async () => {
    const debugURL = logDebugServerReady(port, connectorType, host);
    if (shouldOpenBrowser) {
      (await import('open')).default(debugURL);
    }
  };

  const server = host
    ? app.listen(port, host, onListening)
    : app.listen(port, onListening);

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    verbose(`Destroy debug for "${signal}"`);
    verbose('Stop watching project .ts files in: ' + projectDir);
    watcher.close();
    verbose('Closing websocket connection');
    try {
      await reloadTrigger.closeServer();
    } catch (err) {
      verbose(
        `Failed to close reload server: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
    verbose('Stopping express server...');
    server.closeAllConnections();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}
