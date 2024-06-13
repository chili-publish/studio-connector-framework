import express from 'express';
import path from 'path';
import fs from 'fs';
import {
  compileToTempFile,
  introspectTsFile,
} from '../compiler/connectorCompiler';
import {
  startCommand,
  validateInputConnectorFile,
  info,
  errorNoColor,
  success,
  verbose,
} from '../core';

interface DebuggerCommandOptions {
  port: number;
  watch?: true;
}

export async function runDebugger(
  connectorFile: string,
  options: DebuggerCommandOptions
): Promise<void> {
  startCommand('debug', { connectorFile, options });
  if (!validateInputConnectorFile(connectorFile)) {
    return;
  }

  const connectorType = await introspectTsFile(connectorFile);
  const compilation = await compileToTempFile(connectorFile);

  if (options.watch) {
    info(
      'Watching for changes on ' + connectorFile + '... (press ctrl+c to exit)'
    );
    fs.watchFile(path.resolve(connectorFile), async function () {
      info('Rebuilding...');

      const watchCompilation = await compileToTempFile(
        connectorFile,
        compilation.tempFile
      );
      if (watchCompilation.errors.length > 0) {
        errorNoColor(watchCompilation.formattedDiagnostics);
        return;
      } else {
        success('Build succeeded -> ' + compilation.tempFile);
      }

      info('');
      info('Watching for changes... (press ctrl+c to exit)');
    });
  }

  const app = express();
  const port = options.port;
  const indexTemplate = debuggerHandleBarTemplate;

  // recursive (3 deep) find parent folder with subfolder 'out'
  function findOutFolder(folder: string, depth: number): string | undefined {
    if (depth === 5) {
      return undefined;
    }
    info('Looking for out folder in ' + folder);
    const outFolder = path.join(folder, 'out');
    if (fs.existsSync(outFolder)) {
      return outFolder;
    }
    return findOutFolder(path.join(folder, '..'), depth + 1);
  }

  const outFolder = findOutFolder(__dirname, 0);

  if (!outFolder) {
    errorNoColor('Could not find out folder');
    return;
  }

  info('Detected out folder: ' + outFolder);

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
    info(
      `Debugger running on port ${port}. Visit http://localhost:${port}?type=${connectorType} for testing`
    );
    (await import('open')).default(
      `http://localhost:${port}?type=${connectorType}`
    );
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
    <script src="bundle.js"></script>
    <script type="module" src="connector.js"></script>
</body>
</html>
        `;
