import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnityMcpTools } from '../../../src/tools/unity-mcp-tools.js';
import { UnityHttpAdapter } from '../../../src/adapters/unity-http-adapter.js';

// Mock the adapter
vi.mock('../../../src/adapters/unity-http-adapter.js');

describe('UnityMcpTools', () => {
  let tools: UnityMcpTools;
  let mockAdapter: any;

  beforeEach(() => {
    mockAdapter = {
      isConnected: vi.fn().mockResolvedValue(true),
      createScript: vi.fn(),
      readScript: vi.fn(),
      deleteScript: vi.fn(),
      createShader: vi.fn(),
      readShader: vi.fn(),
      deleteShader: vi.fn(),
      getProjectInfo: vi.fn()
    };
    
    vi.mocked(UnityHttpAdapter).mockImplementation(() => mockAdapter);
    tools = new UnityMcpTools();
  });

  describe('getTools', () => {
    it('should return all available tools', () => {
      const toolList = tools.getTools();
      
      expect(toolList).toHaveLength(8); // 3 script + 3 shader + 2 project tools
      expect(toolList.map(t => t.name)).toContain('script_create');
      expect(toolList.map(t => t.name)).toContain('shader_create');
      expect(toolList.map(t => t.name)).toContain('project_info');
    });

    it('should have proper input schemas', () => {
      const toolList = tools.getTools();
      const scriptCreate = toolList.find(t => t.name === 'script_create');
      
      expect(scriptCreate?.inputSchema).toMatchObject({
        type: 'object',
        properties: {
          fileName: { type: 'string' },
          content: { type: 'string' },
          folder: { type: 'string' }
        },
        required: ['fileName']
      });
    });
  });

  describe('executeTool', () => {
    describe('script_create', () => {
      it('should create script with all parameters', async () => {
        // Arrange
        mockAdapter.createScript.mockResolvedValue({
          path: 'Assets/Scripts/Test.cs',
          guid: 'test-guid'
        });

        // Act
        const result = await tools.executeTool('script_create', {
          fileName: 'Test',
          content: 'public class Test {}',
          folder: 'Assets/Scripts'
        });

        // Assert
        expect(mockAdapter.createScript).toHaveBeenCalledWith(
          'Test',
          'public class Test {}',
          'Assets/Scripts'
        );
        expect(result).toMatchObject({
          content: [{
            type: 'text',
            text: expect.stringContaining('Script created successfully')
          }]
        });
      });

      it('should handle missing fileName', async () => {
        // Act
        const result = await tools.executeTool('script_create', {});
        
        // Assert
        expect(result.content[0].text).toContain('Error: fileName is required');
      });
    });

    describe('script_read', () => {
      it('should read script and return content', async () => {
        // Arrange
        mockAdapter.readScript.mockResolvedValue({
          path: 'Assets/Scripts/Test.cs',
          content: 'public class Test {}',
          guid: 'test-guid'
        });

        // Act
        const result = await tools.executeTool('script_read', {
          path: 'Assets/Scripts/Test.cs'
        });

        // Assert
        expect(result.content[0].text).toContain('public class Test {}');
      });
    });

    describe('script_delete', () => {
      it('should delete script', async () => {
        // Arrange
        mockAdapter.deleteScript.mockResolvedValue({
          message: 'Script deleted successfully'
        });

        // Act
        const result = await tools.executeTool('script_delete', {
          path: 'Assets/Scripts/Test.cs'
        });

        // Assert
        expect(result.content[0].text).toContain('Script deleted successfully');
      });
    });

    describe('shader_create', () => {
      it('should create shader', async () => {
        // Arrange
        mockAdapter.createShader.mockResolvedValue({
          path: 'Assets/Shaders/Test.shader',
          guid: 'shader-guid'
        });

        // Act
        const result = await tools.executeTool('shader_create', {
          name: 'Test',
          content: 'Shader "Custom/Test" {}',
          folder: 'Assets/Shaders'
        });

        // Assert
        expect(mockAdapter.createShader).toHaveBeenCalledWith(
          'Test',
          'Shader "Custom/Test" {}',
          'Assets/Shaders'
        );
        expect(result.content[0].text).toContain('Shader created successfully');
      });
    });

    describe('project_info', () => {
      it('should return project information', async () => {
        // Arrange
        mockAdapter.getProjectInfo.mockResolvedValue({
          projectPath: '/Users/test/UnityProject',
          unityVersion: '2022.3.0f1',
          platform: 'StandaloneOSX',
          isPlaying: false
        });

        // Act
        const result = await tools.executeTool('project_info', {});

        // Assert
        expect(result.content[0].text).toContain('Unity Project Information');
        expect(result.content[0].text).toContain('2022.3.0f1');
      });
    });

    describe('project_status', () => {
      it('should return connected status', async () => {
        // Arrange
        mockAdapter.isConnected.mockResolvedValue(true);
        mockAdapter.getProjectInfo.mockResolvedValue({
          projectPath: '/Users/test/UnityProject'
        });

        // Act
        const result = await tools.executeTool('project_status', {});

        // Assert
        expect(result.content[0].text).toContain('Unity server is connected');
      });

      it('should return disconnected status', async () => {
        // Arrange
        mockAdapter.isConnected.mockResolvedValue(false);

        // Act
        const result = await tools.executeTool('project_status', {});

        // Assert
        expect(result.content[0].text).toContain('Unity server is not connected');
      });
    });

    it('should throw error for unknown tool', async () => {
      // Act
      const result = await tools.executeTool('unknown_tool', {});
      
      // Assert
      expect(result.content[0].text).toContain('Error: Unknown tool: unknown_tool');
    });
  });
});