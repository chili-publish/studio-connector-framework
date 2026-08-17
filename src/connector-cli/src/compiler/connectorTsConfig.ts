import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { outputDirectory } from '../utils/connector-project';

/**
 * Language level for connector emit (esbuild) and TypeScript target/lib/module.
 * Must stay aligned with what QuickJS / publish expect.
 */
export const CONNECTOR_JS_TARGET = 'ES2020';

/**
 * Canonical connector TypeScript compiler options.
 * Shared by `connector-cli new` scaffolds and the compile typecheck path.
 */
export const connectorTsCompilerOptionsJson = {
  lib: [CONNECTOR_JS_TARGET],
  noEmitHelpers: true,
  module: CONNECTOR_JS_TARGET,
  outDir: outputDirectory,
  target: CONNECTOR_JS_TARGET,
  moduleResolution: 'Bundler',
  preserveConstEnums: false,
  esModuleInterop: false,
  removeComments: true,
  declaration: false,
  // Emit is owned by connector-cli (esbuild). tsc / the editor only typecheck.
  noEmit: true,
} as const;

export type ConnectorTsCompilerOptionsJson =
  typeof connectorTsCompilerOptionsJson;

/** Keys compared when validating a project's tsconfig.json against the built-in profile. */
export const connectorTsCompilerOptionKeys = Object.keys(
  connectorTsCompilerOptionsJson
) as (keyof ConnectorTsCompilerOptionsJson)[];

export function getBuiltInConnectorTsCompilerOptions(): ts.CompilerOptions {
  const { options, errors } = ts.convertCompilerOptionsFromJson(
    { ...connectorTsCompilerOptionsJson },
    process.cwd()
  );

  if (errors.length > 0) {
    throw new Error(
      `Invalid built-in connector TypeScript options: ${ts.formatDiagnostics(
        errors,
        {
          getCurrentDirectory: () => process.cwd(),
          getCanonicalFileName: (fileName) => fileName,
          getNewLine: () => ts.sys.newLine,
        }
      )}`
    );
  }

  return options;
}

export type ProjectTsConfigValidation =
  | {
      status: 'missing';
      tsconfigPath: string;
    }
  | {
      status: 'unreadable';
      tsconfigPath: string;
      detail: string;
    }
  | {
      status: 'aligned';
      tsconfigPath: string;
      rawConfig: any;
    }
  | {
      status: 'mismatch';
      tsconfigPath: string;
      mismatches: string[];
    };

/**
 * Compare the project's tsconfig.json compilerOptions to the connector-cli built-in profile.
 * `include` / `exclude` are not part of this gate (CLI discovers sources from the entry graph).
 */
export function validateProjectTsConfig(
  projectDir: string
): ProjectTsConfigValidation {
  const tsconfigPath = path.join(projectDir, 'tsconfig.json');

  if (!fs.existsSync(tsconfigPath)) {
    return { status: 'missing', tsconfigPath };
  }

  const readResult = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (readResult.error) {
    return {
      status: 'unreadable',
      tsconfigPath,
      detail: ts.flattenDiagnosticMessageText(
        readResult.error.messageText,
        ts.sys.newLine
      ),
    };
  }

  const projectOptions =
    (readResult.config?.compilerOptions as Record<string, unknown>) ?? {};
  const mismatches: string[] = [];

  for (const key of connectorTsCompilerOptionKeys) {
    const expected = connectorTsCompilerOptionsJson[key];
    const actual = projectOptions[key];

    if (!compilerOptionValuesEqual(expected, actual)) {
      mismatches.push(
        `${key}: expected ${JSON.stringify(expected)}, found ${
          actual === undefined ? '(missing)' : JSON.stringify(actual)
        }`
      );
    }
  }

  if (mismatches.length > 0) {
    return { status: 'mismatch', tsconfigPath, mismatches };
  }

  return { status: 'aligned', tsconfigPath, rawConfig: readResult.config };
}

export function formatTsConfigMismatchWarning(
  validation: Extract<ProjectTsConfigValidation, { status: 'mismatch' }>
): string {
  const lines = [
    `Project tsconfig.json at "${validation.tsconfigPath}" does not match the connector-cli built-in TypeScript settings.`,
    'Skipping project tsconfig.json and using built-in connector-cli compiler options instead.',
    'Mismatched options:',
    ...validation.mismatches.map((m) => `  - ${m}`),
    'To stop this verbose warning, update your tsconfig.json compilerOptions to match a project from `connector-cli new` (including noEmit: true and moduleResolution: Bundler).',
  ];
  return lines.join('\n');
}

export function formatTsConfigMissingWarning(tsconfigPath: string): string {
  return [
    `No tsconfig.json found at "${tsconfigPath}".`,
    'Skipping project tsconfig.json and using built-in connector-cli compiler options instead.',
    'To stop this verbose warning, add a tsconfig.json that matches a project from `connector-cli new`.',
  ].join('\n');
}

function compilerOptionValuesEqual(expected: unknown, actual: unknown): boolean {
  if (actual === undefined) {
    return false;
  }

  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      return false;
    }
    const expectedNorm = expected.map(normalizeOptionScalar).sort();
    const actualNorm = actual.map(normalizeOptionScalar).sort();
    return expectedNorm.every((value, index) => value === actualNorm[index]);
  }

  return normalizeOptionScalar(expected) === normalizeOptionScalar(actual);
}

function normalizeOptionScalar(value: unknown): string {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  return JSON.stringify(value);
}
