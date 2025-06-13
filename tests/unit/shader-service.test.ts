import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ShaderService } from '../../src/services/shader-service.js';
import { ProjectService } from '../../src/services/project-service.js';
import { TestHelpers } from '../utils/test-helpers.js';
import { SampleShaders } from '../fixtures/sample-shaders.js';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('ShaderService', () => {
  let shaderService: ShaderService;
  let projectService: ProjectService;
  let mockLogger: any;
  const testProjectPath = '/test/unity/project';

  beforeEach(async () => {
    jest.clearAllMocks();
    mockLogger = TestHelpers.createMockLogger();
    projectService = new ProjectService(mockLogger);
    shaderService = new ShaderService(mockLogger, projectService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Built-in Render Pipeline', () => {
    beforeEach(async () => {
      const mockFS = TestHelpers.createMockUnityProject(testProjectPath);
      TestHelpers.setupMockFileSystem(mockFS);
      await projectService.setProject(testProjectPath);
    });

    it('should create standard surface shader', async () => {
      // Act
      const result = await shaderService.createShader('TestShader', 'standard');

      // Assert
      expect(result.content[0].text).toContain('Shader created: TestShader.shader');
      
      const shaderPath = path.join(testProjectPath, 'Assets', 'Shaders', 'TestShader.shader');
      expect(fs.writeFile).toHaveBeenCalledWith(
        shaderPath,
        expect.stringContaining('Shader "Custom/TestShader"')
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        shaderPath,
        expect.stringContaining('#pragma surface surf Standard')
      );
    });

    it('should create unlit shader', async () => {
      // Act
      const result = await shaderService.createShader('UnlitTest', 'unlit');

      // Assert
      const shaderPath = path.join(testProjectPath, 'Assets', 'Shaders', 'UnlitTest.shader');
      expect(fs.writeFile).toHaveBeenCalledWith(
        shaderPath,
        expect.stringContaining('Tags { "RenderType"="Opaque" }')
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        shaderPath,
        expect.stringContaining('#pragma vertex vert')
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        shaderPath,
        expect.stringContaining('#pragma fragment frag')
      );
    });

    it('should create transparent shader', async () => {
      // Act
      const result = await shaderService.createShader('TransparentTest', 'transparent');

      // Assert
      const shaderPath = path.join(testProjectPath, 'Assets', 'Shaders', 'TransparentTest.shader');
      expect(fs.writeFile).toHaveBeenCalledWith(
        shaderPath,
        expect.stringContaining('Tags { "Queue"="Transparent"')
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        shaderPath,
        expect.stringContaining('Blend SrcAlpha OneMinusSrcAlpha')
      );
    });
  });

  describe('URP Render Pipeline', () => {
    beforeEach(async () => {
      const mockFS = TestHelpers.createMockUnityProjectWithURP(testProjectPath);
      TestHelpers.setupMockFileSystem(mockFS);
      await projectService.setProject(testProjectPath);
    });

    it('should create URP lit shader', async () => {
      // Act
      const result = await shaderService.createShader('URPLitTest', 'lit');

      // Assert
      expect(result.content[0].text).toContain('Shader created: URPLitTest.shader');
      expect(result.content[0].text).toContain('(URP)');
      
      const shaderPath = path.join(testProjectPath, 'Assets', 'Shaders', 'URPLitTest.shader');
      expect(fs.writeFile).toHaveBeenCalledWith(
        shaderPath,
        expect.stringContaining('Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }')
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        shaderPath,
        expect.stringContaining('#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"')
      );
    });

    it('should create URP unlit shader', async () => {
      // Act
      const result = await shaderService.createShader('URPUnlitTest', 'unlit');

      // Assert
      const shaderPath = path.join(testProjectPath, 'Assets', 'Shaders', 'URPUnlitTest.shader');
      expect(fs.writeFile).toHaveBeenCalledWith(
        shaderPath,
        expect.stringContaining('HLSLPROGRAM')
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        shaderPath,
        expect.stringContaining('TEXTURE2D(_BaseMap)')
      );
    });
  });

  describe('HDRP Render Pipeline', () => {
    beforeEach(async () => {
      const mockFS = TestHelpers.createMockUnityProjectWithHDRP(testProjectPath);
      TestHelpers.setupMockFileSystem(mockFS);
      await projectService.setProject(testProjectPath);
    });

    it('should create HDRP lit shader', async () => {
      // Act
      const result = await shaderService.createShader('HDRPLitTest', 'lit');

      // Assert
      expect(result.content[0].text).toContain('Shader created: HDRPLitTest.shader');
      expect(result.content[0].text).toContain('(HDRP)');
      
      const shaderPath = path.join(testProjectPath, 'Assets', 'Shaders', 'HDRPLitTest.shader');
      expect(fs.writeFile).toHaveBeenCalledWith(
        shaderPath,
        expect.stringContaining('Tags{ "RenderPipeline" = "HDRenderPipeline" }')
      );
    });
  });

  describe('Custom shaders', () => {
    beforeEach(async () => {
      const mockFS = TestHelpers.createMockUnityProject(testProjectPath);
      TestHelpers.setupMockFileSystem(mockFS);
      await projectService.setProject(testProjectPath);
    });

    it('should create shader with custom content', async () => {
      // Act
      const result = await shaderService.createShader(
        'CustomShader',
        'custom',
        SampleShaders.standardShader
      );

      // Assert
      const shaderPath = path.join(testProjectPath, 'Assets', 'Shaders', 'CustomShader.shader');
      expect(fs.writeFile).toHaveBeenCalledWith(
        shaderPath,
        expect.stringContaining('Shader "Custom/StandardTest"')
      );
    });

    it('should create shader in subfolder', async () => {
      // Act
      const result = await shaderService.createShader(
        'EffectShader',
        'standard',
        undefined,
        'Effects'
      );

      // Assert
      expect(result.content[0].text).toContain('Location: Assets/Shaders/Effects/');
      
      const shaderPath = path.join(testProjectPath, 'Assets', 'Shaders', 'Effects', 'EffectShader.shader');
      expect(fs.mkdir).toHaveBeenCalledWith(
        path.join(testProjectPath, 'Assets', 'Shaders', 'Effects'),
        { recursive: true }
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        shaderPath,
        expect.any(String)
      );
    });
  });

  describe('Meta file generation', () => {
    beforeEach(async () => {
      const mockFS = TestHelpers.createMockUnityProject(testProjectPath);
      TestHelpers.setupMockFileSystem(mockFS);
      await projectService.setProject(testProjectPath);
    });

    it('should create meta file for shader', async () => {
      // Act
      await shaderService.createShader('MetaTestShader', 'standard');

      // Assert
      const metaPath = path.join(testProjectPath, 'Assets', 'Shaders', 'MetaTestShader.shader.meta');
      expect(fs.writeFile).toHaveBeenCalledWith(
        metaPath,
        expect.stringContaining('guid:')
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        metaPath,
        expect.stringContaining('ShaderImporter:')
      );
    });
  });

  describe('Error handling', () => {
    it('should throw error when no project is set', async () => {
      // Act & Assert
      await expect(shaderService.createShader('Test', 'standard')).rejects.toThrow(
        'No Unity project set'
      );
    });

    it('should throw error for invalid shader type', async () => {
      // Arrange
      const mockFS = TestHelpers.createMockUnityProject(testProjectPath);
      TestHelpers.setupMockFileSystem(mockFS);
      await projectService.setProject(testProjectPath);

      // Act & Assert
      await expect(shaderService.createShader('Test', 'invalid' as any)).rejects.toThrow(
        'Unknown shader type'
      );
    });
  });

  describe('listShaders', () => {
    beforeEach(async () => {
      const mockFS = TestHelpers.createMockUnityProject(testProjectPath);
      
      // Add some test shaders
      mockFS[path.join(testProjectPath, 'Assets', 'Shaders', 'TestShader1.shader')] = 'Shader "Custom/Test1" {}';
      mockFS[path.join(testProjectPath, 'Assets', 'Shaders', 'TestShader2.shader')] = 'Shader "Custom/Test2" {}';
      mockFS[path.join(testProjectPath, 'Assets', 'Shaders', 'Effects')] = { type: 'directory' };
      mockFS[path.join(testProjectPath, 'Assets', 'Shaders', 'Effects', 'Glow.shader')] = 'Shader "Effects/Glow" {}';
      
      TestHelpers.setupMockFileSystem(mockFS);
      await projectService.setProject(testProjectPath);
    });

    it('should list all shaders in project', async () => {
      // Act
      const result = await shaderService.listShaders();

      // Assert
      expect(result.content[0].text).toContain('Found 3 shaders');
      expect(result.content[0].text).toContain('TestShader1.shader');
      expect(result.content[0].text).toContain('TestShader2.shader');
      expect(result.content[0].text).toContain('Effects/Glow.shader');
    });
  });
});