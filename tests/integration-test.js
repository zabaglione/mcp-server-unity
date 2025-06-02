#!/usr/bin/env node

// Integration test for Unity MCP Server
// This test actually calls the MCP server functions

import { UnityMCPServer } from '../build/server.js';
import { ConsoleLogger } from '../build/utils/logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

class IntegrationTest {
  constructor(unityProjectPath) {
    this.unityProjectPath = unityProjectPath;
    this.logger = new ConsoleLogger('[Test]');
    this.server = new UnityMCPServer(this.logger);
    this.results = [];
    this.setupHandlers();
  }

  setupHandlers() {
    // Access services through server's private property
    // Note: This is for testing purposes only
    this.services = this.server['services'];
  }

  async runTest(testName, testFn) {
    console.log(`\n🧪 Running: ${testName}`);
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({
        test: testName,
        status: 'PASS',
        duration,
        error: null
      });
      console.log(`✅ PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        test: testName,
        status: 'FAIL',
        duration,
        error: error.message
      });
      console.log(`❌ FAILED: ${error.message}`);
    }
  }

  async runAllTests() {
    console.log('Unity MCP Server Integration Tests');
    console.log('==================================');
    console.log(`Project: ${this.unityProjectPath}`);

    // Test 1: Set Unity Project
    await this.runTest('Set Unity Project Path', async () => {
      const result = await this.services.projectService.setProject(this.unityProjectPath);
      if (!result.content[0].text.includes('Unity project set')) {
        throw new Error('Failed to set project path');
      }
    });

    // Test 2: Get Project Info
    await this.runTest('Get Project Information', async () => {
      const result = await this.services.projectService.getProjectInfo();
      if (!result.content[0].text.includes('Unity')) {
        throw new Error('Failed to get project info');
      }
      console.log(`  Unity Version: ${result.content[0].text.match(/Unity Version: ([\d.f]+)/)?.[1] || 'Unknown'}`);
    });

    // Test 3: Create Script
    await this.runTest('Create C# Script', async () => {
      const testScript = `using UnityEngine;

public class IntegrationTestScript : MonoBehaviour
{
    void Start()
    {
        Debug.Log("Integration test script created successfully!");
    }
}`;
      
      const result = await this.services.scriptService.createScript(
        'IntegrationTestScript',
        testScript,
        'Tests'
      );
      
      // Verify file exists
      const scriptPath = path.join(this.unityProjectPath, 'Assets', 'Scripts', 'Tests', 'IntegrationTestScript.cs');
      await fs.access(scriptPath);
    });

    // Test 4: Read Script
    await this.runTest('Read Created Script', async () => {
      const result = await this.services.scriptService.readScript('IntegrationTestScript');
      if (!result.content[0].text.includes('IntegrationTestScript')) {
        throw new Error('Failed to read created script');
      }
    });

    // Test 5: List Scripts
    await this.runTest('List All Scripts', async () => {
      const result = await this.services.scriptService.listScripts();
      if (!result.content[0].text.includes('IntegrationTestScript.cs')) {
        throw new Error('Created script not found in list');
      }
    });

    // Test 6: Create Scene
    await this.runTest('Create Unity Scene', async () => {
      const result = await this.services.assetService.createScene('IntegrationTestScene');
      const scenePath = path.join(this.unityProjectPath, 'Assets', 'Scenes', 'IntegrationTestScene.unity');
      await fs.access(scenePath);
    });

    // Test 7: Create Material
    await this.runTest('Create Material', async () => {
      const result = await this.services.assetService.createMaterial('IntegrationTestMaterial');
      const materialPath = path.join(this.unityProjectPath, 'Assets', 'Materials', 'IntegrationTestMaterial.mat');
      await fs.access(materialPath);
    });

    // Test 8: Create Shader
    await this.runTest('Create Shader', async () => {
      const result = await this.services.shaderService.createShader(
        'IntegrationTestShader',
        'builtin'
      );
      const shaderPath = path.join(this.unityProjectPath, 'Assets', 'Shaders', 'IntegrationTestShader.shader');
      await fs.access(shaderPath);
    });

    // Test 9: Search Packages
    await this.runTest('Search Unity Packages', async () => {
      const result = await this.services.packageService.searchPackages('2D');
      if (!result.content[0].text.includes('2D')) {
        throw new Error('Package search failed');
      }
    });

    // Test 10: List Installed Packages
    await this.runTest('List Installed Packages', async () => {
      const result = await this.services.packageService.listInstalledPackages();
      if (!result.content[0].text.includes('Installed packages')) {
        throw new Error('Failed to list packages');
      }
    });

    // Test 11: Create Editor Script
    await this.runTest('Create Editor Window Script', async () => {
      const result = await this.services.editorScriptService.createEditorScript(
        'IntegrationTestWindow',
        'editorWindow',
        {}
      );
      const editorPath = path.join(this.unityProjectPath, 'Assets', 'Editor', 'Windows', 'IntegrationTestWindow.cs');
      await fs.access(editorPath);
    });

    // Test 12: Batch Operations
    await this.runTest('Batch Operations', async () => {
      await this.services.refreshService.startBatchOperation();
      
      // Create multiple files
      await this.services.scriptService.createScript('BatchTest1', 'public class BatchTest1 {}');
      await this.services.scriptService.createScript('BatchTest2', 'public class BatchTest2 {}');
      
      await this.services.refreshService.endBatchOperation();
      
      // Verify files exist
      const batch1Path = path.join(this.unityProjectPath, 'Assets', 'Scripts', 'BatchTest1.cs');
      const batch2Path = path.join(this.unityProjectPath, 'Assets', 'Scripts', 'BatchTest2.cs');
      await fs.access(batch1Path);
      await fs.access(batch2Path);
    });

    // Print Summary
    this.printSummary();

    // Cleanup
    await this.cleanup();

    // Return exit code
    const failedTests = this.results.filter(r => r.status === 'FAIL').length;
    return failedTests > 0 ? 1 : 0;
  }

  printSummary() {
    console.log('\n========================================');
    console.log('TEST SUMMARY');
    console.log('========================================');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  - ${r.test}: ${r.error}`);
        });
    }
    
    console.log('\nDetailed Results:');
    this.results.forEach(r => {
      const icon = r.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${r.test} (${r.duration}ms)`);
    });
  }

  async cleanup() {
    console.log('\nCleaning up test files...');
    
    const filesToClean = [
      'Assets/Scripts/Tests/IntegrationTestScript.cs',
      'Assets/Scripts/BatchTest1.cs',
      'Assets/Scripts/BatchTest2.cs',
      'Assets/Scenes/IntegrationTestScene.unity',
      'Assets/Materials/IntegrationTestMaterial.mat',
      'Assets/Shaders/IntegrationTestShader.shader',
      'Assets/Editor/Windows/IntegrationTestWindow.cs'
    ];
    
    for (const file of filesToClean) {
      try {
        await fs.unlink(path.join(this.unityProjectPath, file));
      } catch (error) {
        // Ignore if file doesn't exist
      }
    }
    
    // Try to remove Tests directory if empty
    try {
      await fs.rmdir(path.join(this.unityProjectPath, 'Assets/Scripts/Tests'));
    } catch (error) {
      // Ignore if not empty or doesn't exist
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node integration-test.js <unity-project-path>');
    console.error('Example: node integration-test.js /Users/me/Unity/MyProject');
    process.exit(1);
  }
  
  const projectPath = args[0];
  
  // Verify Unity project
  try {
    await fs.access(path.join(projectPath, 'Assets'));
    await fs.access(path.join(projectPath, 'ProjectSettings'));
  } catch (error) {
    console.error(`Error: Invalid Unity project path: ${projectPath}`);
    console.error('Must contain Assets and ProjectSettings folders.');
    process.exit(1);
  }
  
  const test = new IntegrationTest(projectPath);
  const exitCode = await test.runAllTests();
  process.exit(exitCode);
}

main().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});