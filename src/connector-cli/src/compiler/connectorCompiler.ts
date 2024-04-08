import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

export async function compileToTempFile(
  connectorFile: string,
  tempFile?: string | undefined
): Promise<TempFileCompilationResult> {
  const compileResult = await compile(connectorFile);

  if (compileResult.errors.length > 0) {
    return {
      tempFile: '',
      errors: compileResult.errors,
      formattedDiagnostics: compileResult.formattedDiagnostics,
    };
  }

  // Get the current timestamp
  let timestamp = new Date().getTime();
  let randomNumber = Math.floor(Math.random() * 10000);
  let filename = `file_${timestamp}_${randomNumber}`;

  const tempFileUsed = path.resolve(tempFile ?? `/tmp/${filename}.js`);

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
      formattedDiagnostics: '',
    };
  }

  // output to console
  const diagnostics = ts.getPreEmitDiagnostics(program);

  return {
    script: output,
    errors: diagnostics.map((d) => ({
      line:
        d.file?.getLineAndCharacterOfPosition(d.start!).line.toString() ?? '',
      error: d.messageText.toString(),
    })),
    formattedDiagnostics: ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => process.cwd(),
      getCanonicalFileName: (fileName) => fileName,
      getNewLine: () => ts.sys.newLine,
    }),
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
