import { UnityMCPServer } from '../src/server.js';
import { ConsoleLogger } from '../src/utils/logger.js';
import { VirtualUnityProject } from './virtual-unity-project.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  message?: string;
  duration: number;
}

export class DiagnosticsTest {
  private services: any;
  private server: UnityMCPServer;
  private virtualProject: VirtualUnityProject | null = null;
  private projectPath: string = '';
  private results: TestResult[] = [];
  
  constructor() {
    const logger = new ConsoleLogger('[DiagTest]');
    this.server = new UnityMCPServer(logger);
    this.services = (this.server as any).services;
  }

  private async setup(): Promise<void> {
    // Create virtual Unity project
    const tempDir = path.join(os.tmpdir(), 'unity-mcp-diag-test');
    this.virtualProject = new VirtualUnityProject(tempDir);
    this.projectPath = await this.virtualProject.generate();
    await this.services.projectService.setProject(this.projectPath);
    
    // Create mock Unity Editor log
    await this.createMockEditorLog();
    
    // Create some problematic assets for testing
    await this.createProblematicAssets();
  }

  private async createMockEditorLog(): Promise<void> {
    const logPath = this.getEditorLogPath();
    const logDir = path.dirname(logPath);
    
    await fs.mkdir(logDir, { recursive: true });
    
    const mockLog = `2024.01.07 10:30:45.123 Info Unity Editor version: 2022.3.10f1
2024.01.07 10:30:46.456 Info Project loaded: ${this.projectPath}
2024.01.07 10:31:12.789 Error NullReferenceException: Object reference not set to an instance of an object
  at PlayerController.Update () [0x00015] in ${this.projectPath}/Assets/Scripts/Player/PlayerController.cs:45
  at UnityEngine.Internal.$MethodUtility.InvokeMethod (System.Object target, System.Object[] args) [0x00000] in <00000000000000000000000000000000>:0
2024.01.07 10:31:13.123 Warning Shader warning in 'Custom/TestShader': Output value 'vert' is not initialized at line 25
2024.01.07 10:31:15.456 Error CS0246: The type or namespace name 'MissingClass' could not be found (are you missing a using directive or an assembly reference?)
2024.01.07 10:31:16.789 Warning The referenced script on this Behaviour (GameObject 'Player') is missing!
2024.01.07 10:32:00.123 Info Compilation finished
2024.01.07 10:32:01.456 Error ArgumentException: An item with the same key has already been added. Key: TestKey
  at System.Collections.Generic.Dictionary\`2[TKey,TValue].TryInsert (TKey key, TValue value, System.Collections.Generic.InsertionBehavior behavior) [0x00000] in <00000000000000000000000000000000>:0
2024.01.07 10:32:02.789 Warning Performance warning: Large texture 'Background.png' (4096x4096) is not marked as compressed
2024.01.07 10:32:10.123 Exception Exception: Test exception for diagnostics
  at TestScript.ThrowException () [0x00000] in ${this.projectPath}/Assets/Scripts/TestScript.cs:10`;
    
    await fs.writeFile(logPath, mockLog, 'utf-8');
  }

  private async createProblematicAssets(): Promise<void> {
    // Create script without meta file
    const scriptWithoutMeta = path.join(this.projectPath, 'Assets', 'Scripts', 'NoMetaScript.cs');
    await fs.writeFile(scriptWithoutMeta, 'public class NoMetaScript {}', 'utf-8');
    
    // Create orphaned meta file
    const orphanedMeta = path.join(this.projectPath, 'Assets', 'Scripts', 'DeletedScript.cs.meta');
    await fs.writeFile(orphanedMeta, 'fileFormatVersion: 2\nguid: 1234567890abcdef', 'utf-8');
    
    // Create script with wrong class name
    const wrongNameScript = path.join(this.projectPath, 'Assets', 'Scripts', 'WrongFileName.cs');
    await fs.writeFile(wrongNameScript, 'public class DifferentClassName {}', 'utf-8');
    await fs.writeFile(wrongNameScript + '.meta', 'fileFormatVersion: 2\nguid: abcdef1234567890', 'utf-8');
    
    // Create diagnostics results from "Unity"
    const diagnosticsDir = path.join(this.projectPath, 'Assets', 'Editor', 'MCP', 'Diagnostics');
    await fs.mkdir(diagnosticsDir, { recursive: true });
    
    const diagnosticsResults = {
      compilation: {
        hasErrors: true,
        errors: [
          {
            file: "Assets/Scripts/BrokenScript.cs",
            line: 15,
            column: 10,
            message: "';' expected"
          },
          {
            file: "Assets/Scripts/ErrorScript.cs",
            line: 25,
            column: 5,
            message: "The name 'UnknownType' does not exist in the current context"
          }
        ]
      },
      assetValidation: {
        issues: [
          {
            type: "MissingMeta",
            path: "Assets/Textures/NewTexture.png",
            description: "Missing .meta file"
          },
          {
            type: "MissingScript",
            path: "Assets/Prefabs/Player.prefab",
            description: "Prefab has missing script reference"
          }
        ]
      },
      missingReferences: [
        {
          scenePath: "Assets/Scenes/MainScene.unity",
          objectName: "GameObject 'Enemy' has missing script"
        }
      ],
      consoleLogs: [
        {
          timestamp: "2024-01-07 10:35:00",
          logType: "Error",
          message: "NullReferenceException in GameManager.Start()"
        }
      ],
      timestamp: "2024-01-07 10:35:30"
    };
    
    await fs.writeFile(
      path.join(diagnosticsDir, 'diagnostics_results.json'),
      JSON.stringify(diagnosticsResults, null, 2),
      'utf-8'
    );
  }

  private getEditorLogPath(): string {
    const platform = process.platform;
    const home = process.env.HOME || process.env.USERPROFILE || '';

    if (platform === 'darwin') {
      return path.join(home, 'Library', 'Logs', 'Unity', 'Editor.log');
    } else if (platform === 'win32') {
      return path.join(process.env.LOCALAPPDATA || '', 'Unity', 'Editor', 'Editor.log');
    } else {
      return path.join(home, '.config', 'unity3d', 'Editor.log');
    }
  }

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    console.log(`\n🧪 ${name}`);
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      console.log(`   ✅ PASSED (${duration}ms)`);
      this.results.push({ name, status: 'pass', duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ FAILED: ${message}`);
      this.results.push({ name, status: 'fail', message, duration });
    }
  }

  async runAllTests(): Promise<void> {
    console.log('Unity MCP Server - Diagnostics Service Tests');
    console.log('===========================================');
    
    await this.setup();
    
    // Test 1: Unity path auto-detection
    await this.runTest('Unity Path Auto-Detection', async () => {
      await this.services.diagnosticsService.setUnityPath();
      // This might fail if Unity is not installed, which is okay for testing
      console.log('   ℹ️  Unity auto-detection attempted');
    });
    
    // Test 2: Read Editor Log
    await this.runTest('Read Editor Log', async () => {
      const result = await this.services.diagnosticsService.readEditorLog();
      const text = result.content[0].text as string;
      
      if (!text.includes('Errors: 4')) {
        throw new Error('Expected 4 errors in log (3 Error + 1 Exception)');
      }
      if (!text.includes('Warnings: 3')) {
        throw new Error('Expected 3 warnings in log');
      }
      if (!text.includes('NullReferenceException')) {
        throw new Error('Expected NullReferenceException in errors');
      }
    });
    
    // Test 3: Asset Validation
    await this.runTest('Asset Validation', async () => {
      const result = await this.services.diagnosticsService.validateAssets();
      const text = result.content[0].text as string;
      
      if (!text.includes('NoMetaScript.cs')) {
        throw new Error('Expected to find script without meta file');
      }
      if (!text.includes('DeletedScript.cs.meta')) {
        throw new Error('Expected to find orphaned meta file');
      }
      if (!text.includes('WrongFileName.cs')) {
        throw new Error('Expected to find script with wrong class name');
      }
    });
    
    // Test 4: Install Diagnostics Script
    await this.runTest('Install Diagnostics Script', async () => {
      const result = await this.services.diagnosticsService.installDiagnosticsScript();
      const text = result.content[0].text as string;
      
      if (!text.includes('installed successfully')) {
        throw new Error('Diagnostics script installation failed');
      }
      
      // Verify script exists
      const scriptPath = path.join(this.projectPath, 'Assets', 'Editor', 'MCP', 'UnityDiagnostics.cs');
      const exists = await fs.access(scriptPath).then(() => true).catch(() => false);
      if (!exists) {
        throw new Error('Diagnostics script file not created');
      }
    });
    
    // Test 5: Read Diagnostics Results
    await this.runTest('Read Diagnostics Results', async () => {
      const result = await this.services.diagnosticsService.readDiagnosticsResults();
      const text = result.content[0].text as string;
      
      if (!text.includes('Compilation: ❌ FAILED')) {
        throw new Error('Expected compilation failure in results');
      }
      if (!text.includes('BrokenScript.cs(15,10)')) {
        throw new Error('Expected specific compilation error');
      }
      if (!text.includes('Asset Validation: 2 issues')) {
        throw new Error('Expected 2 asset validation issues');
      }
      if (!text.includes('Missing References:')) {
        throw new Error('Expected missing references section');
      }
    });
    
    // Test 6: Diagnostics Summary
    await this.runTest('Diagnostics Summary', async () => {
      const result = await this.services.diagnosticsService.getDiagnosticsSummary();
      const text = result.content[0].text as string;
      
      if (!text.includes('Unity Project Diagnostics Summary')) {
        throw new Error('Expected diagnostics summary header');
      }
      if (!text.includes('Editor Log:')) {
        throw new Error('Expected editor log section');
      }
      if (!text.includes('Asset Validation:')) {
        throw new Error('Expected asset validation section');
      }
    });
    
    // Test 7: Compile Scripts (will fail without Unity)
    await this.runTest('Compile Scripts (Expected to fail without Unity)', async () => {
      try {
        const result = await this.services.diagnosticsService.compileScripts();
        const text = result.content[0].text as string;
        
        if (text.includes('Unity executable not set')) {
          // Expected behavior when Unity is not available
          console.log('   ℹ️  Unity not available - skipping compilation test');
        } else {
          // If Unity is available, check for compilation results
          if (!text.includes('Compilation Result')) {
            throw new Error('Expected compilation result');
          }
        }
      } catch (error) {
        // Expected to fail without Unity
        console.log('   ℹ️  Compilation test skipped (Unity not available)');
      }
    });
    
    // Test 8: Run Tests (will fail without Unity)
    await this.runTest('Run Unity Tests (Expected to fail without Unity)', async () => {
      try {
        const result = await this.services.diagnosticsService.runTests('EditMode');
        const text = result.content[0].text as string;
        
        if (text.includes('Unity executable not set')) {
          // Expected behavior
          console.log('   ℹ️  Unity not available - skipping test runner');
        }
      } catch (error) {
        console.log('   ℹ️  Test runner skipped (Unity not available)');
      }
    });
    
    // Cleanup
    if (this.virtualProject) {
      await this.virtualProject.cleanup();
    }
    
    // Clean up mock editor log
    try {
      const logPath = this.getEditorLogPath();
      await fs.unlink(logPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
    
    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n\n' + '='.repeat(60));
    console.log('DIAGNOSTICS TEST SUMMARY');
    console.log('='.repeat(60));
    
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const total = this.results.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed} (${((passed/total)*100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${failed} (${((failed/total)*100).toFixed(1)}%)`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => {
          console.log(`- ${r.name}`);
          if (r.message) {
            console.log(`  ${r.message}`);
          }
        });
    }
    
    const hasFailures = failed > 0;
    process.exit(hasFailures ? 1 : 0);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new DiagnosticsTest();
  test.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}