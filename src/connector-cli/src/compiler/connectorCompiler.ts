import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { verbose } from '../logger';

export async function compileToTempFile(
  connectorFile: string,
  tempFile?: string | undefined
): Promise<TempFileCompilationResult> {
  verbose(`Compile connector "${connectorFile}"`);
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

  if (!fs.existsSync(path.dirname(tempFileUsed))) {
    verbose(
      `Creating temporary directory "${path.dirname(
        tempFileUsed
      )}" for compiled files...`
    );
    fs.mkdirSync(path.dirname(tempFileUsed), { recursive: true });
  }
  verbose(`Write compiled results to "${tempFileUsed}" file`);
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
