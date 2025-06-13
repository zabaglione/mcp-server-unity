import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MaterialService } from '../../src/services/material-service.js';
import { ProjectService } from '../../src/services/project-service.js';
import { AssetService } from '../../src/services/asset-service.js';
import { TestHelpers } from '../utils/test-helpers.js';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('MaterialService', () => {
  let materialService: MaterialService;
  let projectService: ProjectService;
  let assetService: AssetService;
  let mockLogger: any;
  const testProjectPath = '/test/unity/project';

  beforeEach(async () => {
    jest.clearAllMocks();
    mockLogger = TestHelpers.createMockLogger();
    projectService = new ProjectService(mockLogger);
    assetService = new AssetService(mockLogger, projectService);
    materialService = new MaterialService(mockLogger, projectService, assetService);

    // Setup mock Unity project
    const mockFS = TestHelpers.createMockUnityProject(testProjectPath);
    
    // Add built-in shader references
    mockFS[path.join(testProjectPath, 'Assets', 'Shaders', 'TestShader.shader')] = `Shader "Custom/TestShader" {
      Properties {
        _MainTex ("Texture", 2D) = "white" {}
        _Color ("Color", Color) = (1,1,1,1)
      }
    }`;
    mockFS[path.join(testProjectPath, 'Assets', 'Shaders', 'TestShader.shader.meta')] = `fileFormatVersion: 2
guid: abc123shader
ShaderImporter:`;

    TestHelpers.setupMockFileSystem(mockFS);
    await projectService.setProject(testProjectPath);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createMaterial', () => {
    it('should create material with Standard shader by default', async () => {
      // Act
      const result = await materialService.createMaterial('TestMaterial');

      // Assert
      expect(result.content[0].text).toContain('Material created: TestMaterial.mat');
      
      const materialPath = path.join(testProjectPath, 'Assets', 'Materials', 'TestMaterial.mat');
      expect(fs.writeFile).toHaveBeenCalledWith(
        materialPath,
        expect.stringContaining('m_Name: TestMaterial')
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        materialPath,
        expect.stringContaining('m_Shader: {fileID: 46, guid: 0000000000000000f000000000000000, type: 0}')
      );
    });

    it('should create material with custom shader', async () => {
      // Act
      const result = await materialService.createMaterial('CustomMaterial', 'Custom/TestShader');

      // Assert
      const materialPath = path.join(testProjectPath, 'Assets', 'Materials', 'CustomMaterial.mat');
      expect(fs.writeFile).toHaveBeenCalledWith(
        materialPath,
        expect.stringContaining('m_Shader: {fileID: 4800000, guid: abc123shader, type: 3}')
      );
    });

    it('should create material in subfolder', async () => {
      // Act
      const result = await materialService.createMaterial('EffectMaterial', 'Standard', 'Effects');

      // Assert
      expect(result.content[0].text).toContain('Location: Assets/Materials/Effects/');
      
      const materialPath = path.join(testProjectPath, 'Assets', 'Materials', 'Effects', 'EffectMaterial.mat');
      expect(fs.mkdir).toHaveBeenCalledWith(
        path.join(testProjectPath, 'Assets', 'Materials', 'Effects'),
        { recursive: true }
      );
    });

    it('should handle URP Lit shader', async () => {
      // Arrange - Switch to URP
      const mockFS = TestHelpers.createMockUnityProjectWithURP(testProjectPath);
      TestHelpers.setupMockFileSystem(mockFS);
      await projectService.setProject(testProjectPath);

      // Act
      const result = await materialService.createMaterial('URPMaterial', 'Universal Render Pipeline/Lit');

      // Assert
      const materialPath = path.join(testProjectPath, 'Assets', 'Materials', 'URPMaterial.mat');
      expect(fs.writeFile).toHaveBeenCalledWith(
        materialPath,
        expect.stringContaining('933532a4fcc0baa4e1a80004822293e9') // URP Lit shader GUID
      );
    });

    it('should create meta file for material', async () => {
      // Act
      await materialService.createMaterial('MetaTestMaterial');

      // Assert
      const metaPath = path.join(testProjectPath, 'Assets', 'Materials', 'MetaTestMaterial.mat.meta');
      expect(fs.writeFile).toHaveBeenCalledWith(
        metaPath,
        expect.stringContaining('guid:')
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        metaPath,
        expect.stringContaining('NativeFormatImporter:')
      );
    });
  });

  describe('readMaterial', () => {
    beforeEach(async () => {
      // Create a test material
      await materialService.createMaterial('ReadTestMaterial', 'Standard');
    });

    it('should read material properties', async () => {
      // Act
      const result = await materialService.readMaterial('ReadTestMaterial');

      // Assert
      expect(result.content[0].text).toContain('Material: ReadTestMaterial');
      expect(result.content[0].text).toContain('Shader: Standard');
      expect(result.content[0].text).toContain('Properties:');
    });

    it('should find material in subfolder', async () => {
      // Arrange
      await materialService.createMaterial('NestedMaterial', 'Standard', 'Nested/Deep');

      // Act
      const result = await materialService.readMaterial('NestedMaterial');

      // Assert
      expect(result.content[0].text).toContain('Material: NestedMaterial');
      expect(result.content[0].text).toContain('Path: Materials/Nested/Deep/NestedMaterial.mat');
    });

    it('should throw error for non-existent material', async () => {
      // Act & Assert
      await expect(materialService.readMaterial('NonExistentMaterial')).rejects.toThrow(
        'Material NonExistentMaterial.mat not found'
      );
    });
  });

  describe('updateMaterialProperty', () => {
    beforeEach(async () => {
      // Create material with properties
      const materialContent = `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!21 &2100000
Material:
  serializedVersion: 6
  m_ObjectHideFlags: 0
  m_Name: UpdateTestMaterial
  m_Shader: {fileID: 46, guid: 0000000000000000f000000000000000, type: 0}
  m_ShaderKeywords: 
  m_LightmapFlags: 4
  m_EnableInstancingVariants: 0
  m_DoubleSidedGI: 0
  m_CustomRenderQueue: -1
  stringTagMap: {}
  disabledShaderPasses: []
  m_SavedProperties:
    serializedVersion: 3
    m_TexEnvs:
    - _MainTex:
        m_Texture: {fileID: 0}
        m_Scale: {x: 1, y: 1}
        m_Offset: {x: 0, y: 0}
    m_Floats:
    - _Glossiness: 0.5
    - _Metallic: 0
    m_Colors:
    - _Color: {r: 1, g: 1, b: 1, a: 1}`;
      
      const mockFS = TestHelpers.createMockUnityProject(testProjectPath);
      mockFS[path.join(testProjectPath, 'Assets', 'Materials', 'UpdateTestMaterial.mat')] = materialContent;
      TestHelpers.setupMockFileSystem(mockFS);
    });

    it('should update color property', async () => {
      // Act
      const result = await materialService.updateMaterialProperty(
        'UpdateTestMaterial',
        '_Color',
        { r: 1, g: 0, b: 0, a: 1 }
      );

      // Assert
      expect(result.content[0].text).toContain('Updated property _Color');
      const materialPath = path.join(testProjectPath, 'Assets', 'Materials', 'UpdateTestMaterial.mat');
      expect(fs.writeFile).toHaveBeenCalledWith(
        materialPath,
        expect.stringContaining('_Color: {r: 1, g: 0, b: 0, a: 1}')
      );
    });

    it('should update float property', async () => {
      // Act
      const result = await materialService.updateMaterialProperty(
        'UpdateTestMaterial',
        '_Metallic',
        0.8
      );

      // Assert
      expect(result.content[0].text).toContain('Updated property _Metallic');
      const materialPath = path.join(testProjectPath, 'Assets', 'Materials', 'UpdateTestMaterial.mat');
      expect(fs.writeFile).toHaveBeenCalledWith(
        materialPath,
        expect.stringContaining('_Metallic: 0.8')
      );
    });

    it('should add new property if not exists', async () => {
      // Act
      const result = await materialService.updateMaterialProperty(
        'UpdateTestMaterial',
        '_NewProperty',
        1.5
      );

      // Assert
      expect(result.content[0].text).toContain('Updated property _NewProperty');
    });
  });

  describe('listMaterials', () => {
    beforeEach(async () => {
      // Create test materials
      await materialService.createMaterial('Material1');
      await materialService.createMaterial('Material2', 'Standard', 'SubFolder');
      await materialService.createMaterial('Material3', 'Standard', 'SubFolder/Nested');
    });

    it('should list all materials in project', async () => {
      // Act
      const result = await materialService.listMaterials();

      // Assert
      expect(result.content[0].text).toContain('Found 3 materials');
      expect(result.content[0].text).toContain('Material1.mat');
      expect(result.content[0].text).toContain('SubFolder/Material2.mat');
      expect(result.content[0].text).toContain('SubFolder/Nested/Material3.mat');
    });
  });

  describe('updateMaterialShader', () => {
    beforeEach(async () => {
      await materialService.createMaterial('ShaderUpdateTest', 'Standard');
    });

    it('should update material to use different shader', async () => {
      // Act
      const result = await materialService.updateMaterialShader(
        'ShaderUpdateTest',
        'Custom/TestShader'
      );

      // Assert
      expect(result.content[0].text).toContain('Updated shader for material ShaderUpdateTest');
      expect(result.content[0].text).toContain('New shader: Custom/TestShader');
    });

    it('should preserve material properties when updating shader', async () => {
      // Arrange - Update a property first
      await materialService.updateMaterialProperty('ShaderUpdateTest', '_Color', { r: 1, g: 0, b: 0, a: 1 });

      // Act
      await materialService.updateMaterialShader('ShaderUpdateTest', 'Custom/TestShader');

      // Assert - The color property should still be preserved
      const materialPath = path.join(testProjectPath, 'Assets', 'Materials', 'ShaderUpdateTest.mat');
      expect(fs.writeFile).toHaveBeenCalledWith(
        materialPath,
        expect.stringContaining('_Color: {r: 1, g: 0, b: 0, a: 1}')
      );
    });
  });

  describe('Error handling', () => {
    it('should throw error when no project is set', async () => {
      // Arrange
      const newProjectService = new ProjectService(mockLogger);
      const newAssetService = new AssetService(mockLogger, newProjectService);
      const newMaterialService = new MaterialService(mockLogger, newProjectService, newAssetService);

      // Act & Assert
      await expect(newMaterialService.createMaterial('Test')).rejects.toThrow(
        'No Unity project set'
      );
    });

    it('should throw error for non-existent shader', async () => {
      // Act & Assert
      await expect(
        materialService.createMaterial('Test', 'NonExistent/Shader')
      ).rejects.toThrow('Shader not found');
    });
  });
});