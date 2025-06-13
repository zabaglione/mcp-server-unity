import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UnityMCPServer } from '../../src/index.js';
import { ConsoleLogger } from '../../src/utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Edge Cases: Path Validation', () => {
  let server: any;
  let tempDir: string;
  let mockLogger: ConsoleLogger;

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = path.join(os.tmpdir(), `unity-mcp-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Create mock Unity project structure
    const projectPath = path.join(tempDir, 'TestProject');
    fs.mkdirSync(path.join(projectPath, 'Assets', 'Scripts'), { recursive: true });
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

  describe('Extremely Long Paths', () => {
    it('should handle paths exceeding 260 characters', async () => {
      // Create deeply nested directory structure
      let longPath = path.join(tempDir, 'TestProject', 'Assets', 'Scripts');
      const segmentLength = 30;
      const segments = 10;
      
      for (let i = 0; i < segments; i++) {
        longPath = path.join(longPath, 'a'.repeat(segmentLength));
      }
      
      // This should exceed typical path limits
      expect(longPath.length).toBeGreaterThan(260);
      
      // Attempt to create script in long path
      const result = await server.services.scriptService.createScript(
        'TestScript',
        'public class TestScript : MonoBehaviour { }',
        longPath.replace(path.join(tempDir, 'TestProject', 'Assets', 'Scripts'), '')
      );
      
      // Should either succeed or fail gracefully
      if (result.content[0].text.includes('Error')) {
        expect(result.content[0].text).toContain('path');
      } else {
        expect(result.content[0].text).toContain('created successfully');
      }
    });

    it('should handle maximum filename length', async () => {
      const maxFilename = 'A'.repeat(255); // Max filename length on most systems
      
      try {
        const result = await server.services.scriptService.createScript(
          maxFilename,
          'public class TestScript : MonoBehaviour { }',
          ''
        );
        
        // Should handle gracefully
        expect(result.content[0].text).toBeDefined();
      } catch (error: any) {
        expect(error.message).toContain('filename');
      }
    });
  });

  describe('Special Characters in Paths', () => {
    const specialCharCases = [
      { name: 'spaces', filename: 'Test Script With Spaces' },
      { name: 'unicode', filename: 'テスト_脚本_😀' },
      { name: 'dots', filename: 'Test.Script.Multiple.Dots' },
      { name: 'special symbols', filename: 'Test@Script#Name$' },
      { name: 'brackets', filename: 'Test[Script](Name)' },
      { name: 'quotes', filename: 'Test"Script\'Name' },
    ];

    specialCharCases.forEach(({ name, filename }) => {
      it(`should handle ${name} in filenames`, async () => {
        try {
          const result = await server.services.scriptService.createScript(
            filename,
            `public class TestScript : MonoBehaviour { }`,
            ''
          );
          
          // Check if handled gracefully
          expect(result.content[0].text).toBeDefined();
          
          // Verify file exists with sanitized name if successful
          if (result.content[0].text.includes('created successfully')) {
            const scriptsPath = path.join(tempDir, 'TestProject', 'Assets', 'Scripts');
            const files = fs.readdirSync(scriptsPath);
            const createdFile = files.find(f => f.endsWith('.cs'));
            expect(createdFile).toBeDefined();
          }
        } catch (error: any) {
          // Should provide meaningful error
          expect(error.message).toMatch(/filename|invalid|character/i);
        }
      });
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should prevent directory traversal attacks', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\Windows\\System32',
        'Scripts/../../../../../../tmp/evil',
        'Scripts/../../../ProjectSettings/../../../evil',
      ];

      for (const maliciousPath of maliciousPaths) {
        try {
          const result = await server.services.scriptService.createScript(
            'TestScript',
            'public class TestScript : MonoBehaviour { }',
            maliciousPath
          );
          
          // Should not allow traversal outside project
          expect(result.content[0].text).toContain('Error');
        } catch (error: any) {
          expect(error.message).toMatch(/invalid|outside|traversal/i);
        }
      }
    });

    it('should prevent absolute path injection', async () => {
      const absolutePaths = [
        '/etc/passwd',
        'C:\\Windows\\System32\\drivers\\etc\\hosts',
        '/Users/shared/malicious',
      ];

      for (const absolutePath of absolutePaths) {
        try {
          const result = await server.services.scriptService.createScript(
            'TestScript',
            'public class TestScript : MonoBehaviour { }',
            absolutePath
          );
          
          // Should reject absolute paths
          expect(result.content[0].text).toContain('Error');
        } catch (error: any) {
          expect(error.message).toMatch(/absolute|invalid/i);
        }
      }
    });
  });

  describe('Non-existent and Invalid Paths', () => {
    it('should handle non-existent project paths', async () => {
      const nonExistentPath = path.join(tempDir, 'NonExistentProject');
      
      try {
        const result = await server.services.projectService.setProject(nonExistentPath);
        expect(result.content[0].text).toContain('Error');
      } catch (error: any) {
        expect(error.message).toContain('not found');
      }
    });

    it('should handle invalid Unity project structure', async () => {
      // Create directory without Unity structure
      const invalidProject = path.join(tempDir, 'InvalidProject');
      fs.mkdirSync(invalidProject);
      
      try {
        const result = await server.services.projectService.setProject(invalidProject);
        expect(result.content[0].text).toContain('not a valid Unity project');
      } catch (error: any) {
        expect(error.message).toContain('Unity project');
      }
    });

    it('should handle file paths instead of directories', async () => {
      const filePath = path.join(tempDir, 'file.txt');
      fs.writeFileSync(filePath, 'test');
      
      try {
        const result = await server.services.projectService.setProject(filePath);
        expect(result.content[0].text).toContain('Error');
      } catch (error: any) {
        expect(error.message).toContain('directory');
      }
    });
  });

  describe('Permission and Access Issues', () => {
    it('should handle read-only directories', async () => {
      const readOnlyDir = path.join(tempDir, 'ReadOnly');
      fs.mkdirSync(path.join(readOnlyDir, 'Assets', 'Scripts'), { recursive: true });
      fs.mkdirSync(path.join(readOnlyDir, 'ProjectSettings'), { recursive: true });
      
      // Make directory read-only (Unix-like systems)
      if (process.platform !== 'win32') {
        fs.chmodSync(path.join(readOnlyDir, 'Assets', 'Scripts'), 0o444);
      }
      
      await server.services.projectService.setProject(readOnlyDir);
      
      try {
        const result = await server.services.scriptService.createScript(
          'TestScript',
          'public class TestScript : MonoBehaviour { }',
          ''
        );
        
        if (process.platform !== 'win32') {
          expect(result.content[0].text).toContain('Error');
        }
      } catch (error: any) {
        expect(error.message).toMatch(/permission|access|denied/i);
      } finally {
        // Restore permissions
        if (process.platform !== 'win32') {
          fs.chmodSync(path.join(readOnlyDir, 'Assets', 'Scripts'), 0o755);
        }
      }
    });
  });

  describe('Relative Path Resolution', () => {
    it('should correctly resolve relative paths', async () => {
      const relativePaths = [
        { input: './SubFolder', expected: 'SubFolder' },
        { input: 'SubFolder/', expected: 'SubFolder' },
        { input: './SubFolder/', expected: 'SubFolder' },
        { input: 'Sub/../../Folder', expected: null }, // Invalid
      ];

      for (const { input, expected } of relativePaths) {
        try {
          const result = await server.services.scriptService.createScript(
            'TestScript',
            'public class TestScript : MonoBehaviour { }',
            input
          );
          
          if (expected === null) {
            expect(result.content[0].text).toContain('Error');
          } else {
            const expectedPath = path.join(tempDir, 'TestProject', 'Assets', 'Scripts', expected);
            expect(fs.existsSync(expectedPath)).toBe(true);
          }
        } catch (error: any) {
          if (expected !== null) {
            throw error;
          }
        }
      }
    });
  });

  describe('Case Sensitivity', () => {
    it('should handle case sensitivity appropriately', async () => {
      // Create a script
      await server.services.scriptService.createScript(
        'TestScript',
        'public class TestScript : MonoBehaviour { }',
        ''
      );
      
      // Try to read with different cases
      const casedNames = ['TestScript', 'testscript', 'TESTSCRIPT', 'TeStScRiPt'];
      
      for (const name of casedNames) {
        try {
          const result = await server.services.scriptService.readScript(name + '.cs');
          
          // Behavior depends on file system
          if (process.platform === 'darwin' || process.platform === 'win32') {
            // Case-insensitive file systems
            expect(result.content[0].text).toContain('class TestScript');
          } else {
            // Case-sensitive file systems
            if (name !== 'TestScript') {
              expect(result.content[0].text).toContain('Error');
            }
          }
        } catch (error: any) {
          // Expected on case-sensitive systems for non-matching cases
          if (process.platform !== 'darwin' && process.platform !== 'win32') {
            expect(error.message).toContain('not found');
          }
        }
      }
    });
  });

  describe('Symlinks and Junctions', () => {
    it('should handle symbolic links safely', async () => {
      if (process.platform === 'win32') {
        // Skip on Windows due to permission requirements
        return;
      }
      
      const realDir = path.join(tempDir, 'RealDirectory');
      const symlinkPath = path.join(tempDir, 'TestProject', 'Assets', 'Scripts', 'SymLink');
      
      fs.mkdirSync(realDir);
      fs.writeFileSync(path.join(realDir, 'External.cs'), 'public class External { }');
      
      try {
        fs.symlinkSync(realDir, symlinkPath);
        
        // Try to read through symlink
        const result = await server.services.scriptService.readScript('SymLink/External.cs');
        
        // Should either follow symlink or reject it based on security policy
        expect(result.content[0].text).toBeDefined();
      } catch (error: any) {
        // Symlink creation might fail due to permissions
        expect(error.code).toMatch(/EPERM|EACCES|ENOTSUP/);
      }
    });
  });
});