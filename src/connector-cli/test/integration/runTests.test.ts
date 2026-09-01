import path from 'node:path';
import { runTests } from '@cli/commands/test';
import { ExecutionError } from '@cli/core/types';
import {
  cleanupTempDir,
  copyFixture,
  createTempDir,
} from '../helpers/temp-dir';

// Stub QuickJS so CLI `test` wiring is covered without booting the WASM VM
// (which needs Node --experimental-vm-modules).
jest.mock('@cli/qjs/qjs', () => ({
  initRuntime: jest.fn().mockResolvedValue({ dispose: jest.fn() }),
  evalAsync: jest.fn().mockResolvedValue({
    data: [
      {
        id: '1',
        name: 'item',
        relativePath: '/',
        type: 'file',
      },
    ],
    pageSize: 1,
  }),
  evalSync: jest.fn(),
  runtimeConfig: {},
}));

describe('runTests', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = createTempDir('tests-');
  });

  afterEach(() => {
    cleanupTempDir(tempRoot);
  });

  it('runs fixture tests successfully', async () => {
    const projectDir = copyFixture('media-connector', tempRoot);
    await expect(
      runTests(projectDir, {
        testFile: path.join(projectDir, 'tests.json'),
      })
    ).resolves.toBeUndefined();
  });

  it('throws ExecutionError when the test file is missing', async () => {
    const projectDir = copyFixture('media-connector', tempRoot);
    await expect(
      runTests(projectDir, {
        testFile: path.join(projectDir, 'missing-tests.json'),
      })
    ).rejects.toBeInstanceOf(ExecutionError);
  });

  it('throws ExecutionError when the connector does not compile', async () => {
    const projectDir = copyFixture('invalid-connector', tempRoot);
    await expect(
      runTests(projectDir, {
        testFile: path.join(
          __dirname,
          '..',
          'fixtures',
          'media-connector',
          'tests.json'
        ),
      })
    ).rejects.toBeInstanceOf(ExecutionError);
  });
});
