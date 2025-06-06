import { UnityMCPServer } from '../src/server.js';
import { ConsoleLogger } from '../src/utils/logger.js';
import { VirtualUnityProject } from './virtual-unity-project.js';
import * as path from 'path';
import * as os from 'os';

interface E2ETestCase {
  name: string;
  description: string;
  test: () => Promise<void>;
  expectedOutcome: string;
}

interface E2ETestSuite {
  name: string;
  testCases: E2ETestCase[];
}

export class E2EDirectTest {
  private services: any;
  private virtualProject: VirtualUnityProject | null = null;
  private server: UnityMCPServer;
  private projectPath: string = '';
  private results: Array<{
    suite: string;
    test: string;
    status: 'pass' | 'fail';
    error?: string;
    duration: number;
  }> = [];
  
  constructor() {
    const logger = new ConsoleLogger('[E2E]');
    this.server = new UnityMCPServer(logger);
    this.services = (this.server as any).services;
  }

  private getTestSuites(): E2ETestSuite[] {
    return [
      {
        name: 'Project Initialization',
        testCases: [
          {
            name: 'Fresh Project Setup',
            description: 'Setting up a new Unity project from scratch',
            test: async () => {
              const result = await this.services.projectService.setProject(this.projectPath);
              if (!result.content[0].text.includes('Unity project set')) {
                throw new Error('Failed to set project');
              }
              
              const info = await this.services.projectService.getProjectInfo();
              if (!info.content[0].text.includes('2022.3.10f1')) {
                throw new Error('Wrong Unity version');
              }
            },
            expectedOutcome: 'Project initialized successfully'
          },
          {
            name: 'Invalid Project Path',
            description: 'Handling non-existent project paths',
            test: async () => {
              try {
                await this.services.projectService.setProject('/invalid/path/does/not/exist');
                throw new Error('Should have failed');
              } catch (error: any) {
                if (!error.message.includes('valid Unity project')) {
                  throw error;
                }
              }
            },
            expectedOutcome: 'Error handled correctly'
          }
        ]
      },
      {
        name: 'Script Operations',
        testCases: [
          {
            name: 'Create and Read Script',
            description: 'Complete script lifecycle',
            test: async () => {
              const content = `using UnityEngine;

public class E2ETestScript : MonoBehaviour
{
    public string testValue = "E2E Test";
}`;
              
              await this.services.scriptService.createScript('E2ETestScript', content, 'E2ETests');
              const readResult = await this.services.scriptService.readScript('E2ETestScript');
              
              if (!readResult.content[0].text.includes('testValue')) {
                throw new Error('Script content mismatch');
              }
              
              const listResult = await this.services.scriptService.listScripts();
              if (!listResult.content[0].text.includes('E2ETestScript.cs')) {
                throw new Error('Script not in list');
              }
            },
            expectedOutcome: 'Script created and verified'
          },
          {
            name: 'Batch Script Creation',
            description: 'Creating multiple scripts in batch',
            test: async () => {
              await this.services.refreshService.startBatchOperation();
              
              for (let i = 1; i <= 3; i++) {
                await this.services.scriptService.createScript(
                  `BatchScript${i}`,
                  `public class BatchScript${i} : MonoBehaviour {}`
                );
              }
              
              await this.services.refreshService.endBatchOperation();
              
              const listResult = await this.services.scriptService.listScripts();
              for (let i = 1; i <= 3; i++) {
                if (!listResult.content[0].text.includes(`BatchScript${i}.cs`)) {
                  throw new Error(`BatchScript${i} not found`);
                }
              }
            },
            expectedOutcome: 'Batch scripts created'
          }
        ]
      },
      {
        name: 'Asset Creation',
        testCases: [
          {
            name: 'Create All Asset Types',
            description: 'Creating scenes, materials, and shaders',
            test: async () => {
              await this.services.assetService.createScene('E2ETestScene');
              await this.services.assetService.createMaterial('E2ETestMaterial');
              await this.services.shaderService.createShader('E2ETestShader', 'builtin');
              
              const listResult = await this.services.assetService.listAssets('all');
              const text = listResult.content[0].text;
              
              if (!text.includes('E2ETestScene.unity') || 
                  !text.includes('E2ETestMaterial.mat') || 
                  !text.includes('E2ETestShader.shader')) {
                throw new Error('Some assets missing');
              }
            },
            expectedOutcome: 'All assets created'
          }
        ]
      },
      {
        name: 'Editor Extensions',
        testCases: [
          {
            name: 'Create Editor Scripts',
            description: 'Creating various editor extensions',
            test: async () => {
              await this.services.editorScriptService.createEditorScript(
                'E2EEditorWindow', 
                'editorWindow', 
                {}
              );
              
              await this.services.editorScriptService.createEditorScript(
                'E2ECustomEditor',
                'customEditor',
                { targetClass: 'E2ETestScript' }
              );
              
              const listResult = await this.services.editorScriptService.listEditorScripts();
              const text = listResult.content[0].text;
              
              if (!text.includes('E2EEditorWindow.cs') || !text.includes('E2ECustomEditor.cs')) {
                throw new Error('Editor scripts not found');
              }
            },
            expectedOutcome: 'Editor scripts created'
          }
        ]
      },
      {
        name: 'Package Management',
        testCases: [
          {
            name: 'Package Operations',
            description: 'Search and install packages',
            test: async () => {
              const searchResult = await this.services.packageService.searchPackages('2D');
              if (!searchResult.content[0].text.includes('2D')) {
                throw new Error('Package search failed');
              }
              
              await this.services.packageService.installPackage('com.unity.2d.sprite', '1.0.0');
              
              const listResult = await this.services.packageService.listInstalledPackages();
              if (!listResult.content[0].text.includes('com.unity.2d.sprite')) {
                throw new Error('Package not installed');
              }
              
              await this.services.packageService.removePackage('com.unity.2d.sprite');
            },
            expectedOutcome: 'Package operations successful'
          }
        ]
      },
      {
        name: 'Error Handling',
        testCases: [
          {
            name: 'Empty Parameters',
            description: 'Handling missing parameters',
            test: async () => {
              try {
                await this.services.scriptService.createScript('', '');
                throw new Error('Should have failed');
              } catch (error: any) {
                // Expected error
              }
            },
            expectedOutcome: 'Errors handled correctly'
          },
          {
            name: 'Path Traversal Prevention',
            description: 'Security test',
            test: async () => {
              try {
                await this.services.scriptService.createScript('../../../etc/passwd', 'malicious');
                throw new Error('Should have failed');
              } catch (error: any) {
                // Expected error
              }
            },
            expectedOutcome: 'Path traversal blocked'
          }
        ]
      }
    ];
  }

  async runAllTests(): Promise<void> {
    console.log('Unity MCP Server - E2E Direct Tests');
    console.log('===================================');
    
    // Setup virtual project
    const tempDir = path.join(os.tmpdir(), 'unity-mcp-e2e-direct');
    this.virtualProject = new VirtualUnityProject(tempDir);
    this.projectPath = await this.virtualProject.generate();
    
    const suites = this.getTestSuites();
    
    for (const suite of suites) {
      console.log(`\n📦 ${suite.name}`);
      console.log('─'.repeat(40));
      
      for (const testCase of suite.testCases) {
        console.log(`\n  🧪 ${testCase.name}`);
        console.log(`     ${testCase.description}`);
        
        const startTime = Date.now();
        
        try {
          await testCase.test();
          const duration = Date.now() - startTime;
          console.log(`     ✅ PASSED (${duration}ms) - ${testCase.expectedOutcome}`);
          
          this.results.push({
            suite: suite.name,
            test: testCase.name,
            status: 'pass',
            duration
          });
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`     ❌ FAILED (${duration}ms) - ${errorMessage}`);
          
          this.results.push({
            suite: suite.name,
            test: testCase.name,
            status: 'fail',
            error: errorMessage,
            duration
          });
        }
      }
    }
    
    this.printSummary();
    
    // Cleanup
    if (this.virtualProject) {
      await this.virtualProject.cleanup();
    }
    
    const hasFailures = this.results.some(r => r.status === 'fail');
    process.exit(hasFailures ? 1 : 0);
  }

  private printSummary(): void {
    console.log('\n\n' + '='.repeat(60));
    console.log('E2E TEST SUMMARY');
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
          console.log(`- ${r.suite} / ${r.test}`);
          console.log(`  Error: ${r.error}`);
        });
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new E2EDirectTest();
  test.runAllTests().catch(error => {
    console.error('E2E test failed:', error);
    process.exit(1);
  });
}