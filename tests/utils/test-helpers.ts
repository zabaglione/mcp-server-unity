import { promises as fs } from 'fs';
import * as path from 'path';
import { jest } from '@jest/globals';
import type { Stats } from 'fs';

export interface MockFileSystem {
  [path: string]: string | Buffer | MockDirectory;
}

export interface MockDirectory {
  type: 'directory';
  files?: MockFileSystem;
}

export class TestHelpers {
  /**
   * Create a mock file system structure
   */
  static setupMockFileSystem(structure: MockFileSystem) {
    const mockReadFile = jest.fn(async (filePath: string) => {
      const normalizedPath = path.normalize(filePath);
      const content = structure[normalizedPath];
      
      if (content === undefined) {
        throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      }
      
      if (typeof content === 'object' && 'type' in content && content.type === 'directory') {
        throw new Error(`EISDIR: illegal operation on a directory, read`);
      }
      
      return content;
    });

    const mockWriteFile = jest.fn(async (filePath: string, content: string | Buffer) => {
      const normalizedPath = path.normalize(filePath);
      structure[normalizedPath] = content;
    });

    const mockMkdir = jest.fn(async (dirPath: string) => {
      const normalizedPath = path.normalize(dirPath);
      structure[normalizedPath] = { type: 'directory' };
    });

    const mockStat = jest.fn(async (filePath: string): Promise<Stats> => {
      const normalizedPath = path.normalize(filePath);
      const content = structure[normalizedPath];
      
      if (content === undefined) {
        throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
      }
      
      const isDirectory = typeof content === 'object' && 'type' in content && content.type === 'directory';
      
      return {
        isDirectory: () => isDirectory,
        isFile: () => !isDirectory,
        size: isDirectory ? 0 : (content as string | Buffer).length,
        mtime: new Date(),
        birthtime: new Date(),
      } as Stats;
    });

    const mockReaddir = jest.fn(async (dirPath: string): Promise<string[]> => {
      const normalizedPath = path.normalize(dirPath);
      const dir = structure[normalizedPath];
      
      if (!dir || typeof dir !== 'object' || !('type' in dir) || dir.type !== 'directory') {
        throw new Error(`ENOTDIR: not a directory, scandir '${dirPath}'`);
      }
      
      const files: string[] = [];
      for (const key in structure) {
        const parentDir = path.dirname(key);
        if (parentDir === normalizedPath) {
          files.push(path.basename(key));
        }
      }
      
      return files;
    });

    // Mock the fs/promises module
    jest.doMock('fs/promises', () => ({
      readFile: mockReadFile,
      writeFile: mockWriteFile,
      mkdir: mockMkdir,
      stat: mockStat,
      readdir: mockReaddir,
      access: jest.fn(async (path: string) => {
        if (!structure[path]) {
          throw new Error(`ENOENT: no such file or directory, access '${path}'`);
        }
      })
    }));
  }

  /**
   * Create a mock Unity project structure
   */
  static createMockUnityProject(projectPath: string): MockFileSystem {
    return {
      [path.join(projectPath, 'Assets')]: { type: 'directory' },
      [path.join(projectPath, 'Assets', 'Scripts')]: { type: 'directory' },
      [path.join(projectPath, 'Assets', 'Materials')]: { type: 'directory' },
      [path.join(projectPath, 'Assets', 'Shaders')]: { type: 'directory' },
      [path.join(projectPath, 'Assets', 'Editor')]: { type: 'directory' },
      [path.join(projectPath, 'ProjectSettings')]: { type: 'directory' },
      [path.join(projectPath, 'ProjectSettings', 'ProjectVersion.txt')]: 'm_EditorVersion: 2022.3.10f1',
      [path.join(projectPath, 'Packages')]: { type: 'directory' },
      [path.join(projectPath, 'Packages', 'manifest.json')]: JSON.stringify({
        dependencies: {
          "com.unity.collab-proxy": "2.0.4",
          "com.unity.ide.visualstudio": "2.0.18",
          "com.unity.test-framework": "1.1.33",
          "com.unity.textmeshpro": "3.0.6",
          "com.unity.timeline": "1.7.4",
          "com.unity.ugui": "1.0.0"
        }
      }, null, 2),
      [path.join(projectPath, 'Library')]: { type: 'directory' },
      [path.join(projectPath, 'Library', 'Bee')]: { type: 'directory' },
      [path.join(projectPath, 'Library', 'Logs')]: { type: 'directory' }
    };
  }

  /**
   * Create a mock Unity project with URP
   */
  static createMockUnityProjectWithURP(projectPath: string): MockFileSystem {
    const base = TestHelpers.createMockUnityProject(projectPath);
    base[path.join(projectPath, 'Packages', 'manifest.json')] = JSON.stringify({
      dependencies: {
        "com.unity.render-pipelines.universal": "14.0.8",
        "com.unity.collab-proxy": "2.0.4",
        "com.unity.ide.visualstudio": "2.0.18",
        "com.unity.test-framework": "1.1.33"
      }
    }, null, 2);
    return base;
  }

  /**
   * Create a mock Unity project with HDRP
   */
  static createMockUnityProjectWithHDRP(projectPath: string): MockFileSystem {
    const base = TestHelpers.createMockUnityProject(projectPath);
    base[path.join(projectPath, 'Packages', 'manifest.json')] = JSON.stringify({
      dependencies: {
        "com.unity.render-pipelines.high-definition": "14.0.8",
        "com.unity.collab-proxy": "2.0.4",
        "com.unity.ide.visualstudio": "2.0.18",
        "com.unity.test-framework": "1.1.33"
      }
    }, null, 2);
    return base;
  }

  /**
   * Generate a consistent GUID for testing
   */
  static generateTestGUID(seed: string): string {
    // Simple deterministic GUID generation for testing
    const hash = seed.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    
    const guid = Math.abs(hash).toString(16).padStart(32, '0').slice(0, 32);
    return guid;
  }

  /**
   * Create a mock logger
   */
  static createMockLogger() {
    return {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
  }

  /**
   * Wait for async operations
   */
  static async waitForAsync(ms: number = 0): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}