import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as path from 'path';

// Mock fs/promises before importing services
jest.unstable_mockModule('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  stat: jest.fn(),
  readdir: jest.fn(),
  access: jest.fn()
}));

const { ProjectService } = await import('../../src/services/project-service.js');
const { TestHelpers } = await import('../utils/test-helpers.js');
const fs = await import('fs/promises');

describe('ProjectService', () => {
  let projectService: ProjectService;
  let mockLogger: any;
  const testProjectPath = '/test/unity/project';

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = TestHelpers.createMockLogger();
    projectService = new ProjectService(mockLogger);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setProject', () => {
    it('should successfully set a valid Unity project', async () => {
      // Arrange
      const mockFS = TestHelpers.createMockUnityProject(testProjectPath);
      TestHelpers.setupMockFileSystem(mockFS);

      // Act
      const result = await projectService.setProject(testProjectPath);

      // Assert
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Unity project set to:');
      expect(result.content[0].text).toContain(testProjectPath);
    });

    it('should reject invalid project path', async () => {
      // Arrange
      TestHelpers.setupMockFileSystem({});

      // Act & Assert
      await expect(projectService.setProject('/invalid/path')).rejects.toThrow(
        'is not a valid Unity project'
      );
    });

    it('should reject path without ProjectSettings', async () => {
      // Arrange
      TestHelpers.setupMockFileSystem({
        [path.join(testProjectPath, 'Assets')]: { type: 'directory' }
        // Missing ProjectSettings
      });

      // Act & Assert
      await expect(projectService.setProject(testProjectPath)).rejects.toThrow(
        'is not a valid Unity project'
      );
    });

    it('should detect and store Unity version', async () => {
      // Arrange
      const mockFS = TestHelpers.createMockUnityProject(testProjectPath);
      TestHelpers.setupMockFileSystem(mockFS);

      // Act
      await projectService.setProject(testProjectPath);
      const info = await projectService.getProjectInfo();

      // Assert
      expect(info.content[0].text).toContain('Unity Version: 2022.3.10f1');
    });
  });

  describe('getProjectInfo', () => {
    it('should return project info when project is set', async () => {
      // Arrange
      const mockFS = TestHelpers.createMockUnityProject(testProjectPath);
      TestHelpers.setupMockFileSystem(mockFS);
      await projectService.setProject(testProjectPath);

      // Act
      const result = await projectService.getProjectInfo();

      // Assert
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Project Path:');
      expect(result.content[0].text).toContain('Unity Version:');
      expect(result.content[0].text).toContain('Render Pipeline: Built-in');
    });

    it('should return "No project set" when project is not set', async () => {
      // Act
      const result = await projectService.getProjectInfo();

      // Assert
      expect(result.content[0].text).toBe('No Unity project currently set.');
    });
  });

  describe('getRenderPipeline', () => {
    it('should detect Built-in render pipeline', async () => {
      // Arrange
      const mockFS = TestHelpers.createMockUnityProject(testProjectPath);
      TestHelpers.setupMockFileSystem(mockFS);
      await projectService.setProject(testProjectPath);

      // Act
      const pipeline = await projectService.getRenderPipeline();

      // Assert
      expect(pipeline).toBe('Built-in');
    });

    it('should detect URP render pipeline', async () => {
      // Arrange
      const mockFS = TestHelpers.createMockUnityProjectWithURP(testProjectPath);
      TestHelpers.setupMockFileSystem(mockFS);
      await projectService.setProject(testProjectPath);

      // Act
      const pipeline = await projectService.getRenderPipeline();

      // Assert
      expect(pipeline).toBe('URP');
    });

    it('should detect HDRP render pipeline', async () => {
      // Arrange
      const mockFS = TestHelpers.createMockUnityProjectWithHDRP(testProjectPath);
      TestHelpers.setupMockFileSystem(mockFS);
      await projectService.setProject(testProjectPath);

      // Act
      const pipeline = await projectService.getRenderPipeline();

      // Assert
      expect(pipeline).toBe('HDRP');
    });

    it('should throw error when no project is set', async () => {
      // Act & Assert
      await expect(projectService.getRenderPipeline()).rejects.toThrow(
        'No Unity project set'
      );
    });
  });

  describe('getProjectPath', () => {
    it('should return project path when set', async () => {
      // Arrange
      const mockFS = TestHelpers.createMockUnityProject(testProjectPath);
      TestHelpers.setupMockFileSystem(mockFS);
      await projectService.setProject(testProjectPath);

      // Act
      const projectPath = projectService.getProjectPath();

      // Assert
      expect(projectPath).toBe(testProjectPath);
    });

    it('should return null when project is not set', () => {
      // Act
      const projectPath = projectService.getProjectPath();

      // Assert
      expect(projectPath).toBeNull();
    });
  });

  describe('ensureProjectSet', () => {
    it('should not throw when project is set', async () => {
      // Arrange
      const mockFS = TestHelpers.createMockUnityProject(testProjectPath);
      TestHelpers.setupMockFileSystem(mockFS);
      await projectService.setProject(testProjectPath);

      // Act & Assert
      expect(() => projectService.ensureProjectSet()).not.toThrow();
    });

    it('should throw when project is not set', () => {
      // Act & Assert
      expect(() => projectService.ensureProjectSet()).toThrow(
        'No Unity project set. Use project_setup_path first.'
      );
    });
  });
});