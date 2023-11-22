import express from 'express';
import path from 'path';
import fs from 'fs';
import { validateInputConnectorFile } from '../validation';
import { compileToTempFile } from '../compiler/connectorCompiler';
import { errorNoColor, info, startCommand, success, verbose } from '../logger';

export async function runDebugger(
  connectorFile: string,
  options: any
): Promise<void> {
  startCommand('debug', { connectorFile, options });
  if (!validateInputConnectorFile(connectorFile)) {
    return;
  }

  const compilation = await compileToTempFile(connectorFile);

  if (options.watch) {
    info(
      'Watching for changes on ' + connectorFile + '... (press ctrl+c to exit)'
    );
    fs.watchFile(connectorFile, async function () {
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
  const port = options.port ?? 3300;
  const indexTemplate = debuggerHandleBarTemplate;

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
    const templatePath = path.join(__dirname, '../../debugger/', 'index.js');
    res.sendFile(templatePath);
  });

  app.get('/main.css', (req, res) => {
    verbose('Serving main.css');
    const binFolder = path.join(__dirname, '../../debugger');

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
    info(`Debugger running on port ${port}`);
    (await import('open')).default(`http://localhost:${port}`);
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
    <div id="app"></div>
    <script src="bundle.js"></script>
    <script type="module" src="connector.js"></script>
</body>
</html>
        `;
