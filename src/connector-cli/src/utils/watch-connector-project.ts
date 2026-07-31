import fs from 'fs';
import path from 'path';
import { outputDirectory } from './connector-project';

const WATCH_DEBOUNCE_MS = 150;

export type WatchConnectorProjectHandle = {
  close: () => void;
};

/**
 * Watch a connector project directory for `.ts` file changes.
 * Ignores `node_modules` and `out`. Debounces rapid filesystem events.
 */
export function watchConnectorProject(
  projectDir: string,
  onChange: (filename: string) => void | Promise<void>
): WatchConnectorProjectHandle {
  const absoluteProjectDir = path.resolve(projectDir);
  const ignoredDirs = new Set([
    path.resolve(absoluteProjectDir, 'node_modules'),
    path.resolve(absoluteProjectDir, outputDirectory),
  ]);

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  let running = false;
  let pendingFilename: string | undefined;

  const runCallback = async (filename: string) => {
    if (closed) {
      return;
    }
    if (running) {
      pendingFilename = filename;
      return;
    }
    running = true;
    try {
      await onChange(filename);
    } finally {
      running = false;
      if (pendingFilename !== undefined && !closed) {
        const next = pendingFilename;
        pendingFilename = undefined;
        void runCallback(next);
      }
    }
  };

  const schedule = (filename: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      void runCallback(filename);
    }, WATCH_DEBOUNCE_MS);
  };

  const shouldIgnore = (filePath: string): boolean => {
    for (const ignored of ignoredDirs) {
      const relative = path.relative(ignored, filePath);
      if (
        relative === '' ||
        (!relative.startsWith('..') && !path.isAbsolute(relative))
      ) {
        return true;
      }
    }
    return false;
  };

  const watchers: fs.FSWatcher[] = [];

  const watchDir = (dir: string) => {
    if (shouldIgnore(dir) || closed) {
      return;
    }

    let watcher: fs.FSWatcher;
    try {
      watcher = fs.watch(dir, { persistent: true }, (eventType, filename) => {
        if (closed || !filename) {
          return;
        }

        const fullPath = path.join(dir, filename);

        if (shouldIgnore(fullPath)) {
          return;
        }

        try {
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
            if (eventType === 'rename') {
              watchDir(fullPath);
            }
            return;
          }
        } catch {
          // File may have been deleted; still notify if it looked like a .ts path
        }

        if (!filename.endsWith('.ts') && !filename.endsWith('.tsx')) {
          return;
        }

        schedule(fullPath);
      });
    } catch {
      return;
    }

    watchers.push(watcher);

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        watchDir(path.join(dir, entry.name));
      }
    }
  };

  watchDir(absoluteProjectDir);

  return {
    close: () => {
      closed = true;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      for (const watcher of watchers) {
        watcher.close();
      }
      watchers.length = 0;
    },
  };
}
