import {initRuntime, evalSync} from '../qjs/qjs';
import express from 'express';
import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';

export async function runDebugger(
  connectorFile: string,
  options: any,
): Promise<void> {
  const app = express();
  app.set('view engine', 'hbs');

  const port = options.port ?? 3300;
  const indexTemplate = Handlebars.compile(debuggerHandleBarTemplate);

  // make sure connectorFile is absolute path
  connectorFile = path.resolve(connectorFile);

  app.get('/', (req, res) => {
    res.send(indexTemplate({port: port}));
  });

  app.get('/bundle.js', (req, res) => {
    const templatePath = path.join(
      __dirname,
      '../../debugger/bin/',
      'index.js',
    );
    res.sendFile(templatePath);
  });

  app.get('/main.css', (req, res) => {
    const binFolder = path.join(__dirname, '../../debugger/bin');

    // find css file in the bin folder
    const files = fs.readdirSync(binFolder);
    const cssFile = files.find(f => f.endsWith('.css'));
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
    <link rel="stylesheet" href="http://localhost:{{port}}/main.css">
</head>
<body>
    <div id="app"></div>
    <script src="http://localhost:{{port}}/bundle.js"></script>
    <script type="module" src="http://localhost:{{port}}/connector.js"></script>
</body>
</html>
        `;
