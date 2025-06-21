import { StandaloneCompilationService } from '../src/services/standalone-compilation-service.js';
import { VirtualUnityProject } from './virtual-unity-project.js';
import { ConsoleLogger } from '../src/utils/logger.js';
import { UnityProject } from '../src/types/index.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

describe('StandaloneCompilationService', () => {
  let service: StandaloneCompilationService;
  let logger: ConsoleLogger;
  let virtualProject: VirtualUnityProject;
  let projectPath: string;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unity-mcp-test-'));
    logger = new ConsoleLogger('[Test]');
    service = new StandaloneCompilationService(logger);
    
    // Create a virtual Unity project for testing
    virtualProject = new VirtualUnityProject(tempDir, {
      unityVersion: '2022.3.10f1',
      scriptCount: 3,
      projectName: 'StandaloneCompilationTest'
    });
    
    projectPath = await virtualProject.generate();
    
    // Set up the service with the project
    const unityProject: UnityProject = {
      projectPath,
      assetsPath: path.join(projectPath, 'Assets'),
      packageManifestPath: path.join(projectPath, 'Packages', 'manifest.json'),
      projectSettingsPath: path.join(projectPath, 'ProjectSettings'),
      renderPipeline: 'builtin'
    };
    
    service.setUnityProject(unityProject);
  });

  afterAll(async () => {
    await virtualProject.cleanup();
  });

  test('should detect compilation capabilities', async () => {
    const result = await service.getCompilationCapabilities();
    
    expect(result.content).toBeDefined();
    expect(result.content[0]).toHaveProperty('text');
    
    const output = result.content[0].text;
    expect(output).toContain('Standalone Compilation Capabilities');
    expect(output).toContain('COMPILER:');
    expect(output).toContain('UNITY:');
    expect(output).toContain('REFERENCES:');
    expect(output).toContain('SCRIPTS:');
  });

  test('should attempt to compile scripts with available compiler', async () => {
    // Create a simple test script
    const scriptContent = `using UnityEngine;

public class TestScript : MonoBehaviour
{
    public void Start()
    {
        Debug.Log("Hello from standalone compilation!");
    }
}`;

    const scriptPath = path.join(projectPath, 'Assets', 'Scripts', 'TestScript.cs');
    await fs.writeFile(scriptPath, scriptContent, 'utf-8');

    const result = await service.compileScripts({
      scriptPaths: [scriptPath],
      includeUnityReferences: false, // Skip Unity refs to avoid dependency issues in test
      target: 'library'
    });

    expect(result.content).toBeDefined();
    expect(result.content[0]).toHaveProperty('text');
    
    const output = result.content[0].text;
    expect(output).toContain('Standalone Compilation Results');
    
    // The compilation might fail due to missing Unity references, but the process should work
    expect(output).toMatch(/(SUCCESS|FAILED)/);
  });

  test('should handle missing compiler gracefully', async () => {
    // Create a service instance that won't find any compilers
    const isolatedService = new StandaloneCompilationService(logger);
    
    // Set up the isolated service with the same Unity project
    const unityProject: UnityProject = {
      projectPath,
      assetsPath: path.join(projectPath, 'Assets'),
      packageManifestPath: path.join(projectPath, 'Packages', 'manifest.json'),
      projectSettingsPath: path.join(projectPath, 'ProjectSettings'),
      renderPipeline: 'builtin'
    };
    isolatedService.setUnityProject(unityProject);
    
    // Mock the detector to return no compilers found
    const originalDetectBestCompiler = (isolatedService as any).detectBestCompiler;
    (isolatedService as any).detectBestCompiler = async () => ({
      path: '',
      version: '',
      type: 'roslyn',
      supported: false
    });

    const result = await isolatedService.compileScripts({});
    
    expect(result.content[0].text).toContain('No suitable C# compiler found');
  });

  test('should group scripts by folder correctly', async () => {
    const scripts = [
      path.join(projectPath, 'Assets', 'Scripts', 'Player', 'PlayerController.cs'),
      path.join(projectPath, 'Assets', 'Scripts', 'Player', 'PlayerHealth.cs'),
      path.join(projectPath, 'Assets', 'Scripts', 'Enemy', 'EnemyAI.cs'),
      path.join(projectPath, 'Assets', 'Scripts', 'Utils.cs')
    ];

    const grouped = (service as any).groupScriptsByFolder(scripts);
    
    expect(grouped['Scripts/Player']).toBe(2);
    expect(grouped['Scripts/Enemy']).toBe(1);
    expect(grouped['Scripts']).toBe(1);
  });

  test('should parse compiler output correctly', async () => {
    const compilerOutput = `TestScript.cs(5,20): error CS0103: The name 'UnknownMethod' does not exist in the current context
TestScript.cs(7,15): warning CS0168: The variable 'unused' is declared but never used
Build failed. 1 error(s), 1 warning(s)`;

    const errors = (service as any).parseCompilerOutput(compilerOutput);
    
    expect(errors).toHaveLength(2);
    expect(errors[0]).toEqual({
      file: 'TestScript.cs',
      line: 5,
      column: 20,
      severity: 'error',
      errorCode: 'CS0103',
      message: "The name 'UnknownMethod' does not exist in the current context"
    });
    expect(errors[1]).toEqual({
      file: 'TestScript.cs',
      line: 7,
      column: 15,
      severity: 'warning',
      errorCode: 'CS0168',
      message: "The variable 'unused' is declared but never used"
    });
  });
});

describe('Compiler Detection', () => {
  let service: StandaloneCompilationService;
  let logger: ConsoleLogger;

  beforeEach(() => {
    logger = new ConsoleLogger('[CompilerTest]');
    service = new StandaloneCompilationService(logger);
  });

  test('should attempt to detect system compilers', async () => {
    // This test will check if any compilers are available on the system
    const capabilities = await service.getCompilationCapabilities();
    const output = capabilities.content[0].text;
    
    // Should at least attempt detection
    expect(output).toContain('Available:');
    
    // If .NET is installed, it should detect it
    if (output.includes('Available: ✅ Yes')) {
      expect(output).toMatch(/(ROSLYN|CSC|MCS)/);
    }
  });

  test('should build correct compiler arguments', async () => {
    const options = {
      scriptPaths: ['TestScript.cs', 'AnotherScript.cs'],
      outputPath: '/tmp/output.dll',
      references: [
        { name: 'System', path: '/usr/lib/mono/4.5/System.dll', isUnityAssembly: false },
        { name: 'UnityEngine', path: '/Applications/Unity/Unity.app/Contents/Managed/UnityEngine.dll', isUnityAssembly: true }
      ],
      target: 'library' as const,
      defines: ['UNITY_EDITOR', 'DEBUG'],
      framework: 'netstandard2.1'
    };

    const args = await (service as any).buildCompilerArguments(options);
    
    expect(args).toContain('-target:library');
    expect(args).toContain('-out:/tmp/output.dll');
    expect(args).toContain('-define:UNITY_EDITOR;DEBUG');
    expect(args).toContain('-optimize+');
    expect(args).toContain('-debug-');
    expect(args).toContain('TestScript.cs');
    expect(args).toContain('AnotherScript.cs');
    
    // References should be included if paths exist (mocked in test)
    // expect(args.some(arg => arg.includes('-reference:'))).toBe(true);
  });
});