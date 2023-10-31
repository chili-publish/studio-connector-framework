import * as ts from 'typescript';
import * as fs from 'fs';
import { tmpdir } from 'node:os';

export async function compileToTempFile(
  connectorFile: string,
  tempFile?: string | undefined
): Promise<{ tempFile: string; errors: { line: string; error: string }[] }> {
  const compileResult = await compile(connectorFile);

  if (compileResult.errors.length > 0) {
    return {
      tempFile: '',
      errors: compileResult.errors,
    };
  }

  const tempFileUsed =
    tempFile ?? `${fs.mkdtempSync(tmpdir())}/connector.js`;
  fs.writeFileSync(tempFileUsed, compileResult.script);

  return {
    tempFile: tempFileUsed,
    errors: [],
  };
}

export async function compile(
  connectorFile: string
): Promise<{ script: string; errors: { line: string; error: string }[] }> {
  const fileName = connectorFile;
  const compilerOptions: ts.CompilerOptions = {
    libs: ['es2020'],
    noEmitHelpers: true,
    module: ts.ModuleKind.ES2020,
    target: ts.ScriptTarget.ES2020,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    preserveConstEnums: false,
    esModuleInterop: false,
    removeComments: true,
    declaration: false,
  };

  // build to in-memory
  const program = ts.createProgram([fileName], compilerOptions);
  var output = '';

  const emitResult = program.emit(undefined, (fileName, txt) => {
    output += txt;
  });
  if (emitResult.emitSkipped) {
    return {
      script: '',
      errors: [
        {
          line: '',
          error: 'Compile failed',
        },
      ],
    };
  }

  // output to console
  const diagnostics = ts.getPreEmitDiagnostics(program);
  console.log(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => process.cwd(),
      getCanonicalFileName: (fileName) => fileName,
      getNewLine: () => ts.sys.newLine,
    })
  );

  return {
    script: output,
    errors: diagnostics.map((d) => ({
      line:
        d.file?.getLineAndCharacterOfPosition(d.start!).line.toString() ?? '',
      error: d.messageText.toString(),
    })),
  };
}
