import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ScriptService } from '../../src/services/script-service.js';
import { ProjectService } from '../../src/services/project-service.js';
import { TestHelpers } from '../utils/test-helpers.js';
import { SampleScripts } from '../fixtures/sample-scripts.js';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('ScriptService', () => {
  let scriptService: ScriptService;
  let projectService: ProjectService;
  let mockLogger: any;
  const testProjectPath = '/test/unity/project';

  beforeEach(async () => {
    jest.clearAllMocks();
    mockLogger = TestHelpers.createMockLogger();
    projectService = new ProjectService(mockLogger);
    scriptService = new ScriptService(mockLogger, projectService);

    // Setup mock Unity project
    const mockFS = TestHelpers.createMockUnityProject(testProjectPath);
    TestHelpers.setupMockFileSystem(mockFS);
    await projectService.setProject(testProjectPath);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createScript', () => {
    it('should create a script with default content when content is not provided', async () => {
      // Act
      const result = await scriptService.createScript('TestScript');

      // Assert
      expect(result.content[0].text).toContain('Script created: TestScript.cs');
      
      const expectedPath = path.join(testProjectPath, 'Assets', 'Scripts', 'TestScript.cs');
      expect(fs.writeFile).toHaveBeenCalledWith(
        expectedPath,
        expect.stringContaining('public class TestScript : MonoBehaviour')
      );
    });

    it('should create a script with custom content', async () => {
      // Act
      const result = await scriptService.createScript('PlayerController', SampleScripts.playerController);

      // Assert
      expect(result.content[0].text).toContain('Script created: PlayerController.cs');
      
      const expectedPath = path.join(testProjectPath, 'Assets', 'Scripts', 'PlayerController.cs');
      expect(fs.writeFile).toHaveBeenCalledWith(expectedPath, SampleScripts.playerController);
    });

    it('should create a script in a subfolder', async () => {
      // Act
      const result = await scriptService.createScript('EnemyAI', SampleScripts.enemyAI, 'AI/Enemies');

      // Assert
      expect(result.content[0].text).toContain('Script created: EnemyAI.cs');
      expect(result.content[0].text).toContain('Location: Assets/Scripts/AI/Enemies/');
      
      const expectedPath = path.join(testProjectPath, 'Assets', 'Scripts', 'AI', 'Enemies', 'EnemyAI.cs');
      expect(fs.writeFile).toHaveBeenCalledWith(expectedPath, SampleScripts.enemyAI);
    });

    it('should auto-detect namespace from folder structure', async () => {
      // Act
      await scriptService.createScript('EnemyController', undefined, 'Game/AI');

      // Assert
      const expectedPath = path.join(testProjectPath, 'Assets', 'Scripts', 'Game', 'AI', 'EnemyController.cs');
      expect(fs.writeFile).toHaveBeenCalledWith(
        expectedPath,
        expect.stringContaining('namespace Game.AI')
      );
    });

    it('should create meta file for the script', async () => {
      // Act
      await scriptService.createScript('TestScript');

      // Assert
      const metaPath = path.join(testProjectPath, 'Assets', 'Scripts', 'TestScript.cs.meta');
      expect(fs.writeFile).toHaveBeenCalledWith(
        metaPath,
        expect.stringContaining('guid:')
      );
    });

    it('should throw error for invalid script name', async () => {
      // Act & Assert
      await expect(scriptService.createScript('123InvalidName')).rejects.toThrow(
        'Invalid script name'
      );
    });

    it('should throw error when no project is set', async () => {
      // Arrange - Create service without setting project
      const newProjectService = new ProjectService(mockLogger);
      const newScriptService = new ScriptService(mockLogger, newProjectService);

      // Act & Assert
      await expect(newScriptService.createScript('TestScript')).rejects.toThrow(
        'No Unity project set'
      );
    });
  });

  describe('readScript', () => {
    beforeEach(async () => {
      // Create a test script
      await scriptService.createScript('ReadTestScript', SampleScripts.playerController);
    });

    it('should read existing script content', async () => {
      // Act
      const result = await scriptService.readScript('ReadTestScript');

      // Assert
      expect(result.content[0].text).toContain('public class PlayerController');
      expect(result.content[0].text).toContain('public float speed = 5.0f;');
    });

    it('should find script in subfolder', async () => {
      // Arrange
      await scriptService.createScript('NestedScript', 'public class NestedScript {}', 'Nested/Deep');

      // Act
      const result = await scriptService.readScript('NestedScript');

      // Assert
      expect(result.content[0].text).toContain('public class NestedScript {}');
    });

    it('should throw error for non-existent script', async () => {
      // Act & Assert
      await expect(scriptService.readScript('NonExistentScript')).rejects.toThrow(
        'Script NonExistentScript.cs not found'
      );
    });
  });

  describe('updateScript', () => {
    beforeEach(async () => {
      await scriptService.createScript('UpdateTestScript', 'public class UpdateTestScript {}');
    });

    it('should update existing script content', async () => {
      // Arrange
      const newContent = 'public class UpdateTestScript { public int value = 42; }';

      // Act
      const result = await scriptService.updateScript('UpdateTestScript', newContent);

      // Assert
      expect(result.content[0].text).toContain('Script updated: UpdateTestScript.cs');
      
      const expectedPath = path.join(testProjectPath, 'Assets', 'Scripts', 'UpdateTestScript.cs');
      expect(fs.writeFile).toHaveBeenCalledWith(expectedPath, newContent);
    });

    it('should throw error for non-existent script', async () => {
      // Act & Assert
      await expect(
        scriptService.updateScript('NonExistentScript', 'content')
      ).rejects.toThrow('Script NonExistentScript.cs not found');
    });
  });

  describe('listScripts', () => {
    beforeEach(async () => {
      // Create multiple test scripts
      await scriptService.createScript('Script1', 'public class Script1 {}');
      await scriptService.createScript('Script2', 'public class Script2 {}', 'SubFolder');
      await scriptService.createScript('Script3', 'public class Script3 {}', 'SubFolder/Nested');
    });

    it('should list all scripts in the project', async () => {
      // Act
      const result = await scriptService.listScripts();

      // Assert
      expect(result.content[0].text).toContain('Found 3 scripts');
      expect(result.content[0].text).toContain('Script1.cs');
      expect(result.content[0].text).toContain('SubFolder/Script2.cs');
      expect(result.content[0].text).toContain('SubFolder/Nested/Script3.cs');
    });

    it('should handle empty project', async () => {
      // Arrange - Create new service with empty project
      const emptyProjectPath = '/test/empty/project';
      const emptyFS = TestHelpers.createMockUnityProject(emptyProjectPath);
      TestHelpers.setupMockFileSystem(emptyFS);
      
      const newProjectService = new ProjectService(mockLogger);
      const newScriptService = new ScriptService(mockLogger, newProjectService);
      await newProjectService.setProject(emptyProjectPath);

      // Act
      const result = await newScriptService.listScripts();

      // Assert
      expect(result.content[0].text).toContain('Found 0 scripts');
    });
  });

  describe('createEditorScript', () => {
    it('should create editor script in Editor folder', async () => {
      // Act
      const result = await scriptService.createEditorScript('CustomEditor', undefined, 'Editor');

      // Assert
      expect(result.content[0].text).toContain('Script created: CustomEditor.cs');
      expect(result.content[0].text).toContain('Location: Assets/Scripts/Editor/');
      
      const expectedPath = path.join(testProjectPath, 'Assets', 'Scripts', 'Editor', 'CustomEditor.cs');
      expect(fs.writeFile).toHaveBeenCalledWith(
        expectedPath,
        expect.stringContaining('using UnityEditor;')
      );
    });

    it('should create editor script with custom content', async () => {
      // Arrange
      const customContent = `using UnityEditor;
[CustomEditor(typeof(MyComponent))]
public class MyComponentEditor : Editor
{
    public override void OnInspectorGUI()
    {
        DrawDefaultInspector();
    }
}`;

      // Act
      const result = await scriptService.createEditorScript('MyComponentEditor', customContent);

      // Assert
      const expectedPath = path.join(testProjectPath, 'Assets', 'Scripts', 'Editor', 'MyComponentEditor.cs');
      expect(fs.writeFile).toHaveBeenCalledWith(expectedPath, customContent);
    });
  });
});