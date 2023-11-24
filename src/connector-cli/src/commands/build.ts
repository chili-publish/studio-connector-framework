import * as fs from 'fs';
import { compile } from '../compiler/connectorCompiler';
import path from 'path';
import { validateInputConnectorFile } from '../validation';
import { errorNoColor, info, startCommand, success, verbose } from '../logger';

export async function runBuild(
  connectorFile: string,
  options: any
): Promise<void> {
  startCommand('build', { connectorFile, options });

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
    verbose(`Creating out folder ${out}`);
    fs.mkdirSync(out);
  }

  const compilation = await compile(connectorFile);

  if (compilation.errors.length > 0) {
    errorNoColor(compilation.formattedDiagnostics);
    return;
  }

  // write to out/connector.js
  fs.writeFileSync(`${out}/connector.js`, compilation.script);
  verbose(`Written to ${out}/connector.js`);

  success('Build succeeded');

  if (watch) {
    info(
      'Watching for changes on ' + connectorFile + '... (press ctrl+c to exit)'
    );
    const watcher = fs.watchFile(connectorFile, async function () {
      info('Rebuilding...');
      const compilation = await compile(connectorFile);
      if (compilation.errors.length > 0) {
        errorNoColor(compilation.formattedDiagnostics);
        return;
      } else {
        success('Build succeeded -> ' + `${out}/connector.js`);
      }

      // write to out/connector.js
      fs.writeFileSync(`${out}/connector.js`, compilation.script);

      info('');
      info('Watching for changes... (press ctrl+c to exit)');
    });

    // wait for user to press ctrl+c
    await new Promise((resolve) => {
      process.stdin.resume();
      process.stdin.on('data', resolve);
    });
  }
}
