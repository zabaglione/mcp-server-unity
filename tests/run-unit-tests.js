#!/usr/bin/env node
import { ServicesContainer } from '../build/services-container.js';
import { ConsoleLogger } from '../build/utils/logger.js';
import { VirtualUnityProject } from '../build/tests/virtual-unity-project.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

class UnitTestRunner {
  constructor() {
    this.results = [];
    const logger = new ConsoleLogger('[UnitTest]');
    this.servicesContainer = new ServicesContainer(logger);
    this.services = this.servicesContainer.getServices();
    this.virtualProject = null;
    this.projectPath = '';
  }

  async setup() {
    const testDir = path.join(os.tmpdir(), 'unity-mcp-unit-test-' + Date.now());
    this.virtualProject = new VirtualUnityProject(testDir, { scriptCount: 3 });
    await this.virtualProject.generate();
    this.projectPath = this.virtualProject.getProjectPath();
    await this.services.projectService.setProject(this.projectPath);
  }

  async cleanup() {
    if (this.virtualProject) {
      await this.virtualProject.cleanup();
    }
  }

  async runTest(name, testFn) {
    const start = Date.now();
    try {
      await testFn();
      this.results.push({
        name,
        passed: true,
        duration: Date.now() - start
      });
      console.log(`✅ ${name}`);
    } catch (error) {
      this.results.push({
        name,
        passed: false,
        error: error.message || String(error),
        duration: Date.now() - start
      });
      console.log(`❌ ${name}: ${error}`);
    }
  }

  printSummary() {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    console.log('\n' + '='.repeat(50));
    console.log(`Test Results: ${passed}/${total} passed`);
    console.log('='.repeat(50));
    
    if (passed < total) {
      console.log('\nFailed tests:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  ❌ ${r.name}: ${r.error}`);
      });
    }
    
    console.log(`\nTotal duration: ${this.results.reduce((sum, r) => sum + r.duration, 0)}ms`);
  }

  async runAllTests() {
    console.log('Running Unity MCP Unit Tests...\n');

    try {
      await this.setup();

      // ProjectService Tests
      console.log('Testing ProjectService...');
      await this.runTest('ProjectService: should detect Unity version', async () => {
        const info = await this.services.projectService.getProjectInfo();
        if (!info.content[0].text.includes('2022.3.10f1')) {
          throw new Error('Unity version not detected correctly');
        }
      });

      await this.runTest('ProjectService: should detect render pipeline', async () => {
        const pipeline = await this.services.projectService.detectRenderPipeline();
        if (!pipeline.includes('Built-in')) {
          throw new Error(`Expected Built-in pipeline, got ${pipeline}`);
        }
      });

      await this.runTest('ProjectService: should reject invalid path', async () => {
        try {
          await this.services.projectService.setProject('/invalid/path');
          throw new Error('Should have thrown error');
        } catch (error) {
          if (!error.message.includes('Failed to set Unity project')) {
            throw error;
          }
        }
      });

      // ScriptService Tests
      console.log('\nTesting ScriptService...');
      await this.runTest('ScriptService: should create script', async () => {
        const result = await this.services.scriptService.createScript('UnitTestScript', 'public class UnitTestScript {}');
        if (!result.content[0].text.includes('Script created')) {
          throw new Error('Script creation failed');
        }
        
        const scriptPath = path.join(this.projectPath, 'Assets', 'Scripts', 'UnitTestScript.cs');
        const exists = await fs.access(scriptPath).then(() => true).catch(() => false);
        if (!exists) {
          throw new Error('Script file was not created');
        }
      });

      await this.runTest('ScriptService: should read script', async () => {
        await this.services.scriptService.createScript('ReadTest', 'public class ReadTest { public int value = 42; }');
        const result = await this.services.scriptService.readScript('ReadTest');
        if (!result.content[0].text.includes('public int value = 42;')) {
          throw new Error('Script content not read correctly');
        }
      });

      await this.runTest('ScriptService: should list scripts', async () => {
        const result = await this.services.scriptService.listScripts();
        if (!result.content[0].text.includes('Found') || !result.content[0].text.includes('scripts')) {
          throw new Error('Script listing failed');
        }
      });

      await this.runTest('ScriptService: should create script in subfolder', async () => {
        const content = 'namespace Game.Player { public class NamespaceTest {} }';
        await this.services.scriptService.createScript('NamespaceTest', content, 'Game/Player');
        const scriptPath = path.join(this.projectPath, 'Assets', 'Scripts', 'Game', 'Player', 'NamespaceTest.cs');
        const fileContent = await fs.readFile(scriptPath, 'utf-8');
        if (!fileContent.includes('namespace Game.Player')) {
          throw new Error('Script not created in correct folder');
        }
      });

      // AssetService Tests
      console.log('\nTesting AssetService...');
      await this.runTest('AssetService: should list assets', async () => {
        const result = await this.services.assetService.listAssets();
        if (!result.content[0].text.includes('Found') || !result.content[0].text.includes('assets')) {
          throw new Error('Asset listing failed');
        }
      });

      await this.runTest('AssetService: should get asset counts', async () => {
        const counts = await this.services.assetService.getAssetCounts();
        if (typeof counts.scripts !== 'number' || typeof counts.scenes !== 'number' || typeof counts.materials !== 'number') {
          throw new Error('Asset counts invalid');
        }
        if (counts.scripts < 1) {
          throw new Error('Should have at least 1 script');
        }
      });

      // ShaderService Tests
      console.log('\nTesting ShaderService...');
      await this.runTest('ShaderService: should create builtin shader', async () => {
        const result = await this.services.shaderService.createShader('BuiltinTest', 'builtin');
        if (!result.content[0].text.includes('shader created')) {
          throw new Error('Builtin shader creation failed: ' + result.content[0].text);
        }
        
        const shaderPath = path.join(this.projectPath, 'Assets', 'Shaders', 'BuiltinTest.shader');
        const content = await fs.readFile(shaderPath, 'utf-8');
        if (!content.includes('Shader "Custom/BuiltinTest"')) {
          throw new Error('Builtin shader content incorrect');
        }
      });

      await this.runTest('ShaderService: should create URP shader', async () => {
        const result = await this.services.shaderService.createShader('URPTest', 'urp');
        if (!result.content[0].text.includes('shader created')) {
          throw new Error('URP shader creation failed');
        }
        
        const shaderPath = path.join(this.projectPath, 'Assets', 'Shaders', 'URPTest.shader');
        const content = await fs.readFile(shaderPath, 'utf-8');
        if (!content.includes('Shader "Universal Render Pipeline/Custom/URPTest"')) {
          throw new Error('URP shader content incorrect');
        }
      });

      // MaterialService Tests
      console.log('\nTesting MaterialService...');
      await this.runTest('MaterialService: should create material', async () => {
        const result = await this.services.assetService.createMaterial('TestMaterial');
        if (!result.content[0].text.includes('Material created')) {
          throw new Error('Material creation failed');
        }
        
        const materialPath = path.join(this.projectPath, 'Assets', 'Materials', 'TestMaterial.mat');
        const content = await fs.readFile(materialPath, 'utf-8');
        if (!content.includes('m_Name: TestMaterial')) {
          throw new Error('Material content incorrect');
        }
      });

      await this.runTest('MaterialService: should read material', async () => {
        await this.services.assetService.createMaterial('ReadMat');
        const result = await this.services.materialService.readMaterial('ReadMat');
        if (!result.content[0].text.includes('Material: ReadMat')) {
          throw new Error('Material reading failed');
        }
      });

      // CodeAnalysisService Tests
      console.log('\nTesting CodeAnalysisService...');
      await this.runTest('CodeAnalysisService: should detect duplicates', async () => {
        await this.services.scriptService.createScript('Duplicate', 'public class Duplicate {}', 'Folder1');
        await this.services.scriptService.createScript('Duplicate', 'public class Duplicate {}', 'Folder2');
        
        const result = await this.services.codeAnalysisService.detectClassDuplicates();
        if (!result.content[0].text.includes('Duplicate') || !result.content[0].text.includes('Found in 2 files')) {
          throw new Error('Duplicate detection failed');
        }
      });

      await this.runTest('CodeAnalysisService: should generate diff', async () => {
        await this.services.scriptService.createScript('DiffTest', 'public class DiffTest { public int value = 1; }');
        const newContent = 'public class DiffTest { public int value = 2; }';
        
        const result = await this.services.codeAnalysisService.getFileDiff('DiffTest', newContent);
        if (!result.content[0].text.includes('value = 1') || 
            !result.content[0].text.includes('value = 2')) {
          throw new Error('Diff generation failed: ' + result.content[0].text);
        }
      });

      // Meta File Tests
      console.log('\nTesting Meta File Generation...');
      await this.runTest('Meta files: should create for scripts', async () => {
        await this.services.scriptService.createScript('MetaTest', 'public class MetaTest {}');
        const metaPath = path.join(this.projectPath, 'Assets', 'Scripts', 'MetaTest.cs.meta');
        const exists = await fs.access(metaPath).then(() => true).catch(() => false);
        if (!exists) {
          throw new Error('Meta file not created for script');
        }
        
        const content = await fs.readFile(metaPath, 'utf-8');
        if (!content.includes('guid:') || !content.includes('MonoImporter:')) {
          throw new Error('Meta file content incorrect');
        }
      });

    } catch (error) {
      console.error('Setup error:', error);
    } finally {
      await this.cleanup();
    }

    this.printSummary();
    process.exit(this.results.filter(r => !r.passed).length > 0 ? 1 : 0);
  }
}

// Run tests
const runner = new UnitTestRunner();
runner.runAllTests().catch(console.error);