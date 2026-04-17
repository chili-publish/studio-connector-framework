import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as esbuild from 'esbuild';
import { verbose } from '../core';

export async function compileToTempFile(
  connectorFile: string,
  tempFile?: string
): Promise<TempFileCompilationResult> {
  verbose(`Compile connector ${connectorFile} to temporary file`);
  const compileResult = await compile(connectorFile);

  if (compileResult.errors.length > 0) {
    return {
      tempFile: '',
      errors: compileResult.errors,
      formattedDiagnostics: compileResult.formattedDiagnostics,
    };
  }

  // Get the current timestamp
  if (!tempFile) {
    const timestamp = new Date().getTime();
    const randomNumber = Math.floor(Math.random() * 10000);
    const filename = `file_${timestamp}_${randomNumber}`;
    tempFile = path.join(os.tmpdir(), `${filename}.js`);
  } else {
    verbose(
      `Use provided temporary file "${tempFile}" to store compiled results`
    );
  }

  const tempFileUsed = path.resolve(tempFile);

  verbose(`Write compiled results to ${tempFileUsed}`);
  fs.writeFileSync(tempFileUsed, compileResult.script);

  return {
    tempFile: tempFileUsed,
    errors: [],
    formattedDiagnostics: '',
  };
}

export async function compile(
  connectorFile: string
): Promise<InMemoryCompilationResult> {
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

  // Use TypeScript only for type-checking / diagnostics.
  const program = ts.createProgram([fileName], compilerOptions);
  const diagnostics = ts.getPreEmitDiagnostics(program);

  if (diagnostics.length > 0) {
    return {
      script: '',
      errors: diagnostics.map((d) => ({
        line:
          d.file?.getLineAndCharacterOfPosition(d.start!).line.toString() ?? '',
        error: d.messageText.toString(),
      })),
      formattedDiagnostics: ts.formatDiagnosticsWithColorAndContext(
        diagnostics,
        {
          getCurrentDirectory: () => process.cwd(),
          getCanonicalFileName: (f) => f,
          getNewLine: () => ts.sys.newLine,
        }
      ),
    };
  }

  // Use esbuild for bundling so that external npm packages (e.g. xlsx) are
  // inlined into the output. Type-only imports (like @chili-publish/studio-connectors)
  // are automatically tree-shaken away.
  const result = await esbuild.build({
    entryPoints: [fileName],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    write: false,
    treeShaking: true,
    logLevel: 'silent',
  });

  const script = result.outputFiles[0]?.text ?? '';

  return {
    script,
    errors: [],
    formattedDiagnostics: '',
  };
}

export async function introspectTsFile(connectorFile: string): Promise<string> {
  // use typescript to load the connector file
  // and get the connector class
  const program = ts.createProgram([connectorFile], {});
  const sourceFile = program.getSourceFile(connectorFile);
  const typeChecker = program.getTypeChecker();

  let iface = '';
  sourceFile?.statements
    .filter(ts.isClassDeclaration)
    .forEach((classDeclaration) => {
      classDeclaration.heritageClauses?.forEach((heritageClause) => {
        heritageClause.types.forEach((type) => {
          var symbol = typeChecker.getTypeAtLocation(type.expression);
          iface = symbol.symbol.escapedName.toString();
        });
      });
    });

  return iface;
}

export type AnyCompilationResult =
  | TempFileCompilationResult
  | InMemoryCompilationResult;

export type TempFileCompilationResult = CompilationResult & {
  tempFile: string;
};

export type InMemoryCompilationResult = CompilationResult & {
  script: string;
};

export type CompilationResult = {
  errors: {
    line: string;
    error: string;
  }[];
  formattedDiagnostics: string;
};
