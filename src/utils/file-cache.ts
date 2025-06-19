import path from 'path';
import fs from 'fs/promises';
import { Logger } from '../types/index.js';

interface CacheEntry {
  path: string;
  lastAccessed: number;
}

interface DirectoryCache {
  files: string[];
  lastScanned: number;
}

/**
 * LRU File Cache for fast file lookups in Unity projects
 */
export class FileCache {
  private fileCache: Map<string, CacheEntry> = new Map();
  private directoryCache: Map<string, DirectoryCache> = new Map();
  private maxCacheSize: number = 10000;
  private directoryCacheTTL: number = 30000; // 30 seconds
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.fileCache.clear();
    this.directoryCache.clear();
    this.logger.debug('File cache cleared');
  }

  /**
   * Add a file path to the cache
   */
  addFile(filePath: string): void {
    // Implement LRU eviction
    if (this.fileCache.size >= this.maxCacheSize) {
      const oldestKey = this.getOldestEntry();
      if (oldestKey) {
        this.fileCache.delete(oldestKey);
      }
    }

    this.fileCache.set(path.basename(filePath), {
      path: filePath,
      lastAccessed: Date.now()
    });
  }

  /**
   * Get file path from cache
   */
  getFile(fileName: string): string | null {
    const entry = this.fileCache.get(fileName);
    if (entry) {
      entry.lastAccessed = Date.now();
      return entry.path;
    }
    return null;
  }

  /**
   * Get cached directory contents
   */
  async getDirectoryContents(dirPath: string): Promise<string[] | null> {
    const cache = this.directoryCache.get(dirPath);
    
    if (cache && (Date.now() - cache.lastScanned) < this.directoryCacheTTL) {
      return cache.files;
    }

    return null;
  }

  /**
   * Cache directory contents
   */
  setDirectoryContents(dirPath: string, files: string[]): void {
    this.directoryCache.set(dirPath, {
      files,
      lastScanned: Date.now()
    });
  }

  /**
   * Find files with caching
   */
  async findFilesWithCache(
    directory: string,
    fileName?: string,
    extension?: string
  ): Promise<string[]> {
    const results: string[] = [];

    // First, check file cache for exact match
    if (fileName) {
      const cached = this.getFile(fileName);
      if (cached && cached.startsWith(directory)) {
        // Verify file still exists
        try {
          await fs.access(cached);
          return [cached];
        } catch {
          // File no longer exists, remove from cache
          this.fileCache.delete(fileName);
        }
      }
    }

    // Then scan directory with caching
    await this.scanDirectoryWithCache(directory, results, fileName, extension);
    
    return results;
  }

  /**
   * Scan directory recursively with caching
   */
  private async scanDirectoryWithCache(
    dir: string,
    results: string[],
    fileName?: string,
    extension?: string
  ): Promise<void> {
    // Skip Unity-specific directories that shouldn't contain user scripts
    const skipDirs = ['Library', 'Temp', 'Logs', 'UserSettings', '.git', 'node_modules'];
    if (skipDirs.some(skip => dir.includes(skip))) {
      return;
    }

    let entries: string[] | null = await this.getDirectoryContents(dir);

    if (!entries) {
      try {
        const dirEntries = await fs.readdir(dir, { withFileTypes: true });
        entries = dirEntries.map(e => e.name);
        this.setDirectoryContents(dir, entries);

        // Process entries
        for (const entry of dirEntries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await this.scanDirectoryWithCache(fullPath, results, fileName, extension);
          } else if (entry.isFile()) {
            const entryName = entry.name;
            const baseName = path.basename(entryName, path.extname(entryName));

            // Add to file cache
            this.addFile(fullPath);

            // Check if matches criteria
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
      } catch (error) {
        // Directory not accessible
        this.logger.debug(`Cannot access directory: ${dir}`);
      }
    } else {
      // Use cached entries
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        
        try {
          const stat = await fs.stat(fullPath);
          
          if (stat.isDirectory()) {
            await this.scanDirectoryWithCache(fullPath, results, fileName, extension);
          } else if (stat.isFile()) {
            const baseName = path.basename(entry, path.extname(entry));

            if (fileName && baseName === fileName) {
              if (!extension || entry.endsWith(extension)) {
                results.push(fullPath);
              }
            } else if (!fileName && extension && entry.endsWith(extension)) {
              results.push(fullPath);
            } else if (!fileName && !extension) {
              results.push(fullPath);
            }
          }
        } catch {
          // Entry no longer exists
        }
      }
    }
  }

  /**
   * Get oldest entry for LRU eviction
   */
  private getOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.fileCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Get cache statistics
   */
  getStats(): { fileCount: number; directoryCount: number } {
    return {
      fileCount: this.fileCache.size,
      directoryCount: this.directoryCache.size
    };
  }
}