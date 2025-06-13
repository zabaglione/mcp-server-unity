import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AssetService } from '../../src/services/asset-service.js';
import { ProjectService } from '../../src/services/project-service.js';
import { TestHelpers } from '../utils/test-helpers.js';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('AssetService', () => {
  let assetService: AssetService;
  let projectService: ProjectService;
  let mockLogger: any;
  const testProjectPath = '/test/unity/project';

  beforeEach(async () => {
    jest.clearAllMocks();
    mockLogger = TestHelpers.createMockLogger();
    projectService = new ProjectService(mockLogger);
    assetService = new AssetService(mockLogger, projectService);

    // Setup mock Unity project
    const mockFS = TestHelpers.createMockUnityProject(testProjectPath);
    
    // Add some test assets
    mockFS[path.join(testProjectPath, 'Assets', 'Materials', 'TestMaterial.mat')] = `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!21 &2100000
Material:
  serializedVersion: 6
  m_ObjectHideFlags: 0
  m_Name: TestMaterial
  m_Shader: {fileID: 46, guid: 0000000000000000f000000000000000, type: 0}`;
    
    mockFS[path.join(testProjectPath, 'Assets', 'Prefabs')] = { type: 'directory' };
    mockFS[path.join(testProjectPath, 'Assets', 'Prefabs', 'Player.prefab')] = `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!1 &100000
GameObject:
  m_Name: Player`;
    
    mockFS[path.join(testProjectPath, 'Assets', 'Scenes', 'MainScene.unity')] = `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!29 &1
OcclusionCullingSettings:
  m_ObjectHideFlags: 0`;

    TestHelpers.setupMockFileSystem(mockFS);
    await projectService.setProject(testProjectPath);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('readAsset', () => {
    it('should read material asset', async () => {
      // Act
      const result = await assetService.readAsset('Materials/TestMaterial.mat');

      // Assert
      expect(result.content[0].text).toContain('TestMaterial');
      expect(result.content[0].text).toContain('m_Shader:');
    });

    it('should read prefab asset', async () => {
      // Act
      const result = await assetService.readAsset('Prefabs/Player.prefab');

      // Assert
      expect(result.content[0].text).toContain('GameObject:');
      expect(result.content[0].text).toContain('m_Name: Player');
    });

    it('should read scene asset', async () => {
      // Act
      const result = await assetService.readAsset('Scenes/MainScene.unity');

      // Assert
      expect(result.content[0].text).toContain('OcclusionCullingSettings:');
    });

    it('should handle asset path with leading slash', async () => {
      // Act
      const result = await assetService.readAsset('/Materials/TestMaterial.mat');

      // Assert
      expect(result.content[0].text).toContain('TestMaterial');
    });

    it('should handle asset path with Assets prefix', async () => {
      // Act
      const result = await assetService.readAsset('Assets/Materials/TestMaterial.mat');

      // Assert
      expect(result.content[0].text).toContain('TestMaterial');
    });

    it('should throw error for non-existent asset', async () => {
      // Act & Assert
      await expect(assetService.readAsset('NonExistent/Asset.mat')).rejects.toThrow(
        'Asset not found'
      );
    });

    it('should throw error when reading directory', async () => {
      // Act & Assert
      await expect(assetService.readAsset('Materials')).rejects.toThrow();
    });
  });

  describe('listAssets', () => {
    it('should list all assets when no filter provided', async () => {
      // Act
      const result = await assetService.listAssets();

      // Assert
      expect(result.content[0].text).toContain('Materials/TestMaterial.mat');
      expect(result.content[0].text).toContain('Prefabs/Player.prefab');
      expect(result.content[0].text).toContain('Scenes/MainScene.unity');
    });

    it('should filter assets by type', async () => {
      // Act
      const result = await assetService.listAssets('mat');

      // Assert
      expect(result.content[0].text).toContain('Materials/TestMaterial.mat');
      expect(result.content[0].text).not.toContain('Player.prefab');
      expect(result.content[0].text).not.toContain('MainScene.unity');
    });

    it('should filter prefabs', async () => {
      // Act
      const result = await assetService.listAssets('prefab');

      // Assert
      expect(result.content[0].text).toContain('Prefabs/Player.prefab');
      expect(result.content[0].text).not.toContain('TestMaterial.mat');
    });

    it('should filter scenes', async () => {
      // Act
      const result = await assetService.listAssets('unity');

      // Assert
      expect(result.content[0].text).toContain('Scenes/MainScene.unity');
      expect(result.content[0].text).not.toContain('TestMaterial.mat');
    });

    it('should return empty list for non-matching filter', async () => {
      // Act
      const result = await assetService.listAssets('xyz');

      // Assert
      expect(result.content[0].text).toContain('Found 0 assets');
    });
  });

  describe('assetExists', () => {
    it('should return true for existing asset', async () => {
      // Act
      const exists = await assetService.assetExists('Materials/TestMaterial.mat');

      // Assert
      expect(exists).toBe(true);
    });

    it('should return false for non-existent asset', async () => {
      // Act
      const exists = await assetService.assetExists('NonExistent/Asset.mat');

      // Assert
      expect(exists).toBe(false);
    });

    it('should handle various path formats', async () => {
      // Act & Assert
      expect(await assetService.assetExists('/Materials/TestMaterial.mat')).toBe(true);
      expect(await assetService.assetExists('Assets/Materials/TestMaterial.mat')).toBe(true);
      expect(await assetService.assetExists('Materials/TestMaterial.mat')).toBe(true);
    });
  });

  describe('getAssetPath', () => {
    it('should return normalized asset path', () => {
      // Act & Assert
      expect(assetService.getAssetPath('Materials/TestMaterial.mat'))
        .toBe(path.join(testProjectPath, 'Assets', 'Materials', 'TestMaterial.mat'));
      
      expect(assetService.getAssetPath('/Materials/TestMaterial.mat'))
        .toBe(path.join(testProjectPath, 'Assets', 'Materials', 'TestMaterial.mat'));
      
      expect(assetService.getAssetPath('Assets/Materials/TestMaterial.mat'))
        .toBe(path.join(testProjectPath, 'Assets', 'Materials', 'TestMaterial.mat'));
    });
  });

  describe('integration with meta files', () => {
    it('should check for meta files', async () => {
      // Arrange - Add meta file
      const mockFS = TestHelpers.createMockUnityProject(testProjectPath);
      mockFS[path.join(testProjectPath, 'Assets', 'TestAsset.txt')] = 'test content';
      mockFS[path.join(testProjectPath, 'Assets', 'TestAsset.txt.meta')] = `fileFormatVersion: 2
guid: abc123def456
TextScriptImporter:
  userData:`;
      
      TestHelpers.setupMockFileSystem(mockFS);

      // Act
      const assets = await assetService.listAssets();

      // Assert
      expect(assets.content[0].text).toContain('TestAsset.txt');
      // Meta files should not be listed as separate assets
      expect(assets.content[0].text).not.toContain('TestAsset.txt.meta');
    });
  });
});