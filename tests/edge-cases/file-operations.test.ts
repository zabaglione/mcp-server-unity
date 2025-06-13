import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UnityMCPServer } from '../../src/index.js';
import { ConsoleLogger } from '../../src/utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Writable } from 'stream';

describe('Edge Cases: File Operations', () => {
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

  describe('Large File Handling', () => {
    it('should handle extremely large script content', async () => {
      // Generate 10MB of code
      const largeContent = `public class LargeScript : MonoBehaviour {\n${
        '    // ' + 'A'.repeat(100) + '\n'.repeat(100000)
      }\n}`;
      
      const startTime = Date.now();
      
      try {
        const result = await server.services.scriptService.createScript(
          'LargeScript',
          largeContent,
          ''
        );
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Should complete within reasonable time (10 seconds)
        expect(duration).toBeLessThan(10000);
        
        // Verify file was created
        const filePath = path.join(projectPath, 'Assets', 'Scripts', 'LargeScript.cs');
        expect(fs.existsSync(filePath)).toBe(true);
        
        // Verify content size
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeGreaterThan(10 * 1024 * 1024); // > 10MB
      } catch (error: any) {
        // Should handle gracefully if system limits are hit
        expect(error.message).toMatch(/size|memory|limit/i);
      }
    });

    it('should handle reading large files efficiently', async () => {
      // Create a large file
      const largePath = path.join(projectPath, 'Assets', 'Scripts', 'LargeFile.cs');
      const stream = fs.createWriteStream(largePath);
      
      // Write 50MB file
      const chunkSize = 1024 * 1024; // 1MB chunks
      const chunks = 50;
      
      for (let i = 0; i < chunks; i++) {
        stream.write('// ' + 'X'.repeat(chunkSize - 3));
      }
      stream.end();
      
      await new Promise(resolve => stream.on('finish', resolve));
      
      // Create .meta file
      fs.writeFileSync(largePath + '.meta', 'fileFormatVersion: 2\nguid: test123\n');
      
      const startTime = Date.now();
      
      try {
        const result = await server.services.scriptService.readScript('LargeFile.cs');
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Should stream or chunk the file efficiently
        expect(duration).toBeLessThan(5000); // 5 seconds max
        
        // Content should be readable
        expect(result.content[0].text).toBeDefined();
      } catch (error: any) {
        // Should provide meaningful error for files too large to handle
        expect(error.message).toMatch(/large|size|memory/i);
      }
    });
  });

  describe('Binary File Handling', () => {
    it('should reject binary files when expecting text', async () => {
      // Create binary file with .cs extension
      const binaryPath = path.join(projectPath, 'Assets', 'Scripts', 'Binary.cs');
      const binaryData = Buffer.from([0xFF, 0xFE, 0x00, 0x01, 0x02, 0x03]);
      fs.writeFileSync(binaryPath, binaryData);
      fs.writeFileSync(binaryPath + '.meta', 'fileFormatVersion: 2\nguid: test123\n');
      
      try {
        const result = await server.services.scriptService.readScript('Binary.cs');
        
        // Should detect binary content
        expect(result.content[0].text).toContain('Error');
      } catch (error: any) {
        expect(error.message).toMatch(/binary|text|encoding/i);
      }
    });

    it('should handle mixed text and binary content', async () => {
      // Create file with mostly text but some binary
      const mixedPath = path.join(projectPath, 'Assets', 'Scripts', 'Mixed.cs');
      const mixedContent = 'public class Mixed {\n' + 
        String.fromCharCode(0, 1, 2, 3) + 
        '\n// Normal comment\n}';
      
      fs.writeFileSync(mixedPath, mixedContent);
      fs.writeFileSync(mixedPath + '.meta', 'fileFormatVersion: 2\nguid: test123\n');
      
      try {
        const result = await server.services.scriptService.readScript('Mixed.cs');
        
        // Should handle or sanitize
        expect(result.content[0].text).toBeDefined();
      } catch (error: any) {
        expect(error.message).toMatch(/encoding|binary/i);
      }
    });
  });

  describe('Concurrent File Operations', () => {
    it('should handle simultaneous writes to same file', async () => {
      const promises = [];
      const fileName = 'ConcurrentTest';
      
      // Attempt 10 simultaneous writes
      for (let i = 0; i < 10; i++) {
        const content = `public class ConcurrentTest${i} : MonoBehaviour { }`;
        promises.push(
          server.services.scriptService.updateScript(fileName + '.cs', content)
            .catch((err: any) => ({ error: err }))
        );
      }
      
      const results = await Promise.all(promises);
      
      // At least one should succeed
      const successes = results.filter(r => !r.error);
      expect(successes.length).toBeGreaterThan(0);
      
      // Others should fail with meaningful errors
      const errors = results.filter(r => r.error);
      errors.forEach(({ error }) => {
        expect(error.message).toMatch(/locked|busy|concurrent|access/i);
      });
    });

    it('should handle concurrent reads while writing', async () => {
      // Create initial file
      await server.services.scriptService.createScript(
        'ConcurrentReadWrite',
        'public class Initial { }',
        ''
      );
      
      // Start a write operation
      const writePromise = server.services.scriptService.updateScript(
        'ConcurrentReadWrite.cs',
        'public class Updated { /* ' + 'X'.repeat(1000000) + ' */ }'
      );
      
      // Attempt multiple reads during write
      const readPromises = [];
      for (let i = 0; i < 5; i++) {
        readPromises.push(
          server.services.scriptService.readScript('ConcurrentReadWrite.cs')
            .catch((err: any) => ({ error: err }))
        );
      }
      
      const [writeResult, ...readResults] = await Promise.all([
        writePromise.catch((err: any) => ({ error: err })),
        ...readPromises
      ]);
      
      // All operations should complete without crashes
      expect(writeResult).toBeDefined();
      expect(readResults.length).toBe(5);
    });
  });

  describe('Disk Space Constraints', () => {
    it('should handle disk full scenarios gracefully', async () => {
      // This test is platform-specific and may not work in all environments
      // We'll simulate by trying to write an extremely large file
      
      const hugeContent = 'X'.repeat(1024 * 1024); // 1MB
      const promises = [];
      
      // Try to create many large files
      for (let i = 0; i < 1000; i++) {
        promises.push(
          server.services.scriptService.createScript(
            `HugeFile${i}`,
            `public class HugeFile${i} { /* ${hugeContent} */ }`,
            ''
          ).catch((err: any) => ({ error: err, index: i }))
        );
      }
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        // Should provide disk space related errors
        const diskErrors = errors.filter(({ error }) => 
          error.message.match(/space|disk|full|ENOSPC/i)
        );
        expect(diskErrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('File Corruption Handling', () => {
    it('should handle corrupted .meta files', async () => {
      // Create script with corrupted meta
      const scriptPath = path.join(projectPath, 'Assets', 'Scripts', 'Corrupted.cs');
      fs.writeFileSync(scriptPath, 'public class Corrupted { }');
      
      // Write corrupted meta file
      fs.writeFileSync(scriptPath + '.meta', 'corrupted\x00\x01\x02data');
      
      try {
        const result = await server.services.scriptService.readScript('Corrupted.cs');
        
        // Should still read the script
        expect(result.content[0].text).toContain('class Corrupted');
        
        // Should warn about meta corruption
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('meta'),
          expect.anything()
        );
      } catch (error: any) {
        // Or handle gracefully
        expect(error.message).toContain('meta');
      }
    });

    it('should handle partially written files', async () => {
      // Create a file that appears to be cut off mid-write
      const partialPath = path.join(projectPath, 'Assets', 'Scripts', 'Partial.cs');
      fs.writeFileSync(partialPath, 'public class Partial {\n    public void Test() {\n        // Incomplete');
      fs.writeFileSync(partialPath + '.meta', 'fileFormatVersion: 2\nguid: test123\n');
      
      const result = await server.services.scriptService.readScript('Partial.cs');
      
      // Should read what's available
      expect(result.content[0].text).toContain('public class Partial');
      expect(result.content[0].text).toContain('// Incomplete');
    });
  });

  describe('File Locking and Permissions', () => {
    it('should handle locked files gracefully', async () => {
      if (process.platform === 'win32') {
        // File locking behavior is different on Windows
        return;
      }
      
      const lockedPath = path.join(projectPath, 'Assets', 'Scripts', 'Locked.cs');
      fs.writeFileSync(lockedPath, 'public class Locked { }');
      fs.writeFileSync(lockedPath + '.meta', 'fileFormatVersion: 2\nguid: test123\n');
      
      // Open file for exclusive access
      const fd = fs.openSync(lockedPath, 'r+');
      
      try {
        // Try to update while locked
        const result = await server.services.scriptService.updateScript(
          'Locked.cs',
          'public class LockedUpdated { }'
        );
        
        // Should handle gracefully
        if (result.content[0].text.includes('Error')) {
          expect(result.content[0].text).toMatch(/locked|busy|access/i);
        }
      } finally {
        fs.closeSync(fd);
      }
    });

    it('should handle permission changes during operation', async () => {
      if (process.platform === 'win32') {
        return; // Skip on Windows
      }
      
      const permPath = path.join(projectPath, 'Assets', 'Scripts', 'PermTest.cs');
      fs.writeFileSync(permPath, 'public class PermTest { }');
      fs.writeFileSync(permPath + '.meta', 'fileFormatVersion: 2\nguid: test123\n');
      
      // Remove write permission
      fs.chmodSync(permPath, 0o444);
      
      try {
        const result = await server.services.scriptService.updateScript(
          'PermTest.cs',
          'public class PermTestUpdated { }'
        );
        
        expect(result.content[0].text).toContain('Error');
        expect(result.content[0].text).toMatch(/permission|access|denied/i);
      } finally {
        // Restore permissions
        fs.chmodSync(permPath, 0o644);
      }
    });
  });

  describe('Special File Types', () => {
    it('should handle zero-byte files', async () => {
      const emptyPath = path.join(projectPath, 'Assets', 'Scripts', 'Empty.cs');
      fs.writeFileSync(emptyPath, '');
      fs.writeFileSync(emptyPath + '.meta', 'fileFormatVersion: 2\nguid: test123\n');
      
      const result = await server.services.scriptService.readScript('Empty.cs');
      
      // Should handle empty files
      expect(result.content[0].text).toBe('');
    });

    it('should handle files with only whitespace', async () => {
      const whitespacePath = path.join(projectPath, 'Assets', 'Scripts', 'Whitespace.cs');
      fs.writeFileSync(whitespacePath, '   \n\t\r\n   \t   ');
      fs.writeFileSync(whitespacePath + '.meta', 'fileFormatVersion: 2\nguid: test123\n');
      
      const result = await server.services.scriptService.readScript('Whitespace.cs');
      
      // Should preserve whitespace
      expect(result.content[0].text).toMatch(/^\s+$/);
    });

    it('should handle files with different line endings', async () => {
      const lineEndings = [
        { name: 'Unix', content: 'line1\nline2\nline3' },
        { name: 'Windows', content: 'line1\r\nline2\r\nline3' },
        { name: 'Mac', content: 'line1\rline2\rline3' },
        { name: 'Mixed', content: 'line1\nline2\r\nline3\rline4' },
      ];
      
      for (const { name, content } of lineEndings) {
        const filePath = path.join(projectPath, 'Assets', 'Scripts', `LineEnding${name}.cs`);
        fs.writeFileSync(filePath, `public class LineEnding${name} {\n${content}\n}`);
        fs.writeFileSync(filePath + '.meta', 'fileFormatVersion: 2\nguid: test123\n');
        
        const result = await server.services.scriptService.readScript(`LineEnding${name}.cs`);
        
        // Should preserve or normalize line endings
        expect(result.content[0].text).toContain('line1');
        expect(result.content[0].text).toContain('line2');
        expect(result.content[0].text).toContain('line3');
      }
    });
  });

  describe('File System Events', () => {
    it('should handle file deletion during read', async () => {
      const deletePath = path.join(projectPath, 'Assets', 'Scripts', 'ToDelete.cs');
      fs.writeFileSync(deletePath, 'public class ToDelete { }');
      fs.writeFileSync(deletePath + '.meta', 'fileFormatVersion: 2\nguid: test123\n');
      
      // Start reading file
      const readPromise = server.services.scriptService.readScript('ToDelete.cs');
      
      // Delete file immediately
      fs.unlinkSync(deletePath);
      fs.unlinkSync(deletePath + '.meta');
      
      try {
        const result = await readPromise;
        // Might succeed if read completed before deletion
        expect(result.content[0].text).toBeDefined();
      } catch (error: any) {
        // Should handle gracefully
        expect(error.message).toMatch(/not found|exist|deleted/i);
      }
    });

    it('should handle directory deletion during operation', async () => {
      const subDir = path.join(projectPath, 'Assets', 'Scripts', 'SubFolder');
      fs.mkdirSync(subDir, { recursive: true });
      
      // Start creating script in subdirectory
      const createPromise = server.services.scriptService.createScript(
        'TestScript',
        'public class TestScript { }',
        'SubFolder'
      );
      
      // Remove directory
      try {
        fs.rmSync(subDir, { recursive: true });
      } catch {
        // Might fail if file is being written
      }
      
      try {
        const result = await createPromise;
        // Check result
        expect(result.content[0].text).toBeDefined();
      } catch (error: any) {
        expect(error.message).toMatch(/directory|exist|deleted/i);
      }
    });
  });
});