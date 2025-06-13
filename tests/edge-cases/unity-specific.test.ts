import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UnityMCPServer } from '../../src/index.js';
import { ConsoleLogger } from '../../src/utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Edge Cases: Unity Specific', () => {
  let server: any;
  let tempDir: string;
  let projectPath: string;
  let mockLogger: ConsoleLogger;

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = path.join(os.tmpdir(), `unity-mcp-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Create mock Unity project structure
    projectPath = path.join(tempDir, 'TestProject');
    fs.mkdirSync(path.join(projectPath, 'Assets', 'Scripts'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'Assets', 'Materials'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'Assets', 'Shaders'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'ProjectSettings'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'Packages'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'Library'), { recursive: true });
    
    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;
    
    // Initialize server
    server = new UnityMCPServer(mockLogger);
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Unity Version Compatibility', () => {
    it('should handle different Unity version formats', async () => {
      const versionFormats = [
        '2019.4.40f1',
        '2020.3.48f1',
        '2021.3.33f1',
        '2022.3.16f1',
        '2023.2.5f1',
        '6000.0.23f1', // Unity 6
        'InvalidVersion',
      ];

      for (const version of versionFormats) {
        // Create ProjectVersion.txt
        const versionPath = path.join(projectPath, 'ProjectSettings', 'ProjectVersion.txt');
        fs.writeFileSync(versionPath, `m_EditorVersion: ${version}`);

        try {
          const result = await server.services.projectService.setProject(projectPath);
          
          if (version === 'InvalidVersion') {
            expect(mockLogger.warn).toHaveBeenCalledWith(
              expect.stringContaining('version'),
              expect.anything()
            );
          } else {
            expect(result.content[0].text).toContain(version);
          }
        } catch (error: any) {
          if (version === 'InvalidVersion') {
            expect(error.message).toContain('version');
          } else {
            throw error;
          }
        }
      }
    });

    it('should handle missing ProjectVersion.txt', async () => {
      // Remove ProjectVersion.txt
      const versionPath = path.join(projectPath, 'ProjectSettings', 'ProjectVersion.txt');
      if (fs.existsSync(versionPath)) {
        fs.unlinkSync(versionPath);
      }

      const result = await server.services.projectService.setProject(projectPath);
      
      // Should still work but warn
      expect(result.content[0].text).toContain('Unity project path set');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('ProjectVersion.txt'),
        expect.anything()
      );
    });
  });

  describe('Render Pipeline Detection', () => {
    it('should detect different render pipelines correctly', async () => {
      const pipelines = [
        {
          name: 'Built-in',
          manifest: {
            dependencies: {}
          }
        },
        {
          name: 'URP',
          manifest: {
            dependencies: {
              "com.unity.render-pipelines.universal": "12.1.13"
            }
          }
        },
        {
          name: 'HDRP',
          manifest: {
            dependencies: {
              "com.unity.render-pipelines.high-definition": "12.1.13"
            }
          }
        },
        {
          name: 'Both (conflict)',
          manifest: {
            dependencies: {
              "com.unity.render-pipelines.universal": "12.1.13",
              "com.unity.render-pipelines.high-definition": "12.1.13"
            }
          }
        }
      ];

      for (const { name, manifest } of pipelines) {
        // Write manifest.json
        const manifestPath = path.join(projectPath, 'Packages', 'manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

        await server.services.projectService.setProject(projectPath);

        if (name === 'Both (conflict)') {
          // Should handle conflicting pipelines
          expect(mockLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining('pipeline'),
            expect.anything()
          );
        }

        // Test shader creation for each pipeline
        const shaderResult = await server.services.shaderService.createShader(
          `TestShader${name.replace(/[^a-zA-Z]/g, '')}`,
          name.includes('URP') ? 'urp' : name.includes('HDRP') ? 'hdrp' : 'builtin'
        );

        expect(shaderResult.content[0].text).toContain('created successfully');
      }
    });

    it('should handle corrupted manifest.json', async () => {
      const corruptedManifests = [
        '{ invalid json',
        '{ "dependencies": null }',
        '{ "dependencies": [] }', // Wrong type
        '', // Empty
        'not json at all',
      ];

      for (const manifest of corruptedManifests) {
        const manifestPath = path.join(projectPath, 'Packages', 'manifest.json');
        fs.writeFileSync(manifestPath, manifest);

        await server.services.projectService.setProject(projectPath);

        // Should default to built-in pipeline
        const shaderResult = await server.services.shaderService.createShader(
          'TestShader',
          'builtin'
        );

        expect(shaderResult.content[0].text).toContain('created successfully');
        expect(mockLogger.warn).toHaveBeenCalled();
      }
    });
  });

  describe('Meta File Handling', () => {
    it('should handle orphaned .meta files', async () => {
      await server.services.projectService.setProject(projectPath);

      // Create orphaned meta files
      const orphanedMetas = [
        'OrphanedScript.cs.meta',
        'OrphanedMaterial.mat.meta',
        'OrphanedShader.shader.meta',
      ];

      for (const metaFile of orphanedMetas) {
        const metaPath = path.join(projectPath, 'Assets', 'Scripts', metaFile);
        fs.writeFileSync(metaPath, `fileFormatVersion: 2
guid: ${Math.random().toString(36).substring(7)}
MonoImporter:
  externalObjects: {}
  serializedVersion: 2`);
      }

      // List scripts should handle orphaned metas
      const result = await server.services.scriptService.listScripts();
      
      // Should not include orphaned metas in script list
      const scripts = result.content[0].text.split('\n').filter(line => line.trim());
      const orphanedInList = scripts.some(script => 
        orphanedMetas.some(meta => script.includes(meta.replace('.meta', '')))
      );
      
      expect(orphanedInList).toBe(false);
    });

    it('should handle duplicate GUIDs', async () => {
      await server.services.projectService.setProject(projectPath);

      const duplicateGuid = '1234567890abcdef1234567890abcdef';

      // Create two scripts with same GUID
      const script1Path = path.join(projectPath, 'Assets', 'Scripts', 'Script1.cs');
      const script2Path = path.join(projectPath, 'Assets', 'Scripts', 'Script2.cs');

      fs.writeFileSync(script1Path, 'public class Script1 { }');
      fs.writeFileSync(script1Path + '.meta', `fileFormatVersion: 2
guid: ${duplicateGuid}`);

      fs.writeFileSync(script2Path, 'public class Script2 { }');
      fs.writeFileSync(script2Path + '.meta', `fileFormatVersion: 2
guid: ${duplicateGuid}`);

      // Operations should handle duplicate GUIDs
      const result = await server.services.scriptService.listScripts();
      expect(result.content[0].text).toContain('Script1.cs');
      expect(result.content[0].text).toContain('Script2.cs');

      // Should warn about duplicates
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('GUID'),
        expect.anything()
      );
    });

    it('should preserve GUIDs when updating files', async () => {
      await server.services.projectService.setProject(projectPath);

      const originalGuid = 'abcdef1234567890abcdef1234567890';
      
      // Create script with specific GUID
      await server.services.scriptService.createScript(
        'PreserveGuid',
        'public class PreserveGuid { }',
        ''
      );

      // Manually set GUID
      const metaPath = path.join(projectPath, 'Assets', 'Scripts', 'PreserveGuid.cs.meta');
      const metaContent = fs.readFileSync(metaPath, 'utf-8');
      fs.writeFileSync(metaPath, metaContent.replace(/guid: \w+/, `guid: ${originalGuid}`));

      // Update script
      await server.services.scriptService.updateScript(
        'PreserveGuid.cs',
        'public class PreserveGuid { public int value; }'
      );

      // Check GUID is preserved
      const updatedMeta = fs.readFileSync(metaPath, 'utf-8');
      expect(updatedMeta).toContain(`guid: ${originalGuid}`);
    });
  });

  describe('Compilation Error Scenarios', () => {
    it('should handle compilation profile with massive errors', async () => {
      await server.services.projectService.setProject(projectPath);

      // Create compilation profile directory
      const beeDir = path.join(projectPath, 'Library', 'Bee');
      fs.mkdirSync(beeDir, { recursive: true });

      // Create profile with many errors
      const errors = [];
      for (let i = 0; i < 1000; i++) {
        errors.push({
          file: `Assets/Scripts/Error${i}.cs`,
          line: Math.floor(Math.random() * 100) + 1,
          column: Math.floor(Math.random() * 80) + 1,
          message: `CS0103: The name 'UndefinedVariable${i}' does not exist in the current context`,
          type: 'error'
        });
      }

      const profile = {
        nodes: [{
          Annotation: 'CSharpCompiler',
          Errors: errors.map(e => ({
            file: e.file,
            line: e.line,
            column: e.column,
            message: e.message
          }))
        }]
      };

      fs.writeFileSync(
        path.join(beeDir, 'fullprofile.json'),
        JSON.stringify(profile)
      );

      // Get compilation errors
      const result = await server.services.compilationService.getCompilationErrors(false);

      // Should handle large error count
      expect(result.content[0].text).toContain('1000 compilation errors found');
      
      // Should truncate or paginate
      const errorList = result.content[0].text.split('\n');
      expect(errorList.length).toBeLessThan(2000); // Reasonable limit
    });

    it('should handle circular dependencies', async () => {
      await server.services.projectService.setProject(projectPath);

      // Create scripts with circular dependencies
      await server.services.scriptService.createScript(
        'CircularA',
        `using UnityEngine;
public class CircularA : MonoBehaviour {
    public CircularB b;
}`,
        ''
      );

      await server.services.scriptService.createScript(
        'CircularB',
        `using UnityEngine;
public class CircularB : MonoBehaviour {
    public CircularC c;
}`,
        ''
      );

      await server.services.scriptService.createScript(
        'CircularC',
        `using UnityEngine;
public class CircularC : MonoBehaviour {
    public CircularA a; // Circular reference
}`,
        ''
      );

      // Analysis should detect potential issues
      const duplicates = await server.services.codeAnalysisService.detectClassDuplicates();
      
      // While not duplicates, the service should complete without hanging
      expect(duplicates.content[0].text).toBeDefined();
    });
  });

  describe('Asset Reference Handling', () => {
    it('should handle materials with missing shaders', async () => {
      await server.services.projectService.setProject(projectPath);

      // Create material referencing non-existent shader
      const materialContent = `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!21 &2100000
Material:
  serializedVersion: 6
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_Name: BrokenMaterial
  m_Shader: {fileID: 4800000, guid: nonexistentshader123456, type: 3}
  m_ShaderKeywords: 
  m_LightmapFlags: 4
  m_EnableInstancingVariants: 0
  m_DoubleSidedGI: 0
  m_CustomRenderQueue: -1`;

      const matPath = path.join(projectPath, 'Assets', 'Materials', 'BrokenMaterial.mat');
      fs.writeFileSync(matPath, materialContent);
      fs.writeFileSync(matPath + '.meta', `fileFormatVersion: 2
guid: brokenmaterial123
NativeFormatImporter:
  externalObjects: {}
  mainObjectFileID: 2100000`);

      // Try to read material
      const result = await server.services.materialService.readMaterial('BrokenMaterial.mat');
      
      // Should handle missing shader reference
      expect(result.content[0].text).toContain('BrokenMaterial');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('shader'),
        expect.anything()
      );
    });

    it('should handle shader variants for different pipelines', async () => {
      await server.services.projectService.setProject(projectPath);

      const shaderTypes = ['builtin', 'urp', 'hdrp', 'urpGraph', 'hdrpGraph'];
      
      for (const shaderType of shaderTypes) {
        try {
          const result = await server.services.shaderService.createShader(
            `TestShader_${shaderType}`,
            shaderType as any
          );

          expect(result.content[0].text).toContain('created successfully');

          // Verify shader content is appropriate for type
          const shaderPath = path.join(projectPath, 'Assets', 'Shaders', `TestShader_${shaderType}.shader`);
          const content = fs.readFileSync(shaderPath, 'utf-8');

          if (shaderType.includes('Graph')) {
            // Graph shaders have different format
            expect(content).toContain('ShaderGraph');
          } else if (shaderType === 'urp') {
            expect(content).toContain('Universal Render Pipeline');
          } else if (shaderType === 'hdrp') {
            expect(content).toContain('High Definition Render Pipeline');
          }
        } catch (error: any) {
          // Some shader types might not be supported
          expect(error.message).toContain('shader type');
        }
      }
    });
  });

  describe('Build Target Edge Cases', () => {
    it('should handle invalid build targets', async () => {
      await server.services.projectService.setProject(projectPath);

      const invalidTargets = [
        'InvalidPlatform',
        'Windows',  // Should be StandaloneWindows64
        'Mac',      // Should be StandaloneOSX
        'Linux',    // Should be StandaloneLinux64
        '',
        null,
      ];

      for (const target of invalidTargets) {
        try {
          const result = await server.services.buildService.buildProject(
            target as any,
            path.join(tempDir, 'Build')
          );

          expect(result.content[0].text).toContain('Error');
        } catch (error: any) {
          expect(error.message).toMatch(/target|platform|invalid/i);
        }
      }
    });

    it('should handle build output path issues', async () => {
      await server.services.projectService.setProject(projectPath);

      const problematicPaths = [
        '/root/restricted',  // Restricted path
        'relative/path',     // Relative path
        '',                  // Empty path
        path.join(projectPath, 'Assets'), // Inside project
      ];

      for (const outputPath of problematicPaths) {
        try {
          const result = await server.services.buildService.buildProject(
            'StandaloneWindows64',
            outputPath
          );

          if (outputPath === '' || outputPath.includes('Assets')) {
            expect(result.content[0].text).toContain('Error');
          }
        } catch (error: any) {
          expect(error.message).toMatch(/path|invalid|access/i);
        }
      }
    });
  });

  describe('Unity Editor Script Behavior', () => {
    it('should handle Editor-only scripts correctly', async () => {
      await server.services.projectService.setProject(projectPath);

      // Create Editor folder
      const editorPath = path.join(projectPath, 'Assets', 'Editor');
      fs.mkdirSync(editorPath, { recursive: true });

      // Create editor script
      const result = await server.services.editorScriptService.createEditorScript(
        'TestEditorWindow',
        'editorWindow',
        {}
      );

      expect(result.content[0].text).toContain('created successfully');

      // Verify script is in Editor folder
      const scriptPath = path.join(editorPath, 'TestEditorWindow.cs');
      expect(fs.existsSync(scriptPath)).toBe(true);

      // Verify script has proper attributes
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).toContain('UnityEditor');
      expect(content).toContain('EditorWindow');
    });

    it('should handle ScriptableObject with complex serialization', async () => {
      await server.services.projectService.setProject(projectPath);

      const complexSO = `using UnityEngine;
using System.Collections.Generic;

[CreateAssetMenu(fileName = "ComplexData", menuName = "Test/ComplexData")]
public class ComplexScriptableObject : ScriptableObject
{
    [System.Serializable]
    public class NestedData
    {
        public string name;
        public float[] values;
        public List<int> indices;
    }

    public NestedData[] dataArray;
    public Dictionary<string, NestedData> dataDict; // Not serializable
    [SerializeField] private int privateField;
    
    [HideInInspector] public string hiddenPublic;
    [NonSerialized] public string notSerialized;
}`;

      const result = await server.services.scriptService.createScript(
        'ComplexScriptableObject',
        complexSO,
        ''
      );

      expect(result.content[0].text).toContain('created successfully');

      // Verify Unity-specific attributes are handled
      const scriptPath = path.join(projectPath, 'Assets', 'Scripts', 'ComplexScriptableObject.cs');
      const content = fs.readFileSync(scriptPath, 'utf-8');
      
      expect(content).toContain('[System.Serializable]');
      expect(content).toContain('[CreateAssetMenu');
      expect(content).toContain('[SerializeField]');
      expect(content).toContain('[HideInInspector]');
      expect(content).toContain('[NonSerialized]');
    });
  });

  describe('Package Dependencies', () => {
    it('should handle missing package dependencies', async () => {
      // Create manifest with dependencies
      const manifestPath = path.join(projectPath, 'Packages', 'manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify({
        dependencies: {
          "com.unity.render-pipelines.universal": "12.1.13",
          "com.custom.nonexistent": "1.0.0",
          "com.unity.textmeshpro": "3.0.6"
        }
      }, null, 2));

      await server.services.projectService.setProject(projectPath);

      // Should still function with missing packages
      const result = await server.services.scriptService.createScript(
        'TestWithMissingDeps',
        'public class TestWithMissingDeps { }',
        ''
      );

      expect(result.content[0].text).toContain('created successfully');
    });
  });
});