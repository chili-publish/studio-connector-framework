import * as ts from 'typescript';
import * as fs from 'fs';
import { compile } from '../compiler/connectorCompiler';
import path from 'path';
import { validateInputConnectorFile } from '../validation';

export async function runBuild(
  connectorFile: string,
  options: any
): Promise<void> {
  if (!validateInputConnectorFile(connectorFile)) {
    return;
  }

  // store all options as vars
  const { outFolder, watch } = options;

  // get connectorfile directory using path utils or fs
  const connectorFolder = path.dirname(connectorFile);

  // if no outfolder, user the directory of the connector file and create subfolder 'out'
  const out = outFolder || `${connectorFolder}/out`;

  // if outfolder does not exist, create it
  if (!fs.existsSync(out)) {
    fs.mkdirSync(out);
  }

  const compilation = await compile(connectorFile);

  if (compilation.errors.length > 0) {
    console.log('Build failed');
    return;
  }

  // write to out/connector.js
  fs.writeFileSync(`${out}/connector.js`, compilation.script);

  console.log(`Written to ${out}/connector.js`);
  console.log('Build succeeded');

  if (watch) {
    console.log('Watching for changes... (press ctrl+c to exit)');
    const watcher = fs.watchFile(connectorFile, async function () {
      console.log('File changed, rebuilding...');
      const compilation = await compile(connectorFile);
      if (compilation.errors.length > 0) {
        console.log('Build failed');
        return;
      }

      // write to out/connector.js
      fs.writeFileSync(`${out}/connector.js`, compilation.script);

      console.log(`Written to ${out}/connector.js`);
      console.log('Build succeeded');
      console.log('Watching for changes... (press ctrl+c to exit)');
    });

    // wait for user to press ctrl+c
    await new Promise((resolve) => {
      process.stdin.resume();
      process.stdin.on('data', resolve);
    });
  }
}
