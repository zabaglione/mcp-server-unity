import { describe, it, expect } from '@jest/globals';
import { UnityMCPServer } from '../../src/index.js';
import { ConsoleLogger } from '../../src/utils/logger.js';
import { VirtualUnityProject } from '../virtual-unity-project.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

describe('Unity MCP Services - Basic Tests', () => {
  let server: UnityMCPServer;
  let services: any;
  let virtualProject: VirtualUnityProject;
  let projectPath: string;

  beforeEach(async () => {
    // Create server and services
    const logger = new ConsoleLogger('[Test]');
    server = new UnityMCPServer(logger);
    services = (server as any).services;

    // Create virtual project
    const testDir = path.join(os.tmpdir(), 'unity-mcp-test-' + Date.now());
    virtualProject = new VirtualUnityProject(testDir, { scriptCount: 5 });
    await virtualProject.generate();
    projectPath = virtualProject.getProjectPath();
  });

  afterEach(async () => {
    // Cleanup
    if (virtualProject) {
      await virtualProject.cleanup();
    }
  });

  describe('ProjectService', () => {
    it('should set and validate Unity project', async () => {
      const result = await services.projectService.setProject(projectPath);
      expect(result.content[0].text).toContain('Unity project set to:');
      expect(result.content[0].text).toContain(projectPath);
    });

    it('should detect Unity version', async () => {
      await services.projectService.setProject(projectPath);
      const info = await services.projectService.getProjectInfo();
      expect(info.content[0].text).toContain('Unity Version: 2022.3.10f1');
    });

    it('should detect render pipeline', async () => {
      await services.projectService.setProject(projectPath);
      const pipeline = await services.projectService.getRenderPipeline();
      expect(pipeline).toBe('Built-in');
    });
  });

  describe('ScriptService', () => {
    beforeEach(async () => {
      await services.projectService.setProject(projectPath);
    });

    it('should create a new script', async () => {
      const result = await services.scriptService.createScript('TestScript', 'public class TestScript {}');
      expect(result.content[0].text).toContain('Script created: TestScript.cs');
      
      // Verify file exists
      const scriptPath = path.join(projectPath, 'Assets', 'Scripts', 'TestScript.cs');
      const exists = await fs.access(scriptPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should list scripts', async () => {
      const result = await services.scriptService.listScripts();
      expect(result.content[0].text).toContain('Found 5 scripts'); // From virtual project
    });

    it('should read script content', async () => {
      await services.scriptService.createScript('ReadTest', 'public class ReadTest { public int value = 42; }');
      const result = await services.scriptService.readScript('ReadTest');
      expect(result.content[0].text).toContain('public int value = 42;');
    });
  });

  describe('AssetService', () => {
    beforeEach(async () => {
      await services.projectService.setProject(projectPath);
    });

    it('should list assets', async () => {
      const result = await services.assetService.listAssets();
      expect(result.content[0].text).toContain('Found');
      expect(result.content[0].text).toMatch(/Found \d+ assets/);
    });

    it('should check asset existence', async () => {
      // Check for a file we know exists from virtual project
      const exists = await services.assetService.assetExists('Scenes/SampleScene.unity');
      expect(exists).toBe(true);

      const notExists = await services.assetService.assetExists('NonExistent/Asset.mat');
      expect(notExists).toBe(false);
    });
  });

  describe('ShaderService', () => {
    beforeEach(async () => {
      await services.projectService.setProject(projectPath);
    });

    it('should create standard shader', async () => {
      const result = await services.shaderService.createShader('TestShader', 'standard');
      expect(result.content[0].text).toContain('Shader created: TestShader.shader');
      
      // Verify file exists
      const shaderPath = path.join(projectPath, 'Assets', 'Shaders', 'TestShader.shader');
      const exists = await fs.access(shaderPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create unlit shader', async () => {
      const result = await services.shaderService.createShader('UnlitTest', 'unlit');
      expect(result.content[0].text).toContain('Shader created: UnlitTest.shader');
    });

    it('should list shaders', async () => {
      await services.shaderService.createShader('Shader1', 'standard');
      await services.shaderService.createShader('Shader2', 'unlit');
      
      const result = await services.shaderService.listShaders();
      expect(result.content[0].text).toContain('Found');
      expect(result.content[0].text).toContain('shaders');
    });
  });

  describe('MaterialService', () => {
    beforeEach(async () => {
      await services.projectService.setProject(projectPath);
    });

    it('should create material with default shader', async () => {
      const result = await services.materialService.createMaterial('TestMaterial');
      expect(result.content[0].text).toContain('Material created: TestMaterial.mat');
      
      // Verify file exists
      const materialPath = path.join(projectPath, 'Assets', 'Materials', 'TestMaterial.mat');
      const exists = await fs.access(materialPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should list materials', async () => {
      await services.materialService.createMaterial('Mat1');
      await services.materialService.createMaterial('Mat2');
      
      const result = await services.materialService.listMaterials();
      expect(result.content[0].text).toContain('Found');
      expect(result.content[0].text).toContain('materials');
    });

    it('should read material properties', async () => {
      await services.materialService.createMaterial('ReadTestMat');
      const result = await services.materialService.readMaterial('ReadTestMat');
      expect(result.content[0].text).toContain('Material: ReadTestMat');
      expect(result.content[0].text).toContain('Shader:');
    });
  });

  describe('CodeAnalysisService', () => {
    beforeEach(async () => {
      await services.projectService.setProject(projectPath);
    });

    it('should detect duplicate class names', async () => {
      // Create scripts with duplicate names
      await services.scriptService.createScript('DuplicateTest', 'public class DuplicateTest {}', 'Folder1');
      await services.scriptService.createScript('DuplicateTest', 'public class DuplicateTest {}', 'Folder2');
      
      const result = await services.codeAnalysisService.detectDuplicates();
      expect(result.content[0].text).toContain('DuplicateTest');
      expect(result.content[0].text).toContain('2 files');
    });

    it('should generate file diff', async () => {
      // Create initial script
      const oldContent = 'public class DiffTest { public int value = 1; }';
      const newContent = 'public class DiffTest { public int value = 2; public string name = "test"; }';
      
      await services.scriptService.createScript('DiffTest', oldContent);
      
      const result = await services.codeAnalysisService.getFileDiff('DiffTest', newContent);
      expect(result.content[0].text).toContain('-    public int value = 1;');
      expect(result.content[0].text).toContain('+    public int value = 2;');
      expect(result.content[0].text).toContain('+    public string name = "test";');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid project path', async () => {
      await expect(
        services.projectService.setProject('/invalid/path/does/not/exist')
      ).rejects.toThrow('is not a valid Unity project');
    });

    it('should require project to be set for operations', async () => {
      // Try to create script without setting project
      const newServer = new UnityMCPServer(new ConsoleLogger('[Test]'));
      const newServices = (newServer as any).services;
      
      await expect(
        newServices.scriptService.createScript('Test')
      ).rejects.toThrow('No Unity project set');
    });
  });
});