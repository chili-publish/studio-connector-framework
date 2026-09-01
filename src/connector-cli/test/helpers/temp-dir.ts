import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TMP_ROOT = path.join(__dirname, '..', '.tmp');

export function createTempDir(prefix = 'cli-test-'): string {
  fs.mkdirSync(TMP_ROOT, { recursive: true });
  return fs.mkdtempSync(path.join(TMP_ROOT, prefix));
}

export function createOsTempDir(prefix = 'cli-test-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function copyFixture(fixtureName: string, destinationDir: string): string {
  const source = path.join(__dirname, '..', 'fixtures', fixtureName);
  const target = path.join(destinationDir, fixtureName);
  fs.cpSync(source, target, { recursive: true });
  return target;
}

export function cleanupTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}
