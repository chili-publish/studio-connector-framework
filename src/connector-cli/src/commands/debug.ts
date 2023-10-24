import { initRuntime, evalSync } from "../qjs/qjs";
import express from 'express';
import Handlebars from "handlebars";


export async function runDebugger(connectorFile: string, options: any): Promise<void> {
    const app = express();
    app.set('view engine', 'hbs');

    const port = options.port ?? 3300;
    const indexTemplate = Handlebars.compile(debuggerHandleBarTemplate);

    app.get('/', (req, res) => {
        res.send(indexTemplate({port: port}));
    });

    app.get('/bundle.js', (req, res) => {
        res.sendFile('bundle.js', { root: __dirname });
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
</head>
<body>
    <div id="app"></div>
    <script src="http://localhost:{{port}}/bundle.js"></script>
    <script type="module" src="http://localhost:{{port}}/connector.js"></script>
</body>
</html>
        `;