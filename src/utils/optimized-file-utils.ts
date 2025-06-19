import path from 'path';
import fs from 'fs/promises';
import { FileCache } from './file-cache.js';
import { Logger } from '../types/index.js';

let globalFileCache: FileCache | null = null;

/**
 * Initialize the global file cache
 */
export function initializeFileCache(logger: Logger): void {
  globalFileCache = new FileCache(logger);
}

/**
 * Get the global file cache instance
 */
export function getFileCache(): FileCache | null {
  return globalFileCache;
}

/**
 * Find files with caching and early termination support
 */
export async function findFilesOptimized(options: {
  directory: string;
  fileName?: string;
  extension?: string;
  useCache?: boolean;
  maxResults?: number;
}): Promise<string[]> {
  const { directory, fileName, extension, useCache = true, maxResults = Infinity } = options;
  
  // Use cache if available and enabled
  if (useCache && globalFileCache) {
    const results = await globalFileCache.findFilesWithCache(directory, fileName, extension);
    return results.slice(0, maxResults);
  }

  // Fallback to regular file search
  const results: string[] = [];
  await scanDirectory(directory, results, fileName, extension, maxResults);
  return results;
}

/**
 * Find first matching file (optimized for single result)
 */
export async function findFirstFile(options: {
  directory: string;
  fileName?: string;
  extension?: string;
  useCache?: boolean;
}): Promise<string | null> {
  const results = await findFilesOptimized({
    ...options,
    maxResults: 1
  });
  
  return results.length > 0 ? results[0] : null;
}

/**
 * Scan directory with early termination support
 */
async function scanDirectory(
  dir: string,
  results: string[],
  fileName?: string,
  extension?: string,
  maxResults: number = Infinity
): Promise<void> {
  // Early termination if we have enough results
  if (results.length >= maxResults) {
    return;
  }

  // Skip Unity-specific directories
  const skipDirs = ['Library', 'Temp', 'Logs', 'UserSettings', '.git', 'node_modules'];
  if (skipDirs.some(skip => dir.includes(skip))) {
    return;
  }

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (results.length >= maxResults) {
        return;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await scanDirectory(fullPath, results, fileName, extension, maxResults);
      } else if (entry.isFile()) {
        const entryName = entry.name;
        const baseName = path.basename(entryName, path.extname(entryName));

        if (fileName && baseName === fileName) {
          if (!extension || entryName.endsWith(extension)) {
            results.push(fullPath);
          }
        } else if (!fileName && extension && entryName.endsWith(extension)) {
          results.push(fullPath);
        } else if (!fileName && !extension) {
          results.push(fullPath);
        }
      }
    }
  } catch {
    // Directory not accessible
  }
}

/**
 * Batch file operations for efficiency
 */
export async function batchFileOperation<T>(
  files: string[],
  operation: (file: string) => Promise<T>,
  concurrency: number = 5
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(operation));
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Stream-based file search for very large directories
 */
export async function* streamFindFiles(options: {
  directory: string;
  fileName?: string;
  extension?: string;
}): AsyncGenerator<string> {
  const { directory, fileName, extension } = options;
  
  async function* scanGen(dir: string): AsyncGenerator<string> {
    const skipDirs = ['Library', 'Temp', 'Logs', 'UserSettings', '.git', 'node_modules'];
    if (skipDirs.some(skip => dir.includes(skip))) {
      return;
    }

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          yield* scanGen(fullPath);
        } else if (entry.isFile()) {
          const entryName = entry.name;
          const baseName = path.basename(entryName, path.extname(entryName));

          if (fileName && baseName === fileName) {
            if (!extension || entryName.endsWith(extension)) {
              yield fullPath;
            }
          } else if (!fileName && extension && entryName.endsWith(extension)) {
            yield fullPath;
          } else if (!fileName && !extension) {
            yield fullPath;
          }
        }
      }
    } catch {
      // Directory not accessible
    }
  }

  yield* scanGen(directory);
}

/**
 * Warm up the cache by pre-scanning common directories
 */
export async function warmUpCache(projectPath: string, logger: Logger): Promise<void> {
  if (!globalFileCache) {
    initializeFileCache(logger);
  }

  const commonDirs = [
    path.join(projectPath, 'Assets', 'Scripts'),
    path.join(projectPath, 'Assets', 'Editor'),
    path.join(projectPath, 'Assets', 'Plugins'),
    path.join(projectPath, 'Assets', 'Shaders'),
    path.join(projectPath, 'Assets', 'Materials')
  ];

  logger.info('Warming up file cache...');
  
  for (const dir of commonDirs) {
    try {
      await findFilesOptimized({ directory: dir, useCache: true });
    } catch {
      // Directory might not exist
    }
  }
  
  const stats = globalFileCache!.getStats();
  logger.info(`Cache warmed up: ${stats.fileCount} files, ${stats.directoryCount} directories`);
}