import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';
import { verbose, verboseWarning, warn } from '../core';
import { isPathInsideDir, outputDirectory } from '../utils/connector-project';
import {
  CONNECTOR_JS_TARGET,
  formatTsConfigMismatchWarning,
  formatTsConfigMissingWarning,
  getBuiltInConnectorTsCompilerOptions,
  validateProjectTsConfig,
} from './connectorTsConfig';

const STUDIO_CONNECTORS_PACKAGE = '@chili-publish/studio-connectors';

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
  const absoluteEntry = path.resolve(connectorFile);
  const projectDir = path.dirname(absoluteEntry);

  const tsDiagnostics = getTypeScriptDiagnostics(absoluteEntry, projectDir);
  if (tsDiagnostics.errors.length > 0) {
    return {
      script: '',
      errors: tsDiagnostics.errors,
      formattedDiagnostics: tsDiagnostics.formattedDiagnostics,
    };
  }

  try {
    const result = await esbuild.build({
      entryPoints: [absoluteEntry],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'neutral',
      target: CONNECTOR_JS_TARGET.toLowerCase(),
      logLevel: 'silent',
      plugins: [createImportAllowlistPlugin(projectDir)],
    });

    const script = result.outputFiles?.[0]?.text;
    if (script === undefined) {
      const message = 'esbuild produced no output for the connector bundle.';
      return {
        script: '',
        errors: [{ line: '', error: message }],
        formattedDiagnostics: message,
      };
    }
    return {
      script,
      errors: [],
      formattedDiagnostics: '',
    };
  } catch (err) {
    return mapEsbuildFailure(err);
  }
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

function getTypeScriptDiagnostics(
  connectorFile: string,
  projectDir: string
): CompilationResult {
  const { rootNames, options } = resolveTypeScriptProgramInput(
    connectorFile,
    projectDir
  );
  const program = ts.createProgram(rootNames, options);
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.category === ts.DiagnosticCategory.Error);

  return {
    errors: diagnostics.map((d) => ({
      line:
        d.file?.getLineAndCharacterOfPosition(d.start!).line.toString() ?? '',
      error: ts.flattenDiagnosticMessageText(d.messageText, ts.sys.newLine),
    })),
    formattedDiagnostics: ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => process.cwd(),
      getCanonicalFileName: (fileName) => fileName,
      getNewLine: () => ts.sys.newLine,
    }),
  };
}

function resolveTypeScriptProgramInput(
  connectorFile: string,
  projectDir: string
): { rootNames: string[]; options: ts.CompilerOptions } {
  const builtInOptions = getBuiltInConnectorTsCompilerOptions();
  const validation = validateProjectTsConfig(projectDir);

  if (validation.status === 'mismatch') {
    verboseWarning(formatTsConfigMismatchWarning(validation));
    return { rootNames: [connectorFile], options: builtInOptions };
  }

  if (validation.status === 'unreadable') {
    warn(
      `Could not read project tsconfig.json at "${validation.tsconfigPath}" (${validation.detail}). Skipping project tsconfig.json and using built-in connector-cli compiler options instead.`
    );
    return { rootNames: [connectorFile], options: builtInOptions };
  }

  if (validation.status === 'missing') {
    verboseWarning(formatTsConfigMissingWarning(validation.tsconfigPath));
    return { rootNames: [connectorFile], options: builtInOptions };
  }

  // Aligned with built-in profile — use the project tsconfig for typechecking.
  const parsed = ts.parseJsonConfigFileContent(
    validation.rawConfig,
    ts.sys,
    projectDir,
    undefined,
    validation.tsconfigPath
  );

  if (parsed.errors.length > 0) {
    warn(
      `Project tsconfig.json at "${validation.tsconfigPath}" matched built-in options but failed to parse. Skipping project tsconfig.json and using built-in connector-cli compiler options instead.\n${ts.formatDiagnostics(
        parsed.errors,
        {
          getCurrentDirectory: () => process.cwd(),
          getCanonicalFileName: (fileName) => fileName,
          getNewLine: () => ts.sys.newLine,
        }
      )}`
    );
    return { rootNames: [connectorFile], options: builtInOptions };
  }

  verbose(
    `Using project tsconfig.json at "${validation.tsconfigPath}" (compilerOptions match connector-cli built-in settings).`
  );

  const rootNames =
    parsed.fileNames.length > 0 ? parsed.fileNames : [connectorFile];

  return {
    rootNames,
    options: parsed.options,
  };
}

function createImportAllowlistPlugin(projectDir: string): esbuild.Plugin {
  const absoluteProjectDir = realpathSafe(path.resolve(projectDir));
  const outDir = realpathSafe(path.resolve(absoluteProjectDir, outputDirectory));
  const nodeModulesDir = realpathSafe(
    path.join(absoluteProjectDir, 'node_modules')
  );

  return {
    name: 'connector-import-allowlist',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        // Let esbuild resolve entry points and already-resolved paths
        if (args.kind === 'entry-point') {
          return undefined;
        }

        const specifier = args.path;

        if (
          specifier === STUDIO_CONNECTORS_PACKAGE ||
          specifier.startsWith(`${STUDIO_CONNECTORS_PACKAGE}/`)
        ) {
          return {
            path: specifier,
            namespace: 'studio-connectors-stub',
          };
        }

        const isRelative =
          specifier.startsWith('./') ||
          specifier.startsWith('../') ||
          path.isAbsolute(specifier);

        if (!isRelative) {
          return {
            errors: [
              {
                text: `Import "${specifier}" is not allowed. Connector projects may only import relative local .ts modules or "${STUDIO_CONNECTORS_PACKAGE}".`,
              },
            ],
          };
        }

        const resolved = resolveRelativeImport(args.resolveDir, specifier);
        if (!resolved) {
          return {
            errors: [
              {
                text: `Cannot resolve import "${specifier}" from "${args.resolveDir}".`,
              },
            ],
          };
        }

        const normalized = realpathSafe(path.resolve(resolved));
        if (
          !isPathInsideDir(normalized, absoluteProjectDir) ||
          isPathInsideDir(normalized, outDir) ||
          isPathInsideDir(normalized, nodeModulesDir)
        ) {
          return {
            errors: [
              {
                text: `Import "${specifier}" resolves outside the connector project. Only local project .ts files are allowed.`,
              },
            ],
          };
        }

        if (!normalized.endsWith('.ts') && !normalized.endsWith('.tsx')) {
          return {
            errors: [
              {
                text: `Import "${specifier}" must resolve to a .ts file within the connector project.`,
              },
            ],
          };
        }

        return { path: normalized };
      });

      build.onLoad({ filter: /.*/, namespace: 'studio-connectors-stub' }, () => ({
        contents: 'export {}',
        loader: 'js',
      }));
    },
  };
}

function resolveRelativeImport(
  resolveDir: string,
  specifier: string
): string | undefined {
  const base = path.isAbsolute(specifier)
    ? specifier
    : path.resolve(resolveDir, specifier);

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return undefined;
}

function realpathSafe(filePath: string): string {
  try {
    return fs.realpathSync(filePath);
  } catch {
    return path.resolve(filePath);
  }
}

function mapEsbuildFailure(err: unknown): InMemoryCompilationResult {
  if (isEsbuildBuildFailure(err)) {
    const messages = [...err.errors];
    const formatted = messages
      .map((m) => {
        const location = m.location
          ? `${m.location.file}:${m.location.line}: `
          : '';
        return `${location}${m.text}`;
      })
      .join('\n');

    return {
      script: '',
      errors: messages.map((m) => ({
        line: m.location?.line?.toString() ?? '',
        error: m.text,
      })),
      formattedDiagnostics: formatted,
    };
  }

  const message = err instanceof Error ? err.message : String(err);
  return {
    script: '',
    errors: [{ line: '', error: message }],
    formattedDiagnostics: message,
  };
}

function isEsbuildBuildFailure(err: unknown): err is esbuild.BuildFailure {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errors' in err &&
    Array.isArray((err as esbuild.BuildFailure).errors)
  );
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
