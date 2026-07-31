import fs from 'fs';
import path from 'path';
import { error, verbose } from '../core';
import { isPathInsideDir, outputDirectory } from './connector-project';

const WATCH_DEBOUNCE_MS = 150;
/** Basename filters applied only to directory components (not file basenames). */
const IGNORED_DIR_NAMES = new Set(['node_modules', '.git']);

export type WatchConnectorProjectHandle = {
  close: () => void;
};

/**
 * Watch a connector project directory for `.ts` file changes.
 * Ignores `node_modules`, the project `out` directory, and dot-directories.
 * Debounces rapid filesystem events.
 */
export function watchConnectorProject(
  projectDir: string,
  onChange: (filename: string) => void | Promise<void>
): WatchConnectorProjectHandle {
  const absoluteProjectDir = path.resolve(projectDir);
  const projectOutDir = path.resolve(absoluteProjectDir, outputDirectory);
  const ignoredDirs = new Set([
    path.resolve(absoluteProjectDir, 'node_modules'),
    projectOutDir,
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
    } catch (err) {
      error(
        `Watch callback failed: ${err instanceof Error ? err.message : String(err)}`
      );
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

  const shouldIgnoreDirName = (name: string): boolean =>
    IGNORED_DIR_NAMES.has(name) || name.startsWith('.');

  /**
   * Ignore the configured project output / node_modules trees, and any
   * ignored directory names among *parent* path segments only.
   * File basenames (e.g. `.helpers.ts`) are not filtered here.
   */
  const shouldIgnore = (filePath: string): boolean => {
    for (const ignored of ignoredDirs) {
      if (isPathInsideDir(filePath, ignored)) {
        return true;
      }
    }

    const relative = path.relative(absoluteProjectDir, filePath);
    if (relative === '' || path.isAbsolute(relative)) {
      return false;
    }

    const segments = relative.split(path.sep);
    const parentSegments = segments.slice(0, -1);
    return parentSegments.some((segment) => shouldIgnoreDirName(segment));
  };

  const watchersByDir = new Map<string, fs.FSWatcher>();

  const closeWatcherForDir = (dir: string) => {
    const watcher = watchersByDir.get(dir);
    if (!watcher) {
      return;
    }
    watcher.close();
    watchersByDir.delete(dir);
  };

  const closeWatchersUnder = (dir: string) => {
    for (const watchedDir of [...watchersByDir.keys()]) {
      if (watchedDir === dir || isPathInsideDir(watchedDir, dir)) {
        closeWatcherForDir(watchedDir);
      }
    }
  };

  const watchDir = (dir: string) => {
    if (shouldIgnore(dir) || shouldIgnoreDirName(path.basename(dir)) || closed) {
      return;
    }
    if (watchersByDir.has(dir)) {
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
            if (eventType === 'rename' && !shouldIgnoreDirName(filename)) {
              // Drop any stale watcher from a previous directory at this path
              // so watchDir can register the replacement.
              closeWatchersUnder(fullPath);
              watchDir(fullPath);
              schedule(fullPath);
            }
            return;
          }
        } catch {
          // Path may have been deleted between exists and stat.
        }

        // Directory removed or moved away: drop its watchers and rebuild.
        if (watchersByDir.has(fullPath)) {
          closeWatchersUnder(fullPath);
          schedule(fullPath);
          return;
        }

        if (!filename.endsWith('.ts') && !filename.endsWith('.tsx')) {
          return;
        }

        schedule(fullPath);
      });
    } catch (err) {
      verbose(
        `Failed to watch directory "${dir}": ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      return;
    }

    watcher.on('error', (err) => {
      verbose(
        `Watcher error for "${dir}": ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      closeWatcherForDir(dir);
    });

    watchersByDir.set(dir, watcher);

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      verbose(
        `Failed to read directory "${dir}": ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory() && !shouldIgnoreDirName(entry.name)) {
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
      for (const dir of [...watchersByDir.keys()]) {
        closeWatcherForDir(dir);
      }
    },
  };
}
