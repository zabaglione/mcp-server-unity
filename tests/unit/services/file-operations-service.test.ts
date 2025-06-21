import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FileOperationsService } from '../../../src/services/file-operations-service.js';
import { UnityProject } from '../../../src/types/index.js';
import { FileNotFoundError } from '../../../src/errors/index.js';

// Create mocks
const mockFs = {
  rename: jest.fn(),
  unlink: jest.fn(),
  stat: jest.fn(),
  readdir: jest.fn(),
  rmdir: jest.fn(),
  utimes: jest.fn(),
  writeFile: jest.fn(),
};

const mockFileUtils = {
  pathExists: jest.fn(),
  ensureDirectory: jest.fn(),
};

// Apply mocks
jest.mock('fs/promises', () => mockFs);
jest.mock('../../../src/utils/file-utils.js', () => mockFileUtils);

describe('FileOperationsService', () => {
  let service: FileOperationsService;
  let mockLogger: any;
  let mockRefreshService: any;
  let mockProject: UnityProject;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    mockRefreshService = {
      refreshUnityAssets: jest.fn().mockResolvedValue({ content: [] }),
    };

    mockProject = {
      projectPath: '/test/unity/project',
      unityVersion: '2022.3.0f1',
      renderPipeline: 'builtin',
      scriptingBackend: 'Mono',
      packageCache: {},
    };

    service = new FileOperationsService(mockLogger);
    service.setUnityProject(mockProject);
    service.setRefreshService(mockRefreshService);
  });

  describe('moveFile', () => {
    it('should move a file and its meta file', async () => {
      mockFileUtils.pathExists.mockImplementation(async (path: string) => {
        return path.includes('source.cs') || path.includes('source.cs.meta');
      });

      const result = await service.moveFile(
        'Assets/Scripts/source.cs',
        'Assets/Scripts/Player/source.cs'
      );

      expect(mockFs.rename).toHaveBeenCalledWith(
        '/test/unity/project/Assets/Scripts/source.cs',
        '/test/unity/project/Assets/Scripts/Player/source.cs'
      );
      expect(mockFs.rename).toHaveBeenCalledWith(
        '/test/unity/project/Assets/Scripts/source.cs.meta',
        '/test/unity/project/Assets/Scripts/Player/source.cs.meta'
      );
      expect(mockRefreshService.refreshUnityAssets).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Successfully moved file');
    });

    it('should handle missing meta file', async () => {
      mockFileUtils.pathExists.mockImplementation(async (path: string) => {
        return path.includes('source.cs') && !path.includes('.meta');
      });

      const result = await service.moveFile(
        'Assets/Scripts/source.cs',
        'Assets/Scripts/Player/source.cs'
      );

      expect(mockFs.rename).toHaveBeenCalledTimes(1); // Only main file
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No .meta file found'));
      expect(result.content[0].text).toContain('Meta file: Not found');
    });

    it('should throw error for non-existent file', async () => {
      mockFileUtils.pathExists.mockResolvedValue(false);

      await expect(service.moveFile('Assets/Scripts/missing.cs', 'Assets/Scripts/new.cs'))
        .rejects.toThrow(FileNotFoundError);
    });

    it('should throw error for files outside Assets folder', async () => {
      mockFileUtils.pathExists.mockResolvedValue(true);

      await expect(service.moveFile('../outside.cs', 'Assets/Scripts/new.cs'))
        .rejects.toThrow('Can only move files within the Assets folder');
    });
  });

  describe('deleteFile', () => {
    it('should delete a file and its meta file', async () => {
      mockFileUtils.pathExists.mockResolvedValue(true);

      const result = await service.deleteFile('Assets/Scripts/ToDelete.cs');

      expect(mockFs.unlink).toHaveBeenCalledWith('/test/unity/project/Assets/Scripts/ToDelete.cs');
      expect(mockFs.unlink).toHaveBeenCalledWith('/test/unity/project/Assets/Scripts/ToDelete.cs.meta');
      expect(mockRefreshService.refreshUnityAssets).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Successfully deleted file');
    });
  });

  describe('moveFolder', () => {
    it('should move a folder with all contents', async () => {
      mockFileUtils.pathExists.mockImplementation(async (path: string) => {
        return path.includes('OldFolder') || path === '/test/unity/project/Assets/Scripts/NewFolder';
      });

      const mockStats = { isDirectory: () => true };
      mockFs.stat.mockResolvedValue(mockStats as any);
      mockFs.readdir
        .mockResolvedValueOnce([
          { name: 'file1.cs', isDirectory: () => false },
          { name: 'subfolder', isDirectory: () => true },
        ] as any)
        .mockResolvedValueOnce([
          { name: 'file2.cs', isDirectory: () => false },
        ] as any);

      const result = await service.moveFolder(
        'Assets/Scripts/OldFolder',
        'Assets/Scripts/NewFolder'
      );

      expect(mockFs.rename).toHaveBeenCalled();
      expect(mockFs.rmdir).toHaveBeenCalled();
      expect(mockRefreshService.refreshUnityAssets).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Successfully moved folder');
    });

    it('should throw error if destination already exists', async () => {
      mockFileUtils.pathExists.mockResolvedValue(true);

      const mockStats = { isDirectory: () => true };
      mockFs.stat.mockResolvedValue(mockStats as any);

      await expect(service.moveFolder('Assets/Scripts/Folder1', 'Assets/Scripts/Folder2'))
        .rejects.toThrow('Destination folder already exists');
    });
  });

  describe('renameFolder', () => {
    it('should rename a folder', async () => {
      mockFileUtils.pathExists.mockImplementation(async (path: string) => {
        return path.includes('OldName') || path === '/test/unity/project/Assets/Scripts/NewName';
      });

      const mockStats = { isDirectory: () => true };
      mockFs.stat.mockResolvedValue(mockStats as any);
      mockFs.readdir.mockResolvedValue([]);

      const result = await service.renameFolder(
        'Assets/Scripts/OldName',
        'NewName'
      );

      expect(mockFs.rename).toHaveBeenCalledWith(
        expect.stringContaining('OldName.meta'),
        expect.stringContaining('NewName.meta')
      );
      expect(result.content[0].text).toContain('Successfully moved folder');
    });
  });

  describe('deleteFolder', () => {
    it('should delete a folder and all contents recursively', async () => {
      mockFileUtils.pathExists.mockResolvedValue(true);

      const mockStats = { isDirectory: () => true };
      mockFs.stat.mockResolvedValue(mockStats as any);
      mockFs.readdir
        .mockResolvedValueOnce([
          { name: 'file1.cs', isDirectory: () => false },
          { name: 'subfolder', isDirectory: () => true },
        ] as any)
        .mockResolvedValueOnce([]);

      const result = await service.deleteFolder('Assets/Scripts/ToDelete');

      expect(mockFs.unlink).toHaveBeenCalled();
      expect(mockFs.rmdir).toHaveBeenCalled();
      expect(mockRefreshService.refreshUnityAssets).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Successfully deleted folder');
    });
  });

  describe('batchFileOperations', () => {
    it('should perform multiple operations in batch', async () => {
      mockFileUtils.pathExists.mockResolvedValue(true);

      const operations = [
        { type: 'move' as const, source: 'Assets/file1.cs', destination: 'Assets/Scripts/file1.cs' },
        { type: 'delete' as const, source: 'Assets/file2.cs' },
        { type: 'rename' as const, source: 'Assets/file3.cs', destination: 'file3_renamed.cs' },
      ];

      const result = await service.batchFileOperations(operations);

      expect(mockFs.rename).toHaveBeenCalledTimes(4); // 2 for move, 2 for rename (including meta files)
      expect(mockFs.unlink).toHaveBeenCalledTimes(2); // delete operation
      expect(mockRefreshService.refreshUnityAssets).toHaveBeenCalledTimes(1); // Only once at the end
      expect(result.content[0].text).toContain('Successful: 3');
      expect(result.content[0].text).toContain('Failed: 0');
    });

    it('should continue on errors and report them', async () => {
      // First file exists, second doesn't
      mockFileUtils.pathExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true) // meta check
        .mockResolvedValueOnce(false); // second file doesn't exist

      const operations = [
        { type: 'delete' as const, source: 'Assets/file1.cs' },
        { type: 'delete' as const, source: 'Assets/missing.cs' },
      ];

      const result = await service.batchFileOperations(operations);

      expect(result.content[0].text).toContain('Successful: 1');
      expect(result.content[0].text).toContain('Failed: 1');
      expect(result.content[0].text).toContain('Failed delete Assets/missing.cs');
    });
  });
});