import * as ts from 'typescript';
import * as fs from 'fs';
import { compile } from '../compiler/connectorCompiler';
import { validateInputConnectorFile } from '../validation';

export async function runPublish(
  connectorFile: string,
  options: any
): Promise<void> {
  if (!validateInputConnectorFile(connectorFile)) {
    return;
  }

  // store all options as vars
  const { token, endpoint, name, overwrite } = options;

  // first build using tsc
  console.log('Building connector...');

  const compilation = await compile(connectorFile);

  if (compilation.errors.length > 0) {
    console.log('Build failed');
    return;
  }

  console.log('Build succeeded');
  console.log(compilation.script);
}
