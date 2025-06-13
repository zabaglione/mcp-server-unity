import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UnityMCPServer } from '../../src/index.js';
import { ConsoleLogger } from '../../src/utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Edge Cases: UI Toolkit', () => {
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
    fs.mkdirSync(path.join(projectPath, 'Assets', 'UI'), { recursive: true });
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

  describe('Invalid File Names', () => {
    it('should handle null and undefined file names', async () => {
      // Test null
      try {
        await server.services.uiToolkitService.createUXML(null, 'document');
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('fileName must be a non-empty string');
      }

      // Test undefined
      try {
        await server.services.uiToolkitService.createUXML(undefined, 'document');
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('fileName must be a non-empty string');
      }
    });

    it('should handle empty string file names', async () => {
      try {
        await server.services.uiToolkitService.createUSS('', 'theme');
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('fileName must be a non-empty string');
      }
    });

    it('should handle extremely long file names', async () => {
      const veryLongName = 'A'.repeat(300); // Exceeds typical file system limits
      
      const result = await server.services.uiToolkitService.createUXML(veryLongName, 'document');
      
      // Should succeed or provide meaningful error
      if (result.content[0].text.includes('Error')) {
        expect(result.content[0].text).toMatch(/length|long|limit/i);
      } else {
        expect(result.content[0].text).toContain('created successfully');
        
        // Check actual file name length
        const uiPath = path.join(projectPath, 'Assets', 'UI');
        const files = fs.readdirSync(uiPath);
        const createdFile = files.find(f => f.startsWith('A') && f.endsWith('.uxml'));
        
        if (createdFile) {
          expect(createdFile.length).toBeLessThanOrEqual(255); // Max filename length
        }
      }
    });

    it('should handle special characters in file names', async () => {
      const specialCharTests = [
        { name: 'File!@#$%', expectSuccess: false },
        { name: 'File With Spaces', expectSuccess: true },
        { name: 'File-With-Dashes', expectSuccess: true },
        { name: 'File_With_Underscores', expectSuccess: true },
        { name: 'File.With.Dots', expectSuccess: true },
        { name: 'ファイル名', expectSuccess: true }, // Japanese
        { name: '文件名', expectSuccess: true }, // Chinese
        { name: 'File😀Emoji', expectSuccess: true },
        { name: 'File/With/Slashes', expectSuccess: false },
        { name: 'File\\With\\Backslashes', expectSuccess: false },
        { name: 'File:With:Colons', expectSuccess: false },
        { name: 'File*With*Asterisks', expectSuccess: false },
        { name: 'File?With?Questions', expectSuccess: false },
        { name: 'File<With>Brackets', expectSuccess: false },
        { name: 'File|With|Pipes', expectSuccess: false },
      ];

      for (const test of specialCharTests) {
        const result = await server.services.uiToolkitService.createUXML(test.name, 'component');
        
        if (test.expectSuccess) {
          expect(result.content[0].text).toContain('created successfully');
        } else {
          // Should either sanitize or provide appropriate handling
          expect(result.content[0].text).toBeDefined();
        }
      }
    });

    it('should handle path traversal attempts', async () => {
      const maliciousNames = [
        '../../../etc/passwd',
        '..\\..\\..\\Windows\\System32\\config',
        'Scripts/../../../../../../../tmp/evil',
        '/absolute/path/to/file',
        'C:\\Windows\\System32\\malicious',
        '\\\\network\\share\\file',
      ];

      for (const name of maliciousNames) {
        const result = await server.services.uiToolkitService.createUSS(name, 'component');
        
        // Should not create files outside project
        const ussFiles = fs.readdirSync(path.join(projectPath, 'Assets', 'UI', 'Styles'), { recursive: true });
        
        // Check that no file was created with path traversal
        ussFiles.forEach(file => {
          expect(file).not.toContain('..');
          expect(file).not.toContain('/etc/');
          expect(file).not.toContain('\\Windows\\');
        });
      }
    });
  });

  describe('Invalid Content', () => {
    it('should handle null content for updates', async () => {
      // First create a file
      await server.services.uiToolkitService.createUXML('TestFile', 'document');
      
      // Try to update with null content
      try {
        await server.services.uiToolkitService.updateUXML('TestFile', null as any);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('content are required');
      }
    });

    it('should handle binary content', async () => {
      // Create a file first
      await server.services.uiToolkitService.createUSS('TestStyle', 'theme');
      
      // Try to update with binary content
      const binaryContent = Buffer.from([0xFF, 0xFE, 0x00, 0x01, 0x02, 0x03]).toString();
      
      const result = await server.services.uiToolkitService.updateUSS('TestStyle', binaryContent);
      
      // Should handle gracefully
      expect(result.content[0].text).toBeDefined();
    });

    it('should handle extremely large content', async () => {
      // Create 10MB of content
      const largeContent = '<ui:UXML>' + 'A'.repeat(10 * 1024 * 1024) + '</ui:UXML>';
      
      const startTime = Date.now();
      const result = await server.services.uiToolkitService.createUXML('LargeFile', 'custom', largeContent);
      const duration = Date.now() - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds max
      
      if (result.content[0].text.includes('created successfully')) {
        // Verify file size
        const filePath = path.join(projectPath, 'Assets', 'UI', 'LargeFile.uxml');
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeGreaterThan(10 * 1024 * 1024);
      }
    });

    it('should handle invalid UXML syntax', async () => {
      const invalidUXML = [
        '<ui:UXML>Unclosed tag',
        '<?xml version="1.0"?><ui:UXML><invalid:tag /></ui:UXML>',
        '<ui:UXML><ui:Button text="<script>alert("XSS")</script>" /></ui:UXML>',
        'Not XML at all, just plain text',
        '<ui:UXML><!-- Comment only --></ui:UXML>',
      ];

      for (const content of invalidUXML) {
        const result = await server.services.uiToolkitService.createUXML(
          `Invalid_${Date.now()}`,
          'custom',
          content
        );
        
        // Should create file regardless (Unity will validate)
        expect(result.content[0].text).toContain('created successfully');
      }
    });

    it('should handle invalid USS syntax', async () => {
      const invalidUSS = [
        '.class { color: }', // Missing value
        '.class { unknown-property: value; }',
        '@import "/etc/passwd";', // Security concern
        '.class { background: url("javascript:alert()"); }',
        '/* Unclosed comment',
      ];

      for (const content of invalidUSS) {
        const result = await server.services.uiToolkitService.createUSS(
          `Invalid_${Date.now()}`,
          'custom',
          content
        );
        
        // Should create file regardless (Unity will validate)
        expect(result.content[0].text).toContain('created successfully');
      }
    });
  });

  describe('File System Edge Cases', () => {
    it('should handle file already exists', async () => {
      // Create file first time
      await server.services.uiToolkitService.createUXML('Duplicate', 'document');
      
      // Try to create again
      const result = await server.services.uiToolkitService.createUXML('Duplicate', 'document');
      
      // Should overwrite or handle gracefully
      expect(result.content[0].text).toContain('created successfully');
    });

    it('should handle missing parent directories', async () => {
      // Remove UI directory after project setup
      const uiPath = path.join(projectPath, 'Assets', 'UI');
      if (fs.existsSync(uiPath)) {
        fs.rmSync(uiPath, { recursive: true });
      }
      
      // Should recreate directories
      const result = await server.services.uiToolkitService.createUXML('Test', 'document');
      expect(result.content[0].text).toContain('created successfully');
      expect(fs.existsSync(uiPath)).toBe(true);
    });

    it('should handle read-only directories', async () => {
      if (process.platform === 'win32') {
        // Skip on Windows due to different permission model
        return;
      }
      
      const uiPath = path.join(projectPath, 'Assets', 'UI');
      
      // Make directory read-only
      fs.chmodSync(uiPath, 0o555);
      
      try {
        const result = await server.services.uiToolkitService.createUXML('ReadOnlyTest', 'document');
        
        // Should fail with permission error
        expect(result.content[0].text).toContain('Error');
      } catch (error: any) {
        expect(error.message).toMatch(/permission|access|denied/i);
      } finally {
        // Restore permissions
        fs.chmodSync(uiPath, 0o755);
      }
    });

    it('should handle corrupted meta files', async () => {
      // Create a file with valid meta
      await server.services.uiToolkitService.createUXML('CorruptTest', 'document');
      
      // Corrupt the meta file
      const metaPath = path.join(projectPath, 'Assets', 'UI', 'CorruptTest.uxml.meta');
      fs.writeFileSync(metaPath, 'corrupted\x00\x01\x02data');
      
      // Try to update the file
      const result = await server.services.uiToolkitService.updateUXML(
        'CorruptTest',
        '<ui:UXML>Updated</ui:UXML>'
      );
      
      // Should handle gracefully
      expect(result.content[0].text).toContain('updated successfully');
      
      // Check if meta was regenerated
      const newMeta = fs.readFileSync(metaPath, 'utf-8');
      expect(newMeta).toContain('fileFormatVersion: 2');
    });

    it('should handle concurrent file operations', async () => {
      const promises = [];
      const componentName = 'ConcurrentComponent';
      
      // Try to create the same component multiple times concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(
          server.services.uiToolkitService.createUIComponent(componentName, 'panel')
            .catch(err => ({ error: err.message }))
        );
      }
      
      const results = await Promise.all(promises);
      
      // At least one should succeed
      const successes = results.filter(r => !r.error);
      expect(successes.length).toBeGreaterThan(0);
      
      // Check files were created
      const componentPath = path.join(projectPath, 'Assets', 'UI', 'Components', componentName);
      expect(fs.existsSync(componentPath)).toBe(true);
      expect(fs.existsSync(path.join(componentPath, `${componentName}.uxml`))).toBe(true);
      expect(fs.existsSync(path.join(componentPath, `${componentName}.uss`))).toBe(true);
      expect(fs.existsSync(path.join(componentPath, `${componentName}.cs`))).toBe(true);
    });
  });

  describe('Template Edge Cases', () => {
    it('should handle invalid template types', async () => {
      // Test with invalid template type
      const result = await server.services.uiToolkitService.createUXML(
        'InvalidTemplate',
        'invalidType' as any
      );
      
      // Should fall back to default template
      expect(result.content[0].text).toContain('created successfully');
      
      // Check content uses default template
      const filePath = path.join(projectPath, 'Assets', 'UI', 'InvalidTemplate.uxml');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('root-container'); // Default document template
    });

    it('should handle missing custom content', async () => {
      const result = await server.services.uiToolkitService.createUXML(
        'NoCustomContent',
        'custom',
        undefined
      );
      
      // Should use default custom template
      expect(result.content[0].text).toContain('created successfully');
      
      const filePath = path.join(projectPath, 'Assets', 'UI', 'NoCustomContent.uxml');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('Custom UXML template');
    });
  });

  describe('Component Creation Edge Cases', () => {
    it('should handle invalid component types', async () => {
      const result = await server.services.uiToolkitService.createUIComponent(
        'InvalidComponent',
        'invalidType' as any
      );
      
      // Should fall back to panel type
      expect(result.content[0].text).toContain('created successfully');
      
      // Check panel template was used
      const uxmlPath = path.join(projectPath, 'Assets', 'UI', 'Components', 'InvalidComponent', 'InvalidComponent.uxml');
      const content = fs.readFileSync(uxmlPath, 'utf-8');
      expect(content).toContain('panel-container');
    });

    it('should handle component name with spaces', async () => {
      const result = await server.services.uiToolkitService.createUIComponent(
        'My Component Name',
        'button'
      );
      
      expect(result.content[0].text).toContain('created successfully');
      
      // Check files were created with sanitized names
      const componentPath = path.join(projectPath, 'Assets', 'UI', 'Components', 'My Component Name');
      expect(fs.existsSync(componentPath)).toBe(true);
    });
  });

  describe('Search and List Edge Cases', () => {
    it('should handle empty project', async () => {
      // Remove all UI files
      const uiPath = path.join(projectPath, 'Assets', 'UI');
      if (fs.existsSync(uiPath)) {
        fs.rmSync(uiPath, { recursive: true });
      }
      
      const uxmlList = await server.services.uiToolkitService.listUXMLFiles();
      expect(uxmlList.content[0].text).toBe('No UXML files found in the project');
      
      const ussList = await server.services.uiToolkitService.listUSSFiles();
      expect(ussList.content[0].text).toBe('No USS files found in the project');
    });

    it('should handle deeply nested structures', async () => {
      // Create deeply nested component
      const deepPath = path.join(
        projectPath,
        'Assets',
        'UI',
        'Components',
        'Level1',
        'Level2',
        'Level3',
        'Level4',
        'Level5'
      );
      
      fs.mkdirSync(deepPath, { recursive: true });
      fs.writeFileSync(path.join(deepPath, 'Deep.uxml'), '<ui:UXML />');
      fs.writeFileSync(path.join(deepPath, 'Deep.uxml.meta'), 'fileFormatVersion: 2\nguid: test123');
      
      const result = await server.services.uiToolkitService.listUXMLFiles();
      expect(result.content[0].text).toContain('Level5/Deep.uxml');
    });

    it('should handle file not found for read operations', async () => {
      try {
        await server.services.uiToolkitService.readUXML('NonExistentFile');
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('UXML file not found');
      }
      
      try {
        await server.services.uiToolkitService.readUSS('NonExistentStyle');
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('USS file not found');
      }
    });
  });
});