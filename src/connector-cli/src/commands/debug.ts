import { initRuntime, evalSync } from '../qjs/qjs';
import express from 'express';
import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';

export async function runDebugger(
  connectorFile: string,
  options: any
): Promise<void> {
  const app = express();
  app.set('view engine', 'hbs');

  const port = options.port ?? 3300;
  const indexTemplate = Handlebars.compile(debuggerHandleBarTemplate);

  // make sure connectorFile is absolute path
  connectorFile = path.resolve(connectorFile);

  // handle all preflight requests
  app.options('*', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Allow-Methods', '*');
    res.send();
  });

  app.get('/', (req, res) => {
    // get the full url of the request
    const host = req.protocol + '://' + req.hostname;
    res.send(indexTemplate({ port: port, host: host }));
  });

  app.get('/bundle.js', (req, res) => {
    const templatePath = path.join(
      __dirname,
      '../../debugger/bin/',
      'index.js'
    );
    res.sendFile(templatePath);
  });

  app.get('/main.css', (req, res) => {
    const binFolder = path.join(__dirname, '../../debugger/bin');

    // find css file in the bin folder
    const files = fs.readdirSync(binFolder);
    const cssFile = files.find((f) => f.endsWith('.css'));
    const templatePath = path.join(binFolder, cssFile!);

    res.sendFile(templatePath);
  });

  app.get('/connector.js', (req, res) => {
    res.sendFile(connectorFile);
  });

  const server = app.listen(port, async () => {
    console.log(`Debugger listening at http://localhost:${port}`);
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
