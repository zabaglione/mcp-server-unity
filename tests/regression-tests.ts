import { TestUtils, TestResult } from './test-utils.js';
import * as path from 'path';
import * as os from 'os';

class RegressionTests {
  private results: TestResult[] = [];
  private testProjectPath: string = '';
  
  async setup(): Promise<void> {
    console.log('Setting up test environment...');
    const tempDir = path.join(os.tmpdir(), 'unity-mcp-tests');
    this.testProjectPath = await TestUtils.createTestProject(tempDir);
    console.log(`Test project created at: ${this.testProjectPath}`);
  }
  
  async cleanup(): Promise<void> {
    console.log('Cleaning up test environment...');
    await TestUtils.cleanupTestProject(this.testProjectPath);
  }
  
  async runTest(
    testCase: string,
    testFn: () => Promise<void>
  ): Promise<void> {
    console.log(`Running: ${testCase}`);
    
    try {
      const { duration } = await TestUtils.measureExecutionTime(testFn);
      this.results.push({
        testCase,
        passed: true,
        message: 'Test passed',
        duration
      });
    } catch (error) {
      this.results.push({
        testCase,
        passed: false,
        message: error instanceof Error ? error.message : String(error),
        duration: 0
      });
    }
  }
  
  // Test Cases
  
  async testSetValidProject(): Promise<void> {
    const result = await TestUtils.runMCPCommand('project_setup_path', {
      projectPath: this.testProjectPath
    });
    
    if (!result.content || !result.content[0].text.includes('success')) {
      throw new Error('Failed to set project path');
    }
  }
  
  async testSetInvalidProject(): Promise<void> {
    try {
      await TestUtils.runMCPCommand('project_setup_path', {
        projectPath: '/invalid/path/that/does/not/exist'
      });
      throw new Error('Expected error for invalid path');
    } catch (error) {
      // Expected error
    }
  }
  
  async testCreateScript(): Promise<void> {
    await TestUtils.runMCPCommand('asset_create_script', {
      fileName: 'TestScript',
      content: 'using UnityEngine;\n\npublic class TestScript : MonoBehaviour\n{\n}'
    });
    
    const scriptPath = path.join(this.testProjectPath, 'Assets', 'Scripts', 'TestScript.cs');
    if (!await TestUtils.fileExists(scriptPath)) {
      throw new Error('Script file was not created');
    }
  }
  
  async testCreateScriptInFolder(): Promise<void> {
    await TestUtils.runMCPCommand('asset_create_script', {
      fileName: 'EnemyAI',
      content: 'using UnityEngine;\n\npublic class EnemyAI : MonoBehaviour\n{\n}',
      folder: 'Enemies'
    });
    
    const scriptPath = path.join(this.testProjectPath, 'Assets', 'Scripts', 'Enemies', 'EnemyAI.cs');
    if (!await TestUtils.fileExists(scriptPath)) {
      throw new Error('Script file was not created in subfolder');
    }
  }
  
  async testListScripts(): Promise<void> {
    const result = await TestUtils.runMCPCommand('asset_list_scripts', {});
    
    if (!result.content || !result.content[0].text.includes('PlayerController.cs')) {
      throw new Error('Script listing did not include expected script');
    }
  }
  
  async testInstallPackage(): Promise<void> {
    await TestUtils.runMCPCommand('package_install', {
      packageName: 'com.unity.probuilder'
    });
    
    const manifestPath = path.join(this.testProjectPath, 'Packages', 'manifest.json');
    const manifest = await TestUtils.readJSON(manifestPath);
    
    if (!manifest.dependencies['com.unity.probuilder']) {
      throw new Error('Package was not added to manifest');
    }
  }
  
  async testSearchPackages(): Promise<void> {
    const result = await TestUtils.runMCPCommand('package_search', {
      query: '2D'
    });
    
    if (!result.content || !result.content[0].text.includes('2D')) {
      throw new Error('Package search did not return expected results');
    }
  }
  
  async testBatchOperations(): Promise<void> {
    await TestUtils.runMCPCommand('system_batch_start', {});
    
    // Create multiple files
    await TestUtils.runMCPCommand('asset_create_script', {
      fileName: 'BatchTest1',
      content: 'public class BatchTest1 {}'
    });
    
    await TestUtils.runMCPCommand('asset_create_script', {
      fileName: 'BatchTest2',
      content: 'public class BatchTest2 {}'
    });
    
    await TestUtils.runMCPCommand('system_batch_end', {});
    
    // Verify files exist
    const file1 = path.join(this.testProjectPath, 'Assets', 'Scripts', 'BatchTest1.cs');
    const file2 = path.join(this.testProjectPath, 'Assets', 'Scripts', 'BatchTest2.cs');
    
    if (!await TestUtils.fileExists(file1) || !await TestUtils.fileExists(file2)) {
      throw new Error('Batch operation files were not created');
    }
  }
  
  async runAllTests(): Promise<void> {
    await this.setup();
    
    try {
      // Project Management Tests
      await this.runTest('TC-001: Set Valid Unity Project Path', () => this.testSetValidProject());
      await this.runTest('TC-002: Set Invalid Unity Project Path', () => this.testSetInvalidProject());
      
      // Script Operations Tests
      await this.runTest('TC-004: Create New Script', () => this.testCreateScript());
      await this.runTest('TC-005: Create Script in Subfolder', () => this.testCreateScriptInFolder());
      await this.runTest('TC-008: List All Scripts', () => this.testListScripts());
      
      // Package Management Tests
      await this.runTest('TC-014: Search Packages', () => this.testSearchPackages());
      await this.runTest('TC-015: Install Single Package', () => this.testInstallPackage());
      
      // System Operations Tests
      await this.runTest('TC-029: Batch Operations', () => this.testBatchOperations());
      
    } finally {
      await this.cleanup();
    }
    
    // Print results
    console.log(TestUtils.formatTestResults(this.results));
    
    // Exit with appropriate code
    const hasFailures = this.results.some(r => !r.passed);
    process.exit(hasFailures ? 1 : 0);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tests = new RegressionTests();
  tests.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}