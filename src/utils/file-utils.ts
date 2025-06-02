import fs from 'fs/promises';
import path from 'path';
import { FileSearchOptions } from '../types/index.js';

export async function findFiles(options: FileSearchOptions): Promise<string[]> {
  const files: string[] = [];

  async function scanDirectory(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(options.extension)) {
        if (!options.fileName || entry.name.includes(options.fileName)) {
          files.push(fullPath);
        }
      }
    }
  }

  await scanDirectory(options.directory);
  return files;
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}