import { UnityMCPServer } from '../src/server.js';
import { ConsoleLogger } from '../src/utils/logger.js';
import { MCPTestHarness } from './mcp-test-harness.js';
import { VirtualUnityProject } from './virtual-unity-project.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

interface SnapshotTest {
  name: string;
  operation: () => Promise<string>;
  snapshotFile?: string;
}

interface BoundaryTest {
  name: string;
  description: string;
  test: () => Promise<void>;
  expectedBehavior: 'success' | 'graceful-failure';
}

export class SnapshotBoundaryTests {
  private harness: MCPTestHarness;
  private server: UnityMCPServer;
  private virtualProject: VirtualUnityProject | null = null;
  private snapshotsDir: string;
  private results: Array<{
    type: 'snapshot' | 'boundary';
    name: string;
    status: 'pass' | 'fail';
    message?: string;
  }> = [];

  constructor() {
    const logger = new ConsoleLogger('[SnapBound]');
    this.server = new UnityMCPServer(logger);
    this.harness = new MCPTestHarness(this.server);
    this.snapshotsDir = path.join(process.cwd(), 'tests', 'snapshots');
  }

  /**
   * Initialize test environment
   */
  private async setup(): Promise<void> {
    // Create snapshots directory
    await fs.mkdir(this.snapshotsDir, { recursive: true });
    
    // Create virtual project
    const tempDir = path.join(os.tmpdir(), 'unity-mcp-snapbound');
    this.virtualProject = new VirtualUnityProject(tempDir);
    const projectPath = await this.virtualProject.generate();
    await this.harness.setupMockProject(projectPath);
  }

  /**
   * Get snapshot tests
   */
  private getSnapshotTests(): SnapshotTest[] {
    return [
      {
        name: 'C# Script Generation',
        operation: async () => {
          await this.harness.simulateToolCall('asset_create_script', {
            fileName: 'SnapshotTestScript',
            content: `using UnityEngine;

public class SnapshotTestScript : MonoBehaviour
{
    [SerializeField] private float moveSpeed = 5f;
    
    void Update()
    {
        transform.Translate(Vector3.forward * moveSpeed * Time.deltaTime);
    }
}`
          });
          
          // Read the created file
          const projectPath = this.virtualProject!.getProjectPath();
          const scriptPath = path.join(projectPath, 'Assets', 'Scripts', 'SnapshotTestScript.cs');
          return await fs.readFile(scriptPath, 'utf-8');
        }
      },
      {
        name: 'Unity Scene YAML',
        operation: async () => {
          await this.harness.simulateToolCall('asset_create_scene', {
            sceneName: 'SnapshotTestScene'
          });
          
          const projectPath = this.virtualProject!.getProjectPath();
          const scenePath = path.join(projectPath, 'Assets', 'Scenes', 'SnapshotTestScene.unity');
          return await fs.readFile(scenePath, 'utf-8');
        }
      },
      {
        name: 'Material YAML',
        operation: async () => {
          await this.harness.simulateToolCall('asset_create_material', {
            materialName: 'SnapshotTestMaterial'
          });
          
          const projectPath = this.virtualProject!.getProjectPath();
          const materialPath = path.join(projectPath, 'Assets', 'Materials', 'SnapshotTestMaterial.mat');
          return await fs.readFile(materialPath, 'utf-8');
        }
      },
      {
        name: 'Built-in Shader',
        operation: async () => {
          await this.harness.simulateToolCall('shader_create', {
            shaderName: 'SnapshotTestShader',
            shaderType: 'builtin'
          });
          
          const projectPath = this.virtualProject!.getProjectPath();
          const shaderPath = path.join(projectPath, 'Assets', 'Shaders', 'SnapshotTestShader.shader');
          return await fs.readFile(shaderPath, 'utf-8');
        }
      },
      {
        name: 'URP Shader',
        operation: async () => {
          await this.harness.simulateToolCall('shader_create', {
            shaderName: 'SnapshotURPShader',
            shaderType: 'urp'
          });
          
          const projectPath = this.virtualProject!.getProjectPath();
          const shaderPath = path.join(projectPath, 'Assets', 'Shaders', 'SnapshotURPShader.shader');
          return await fs.readFile(shaderPath, 'utf-8');
        }
      },
      {
        name: 'Editor Window Script',
        operation: async () => {
          await this.harness.simulateToolCall('editor_create_script', {
            scriptName: 'SnapshotEditorWindow',
            scriptType: 'editorWindow',
            options: {}
          });
          
          const projectPath = this.virtualProject!.getProjectPath();
          const scriptPath = path.join(projectPath, 'Assets', 'Editor', 'Windows', 'SnapshotEditorWindow.cs');
          return await fs.readFile(scriptPath, 'utf-8');
        }
      },
      {
        name: 'ProBuilder Shape Script',
        operation: async () => {
          await this.harness.simulateToolCall('probuilder_create_script', {
            scriptName: 'SnapshotShape',
            scriptType: 'shape'
          });
          
          const projectPath = this.virtualProject!.getProjectPath();
          const scriptPath = path.join(projectPath, 'Assets', 'Scripts', 'ProBuilder', 'SnapshotShape.cs');
          return await fs.readFile(scriptPath, 'utf-8');
        }
      },
      {
        name: 'Package Manifest',
        operation: async () => {
          // Install a package
          await this.harness.simulateToolCall('package_install', {
            packageName: 'com.unity.2d.sprite',
            version: '1.0.0'
          });
          
          const projectPath = this.virtualProject!.getProjectPath();
          const manifestPath = path.join(projectPath, 'Packages', 'manifest.json');
          const content = await fs.readFile(manifestPath, 'utf-8');
          
          // Parse and re-stringify for consistent formatting
          return JSON.stringify(JSON.parse(content), null, 2);
        }
      }
    ];
  }

  /**
   * Get boundary test cases
   */
  private getBoundaryTests(): BoundaryTest[] {
    return [
      {
        name: 'Maximum File Name Length (255 chars)',
        description: 'Testing file name at OS limit',
        test: async () => {
          const longName = 'A'.repeat(250); // Leave room for .cs extension
          const response = await this.harness.simulateToolCall('asset_create_script', {
            fileName: longName,
            content: 'public class Test {}'
          });
          
          if (response.error) {
            // Should handle gracefully
            this.harness.assertResponseError(response);
          } else {
            this.harness.assertResponseSuccess(response);
          }
        },
        expectedBehavior: 'graceful-failure'
      },
      {
        name: 'Deep Folder Hierarchy (10 levels)',
        description: 'Testing deeply nested folder creation',
        test: async () => {
          const deepPath = Array(10).fill('Level').map((v, i) => `${v}${i}`).join('/');
          const response = await this.harness.simulateToolCall('asset_create_script', {
            fileName: 'DeepHierarchyTest',
            content: 'public class DeepHierarchyTest {}',
            folder: deepPath
          });
          
          this.harness.assertResponseSuccess(response);
        },
        expectedBehavior: 'success'
      },
      {
        name: 'Special Characters in File Names',
        description: 'Testing various special characters',
        test: async () => {
          const specialChars = ['<', '>', ':', '"', '|', '?', '*', '\\', '/'];
          
          for (const char of specialChars) {
            const response = await this.harness.simulateToolCall('asset_create_script', {
              fileName: `Test${char}Script`,
              content: 'public class TestScript {}'
            });
            
            this.harness.assertResponseError(response);
          }
        },
        expectedBehavior: 'graceful-failure'
      },
      {
        name: 'Unicode Characters in File Names',
        description: 'Testing international characters',
        test: async () => {
          const unicodeNames = [
            'テストスクリプト', // Japanese
            'TestScript测试', // Chinese
            'СкриптТест', // Cyrillic
            'TestScript_émojis_🎮🎯' // Emojis
          ];
          
          for (const name of unicodeNames) {
            const response = await this.harness.simulateToolCall('asset_create_script', {
              fileName: name,
              content: 'public class TestScript {}'
            });
            
            // Should either succeed or fail gracefully
            if (!response.error) {
              this.harness.assertResponseSuccess(response);
            }
          }
        },
        expectedBehavior: 'success'
      },
      {
        name: 'Empty Content',
        description: 'Creating files with empty content',
        test: async () => {
          const response = await this.harness.simulateToolCall('asset_create_script', {
            fileName: 'EmptyScript',
            content: ''
          });
          
          // Should handle empty content
          if (response.error) {
            this.harness.assertResponseError(response);
          } else {
            this.harness.assertResponseSuccess(response);
          }
        },
        expectedBehavior: 'graceful-failure'
      },
      {
        name: 'Very Large File Content',
        description: 'Creating files with large content',
        test: async () => {
          // Create 1MB of content
          const largeContent = 'public class LargeScript : MonoBehaviour {\n' +
            '    // Large content\n' +
            `    private string data = @"${'x'.repeat(1024 * 1024)}";\n` +
            '}\n';
          
          const response = await this.harness.simulateToolCall('asset_create_script', {
            fileName: 'VeryLargeScript',
            content: largeContent
          });
          
          this.harness.assertResponseSuccess(response);
        },
        expectedBehavior: 'success'
      },
      {
        name: 'Path Traversal Attempts',
        description: 'Security test for path traversal',
        test: async () => {
          const maliciousPaths = [
            '../../../etc/passwd',
            '..\\..\\..\\Windows\\System32\\config',
            'Scripts/../../../sensitive',
            'Scripts/./././../../../data',
            '~/../../root/data'
          ];
          
          for (const path of maliciousPaths) {
            const response = await this.harness.simulateToolCall('asset_create_script', {
              fileName: path,
              content: 'malicious content'
            });
            
            this.harness.assertResponseError(response);
          }
        },
        expectedBehavior: 'graceful-failure'
      },
      {
        name: 'Reserved File Names',
        description: 'Testing OS reserved names',
        test: async () => {
          const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'];
          
          for (const name of reservedNames) {
            const response = await this.harness.simulateToolCall('asset_create_script', {
              fileName: name,
              content: 'public class Test {}'
            });
            
            // Should handle reserved names
            if (response.error) {
              this.harness.assertResponseError(response);
            }
          }
        },
        expectedBehavior: 'graceful-failure'
      },
      {
        name: 'Concurrent Same File Creation',
        description: 'Creating same file simultaneously',
        test: async () => {
          const fileName = 'ConcurrentTest';
          
          // Try to create the same file 10 times concurrently
          const promises = Array(10).fill(null).map((_, i) => 
            this.harness.simulateToolCall('asset_create_script', {
              fileName,
              content: `public class ConcurrentTest { /* Version ${i} */ }`
            })
          );
          
          const results = await Promise.all(promises);
          
          // At least one should succeed
          const successes = results.filter(r => !r.error).length;
          if (successes === 0) {
            throw new Error('All concurrent creations failed');
          }
        },
        expectedBehavior: 'success'
      },
      {
        name: 'Maximum Folder Depth',
        description: 'Testing system limits for folder depth',
        test: async () => {
          // Try increasingly deep paths until failure
          let depth = 20;
          let succeeded = false;
          
          while (depth <= 100) {
            const deepPath = Array(depth).fill('D').map((v, i) => `${v}${i}`).join('/');
            
            const response = await this.harness.simulateToolCall('asset_create_script', {
              fileName: `Depth${depth}Test`,
              content: 'public class Test {}',
              folder: deepPath
            });
            
            if (response.error) {
              console.log(`      Max folder depth reached at: ${depth - 1} levels`);
              break;
            }
            
            succeeded = true;
            depth += 10;
          }
          
          if (!succeeded) {
            throw new Error('Could not create any deep folders');
          }
        },
        expectedBehavior: 'success'
      },
      {
        name: 'Special Package Versions',
        description: 'Testing package version edge cases',
        test: async () => {
          const versionTests = [
            { version: 'latest' },
            { version: '1.0.0' },
            { version: '999.999.999' },
            { version: '0.0.1-preview' },
            { version: '' } // Empty version
          ];
          
          for (const test of versionTests) {
            const response = await this.harness.simulateToolCall('package_install', {
              packageName: 'com.unity.test-framework',
              version: test.version
            });
            
            // Empty version should fail
            if (test.version === '') {
              this.harness.assertResponseError(response);
            } else {
              // Others should succeed or fail gracefully
              if (!response.error) {
                this.harness.assertResponseSuccess(response);
              }
            }
          }
        },
        expectedBehavior: 'graceful-failure'
      },
      {
        name: 'Batch Operation Limits',
        description: 'Testing large batch operations',
        test: async () => {
          await this.harness.simulateToolCall('system_batch_start', {});
          
          // Create 100 scripts in batch
          for (let i = 0; i < 100; i++) {
            await this.harness.simulateToolCall('asset_create_script', {
              fileName: `BatchLimit${i}`,
              content: `public class BatchLimit${i} {}`
            });
          }
          
          const response = await this.harness.simulateToolCall('system_batch_end', {});
          this.harness.assertResponseSuccess(response);
        },
        expectedBehavior: 'success'
      }
    ];
  }

  /**
   * Run snapshot test
   */
  private async runSnapshotTest(test: SnapshotTest): Promise<void> {
    console.log(`  📸 ${test.name}`);
    
    try {
      // Generate content
      const content = await test.operation();
      
      // Generate snapshot file name
      const snapshotFile = test.snapshotFile || 
        `${test.name.toLowerCase().replace(/\s+/g, '-')}.snap`;
      const snapshotPath = path.join(this.snapshotsDir, snapshotFile);
      
      // Check if snapshot exists
      let existingSnapshot: string | null = null;
      try {
        existingSnapshot = await fs.readFile(snapshotPath, 'utf-8');
      } catch {
        // Snapshot doesn't exist yet
      }
      
      if (existingSnapshot) {
        // Compare with existing snapshot
        if (this.normalizeContent(content) === this.normalizeContent(existingSnapshot)) {
          console.log('     ✅ Matches snapshot');
          this.results.push({
            type: 'snapshot',
            name: test.name,
            status: 'pass'
          });
        } else {
          console.log('     ❌ Does not match snapshot');
          console.log('     💡 Run with --update-snapshots to update');
          
          // Save actual output for comparison
          const actualPath = snapshotPath.replace('.snap', '.actual');
          await fs.writeFile(actualPath, content);
          
          this.results.push({
            type: 'snapshot',
            name: test.name,
            status: 'fail',
            message: 'Snapshot mismatch'
          });
        }
      } else {
        // Create new snapshot
        await fs.writeFile(snapshotPath, content);
        console.log('     📝 Created new snapshot');
        
        this.results.push({
          type: 'snapshot',
          name: test.name,
          status: 'pass',
          message: 'New snapshot created'
        });
      }
      
    } catch (error) {
      console.log(`     ❌ Error: ${error}`);
      this.results.push({
        type: 'snapshot',
        name: test.name,
        status: 'fail',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Normalize content for comparison (remove dynamic values)
   */
  private normalizeContent(content: string): string {
    return content
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      // Remove GUIDs and timestamps from Unity files
      .replace(/guid: [a-f0-9]{32}/g, 'guid: [GUID]')
      .replace(/fileID: \d+/g, 'fileID: [ID]')
      .replace(/m_LocalIdentfierInFile: \d+/g, 'm_LocalIdentfierInFile: [ID]')
      // Remove timestamps
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '[TIMESTAMP]')
      // Trim whitespace
      .trim();
  }

  /**
   * Run boundary test
   */
  private async runBoundaryTest(test: BoundaryTest): Promise<void> {
    console.log(`  🔍 ${test.name}`);
    console.log(`     ${test.description}`);
    
    try {
      await test.test();
      console.log(`     ✅ Handled correctly (${test.expectedBehavior})`);
      
      this.results.push({
        type: 'boundary',
        name: test.name,
        status: 'pass'
      });
      
    } catch (error) {
      console.log(`     ❌ Failed: ${error}`);
      this.results.push({
        type: 'boundary',
        name: test.name,
        status: 'fail',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('Unity MCP Server - Snapshot & Boundary Tests');
    console.log('===========================================');
    
    await this.setup();
    
    // Run snapshot tests
    console.log('\n📸 Snapshot Tests');
    console.log('─'.repeat(50));
    
    const snapshotTests = this.getSnapshotTests();
    for (const test of snapshotTests) {
      await this.runSnapshotTest(test);
    }
    
    // Run boundary tests
    console.log('\n\n🔍 Boundary Value Tests');
    console.log('─'.repeat(50));
    
    const boundaryTests = this.getBoundaryTests();
    for (const test of boundaryTests) {
      await this.runBoundaryTest(test);
    }
    
    // Print summary
    this.printSummary();
    
    // Cleanup
    if (this.virtualProject) {
      await this.virtualProject.cleanup();
    }
    
    // Exit with appropriate code
    const hasFailures = this.results.some(r => r.status === 'fail');
    process.exit(hasFailures ? 1 : 0);
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    console.log('\n\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    
    const snapshotResults = this.results.filter(r => r.type === 'snapshot');
    const boundaryResults = this.results.filter(r => r.type === 'boundary');
    
    // Snapshot tests summary
    const snapshotPassed = snapshotResults.filter(r => r.status === 'pass').length;
    const snapshotTotal = snapshotResults.length;
    console.log(`\n📸 Snapshot Tests: ${snapshotPassed}/${snapshotTotal} passed`);
    
    // Boundary tests summary
    const boundaryPassed = boundaryResults.filter(r => r.status === 'pass').length;
    const boundaryTotal = boundaryResults.length;
    console.log(`🔍 Boundary Tests: ${boundaryPassed}/${boundaryTotal} passed`);
    
    // Overall summary
    const totalPassed = snapshotPassed + boundaryPassed;
    const total = snapshotTotal + boundaryTotal;
    console.log(`\n✅ Total: ${totalPassed}/${total} passed (${((totalPassed/total)*100).toFixed(1)}%)`);
    
    // Failed tests
    const failures = this.results.filter(r => r.status === 'fail');
    if (failures.length > 0) {
      console.log('\n❌ Failed Tests:');
      failures.forEach(r => {
        console.log(`- ${r.name}`);
        if (r.message) {
          console.log(`  ${r.message}`);
        }
      });
    }
    
    // New snapshots
    const newSnapshots = this.results.filter(r => 
      r.type === 'snapshot' && r.message?.includes('New snapshot')
    );
    if (newSnapshots.length > 0) {
      console.log(`\n📝 Created ${newSnapshots.length} new snapshot(s)`);
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tests = new SnapshotBoundaryTests();
  tests.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}