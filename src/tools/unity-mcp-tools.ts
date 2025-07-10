import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { UnityHttpAdapter } from '../adapters/unity-http-adapter.js';

/**
 * Unity MCP Tools
 * Provides MCP tool definitions for Unity operations
 */
export class UnityMcpTools {
  private adapter: UnityHttpAdapter;

  constructor() {
    this.adapter = new UnityHttpAdapter();
  }

  /**
   * Get all available tools
   */
  getTools(): Tool[] {
    return [
      // Script tools
      {
        name: 'script_create',
        description: 'Create a new C# script in Unity project',
        inputSchema: {
          type: 'object',
          properties: {
            fileName: {
              type: 'string',
              description: 'Name of the script file (without .cs extension)'
            },
            content: {
              type: 'string',
              description: 'Script content (optional, will use template if not provided)'
            },
            folder: {
              type: 'string',
              description: 'Target folder path (default: Assets/Scripts)'
            }
          },
          required: ['fileName']
        }
      },
      {
        name: 'script_read',
        description: 'Read a C# script from Unity project',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the script file'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'script_delete',
        description: 'Delete a C# script from Unity project',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the script file'
            }
          },
          required: ['path']
        }
      },
      
      // Shader tools
      {
        name: 'shader_create',
        description: 'Create a new shader in Unity project',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the shader (without .shader extension)'
            },
            content: {
              type: 'string',
              description: 'Shader content (optional, will use template if not provided)'
            },
            folder: {
              type: 'string',
              description: 'Target folder path (default: Assets/Shaders)'
            }
          },
          required: ['name']
        }
      },
      {
        name: 'shader_read',
        description: 'Read a shader from Unity project',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the shader file'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'shader_delete',
        description: 'Delete a shader from Unity project',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the shader file'
            }
          },
          required: ['path']
        }
      },
      
      // Project tools
      {
        name: 'project_info',
        description: 'Get Unity project information',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'project_status',
        description: 'Check Unity server connection status',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  /**
   * Execute a tool
   */
  async executeTool(toolName: string, args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      switch (toolName) {
        // Script operations
        case 'script_create': {
          if (!args.fileName) {
            throw new Error('fileName is required');
          }
          const result = await this.adapter.createScript(args.fileName, args.content, args.folder);
          return {
            content: [{
              type: 'text',
              text: `Script created successfully:\nPath: ${result.path}\nGUID: ${result.guid}`
            }]
          };
        }
        
        case 'script_read': {
          if (!args.path) {
            throw new Error('path is required');
          }
          const result = await this.adapter.readScript(args.path);
          return {
            content: [{
              type: 'text',
              text: `Script content from ${result.path}:\n\n${result.content}`
            }]
          };
        }
        
        case 'script_delete': {
          if (!args.path) {
            throw new Error('path is required');
          }
          await this.adapter.deleteScript(args.path);
          return {
            content: [{
              type: 'text',
              text: `Script deleted successfully: ${args.path}`
            }]
          };
        }
        
        // Shader operations
        case 'shader_create': {
          if (!args.name) {
            throw new Error('name is required');
          }
          const result = await this.adapter.createShader(args.name, args.content, args.folder);
          return {
            content: [{
              type: 'text',
              text: `Shader created successfully:\nPath: ${result.path}\nGUID: ${result.guid}`
            }]
          };
        }
        
        case 'shader_read': {
          if (!args.path) {
            throw new Error('path is required');
          }
          const result = await this.adapter.readShader(args.path);
          return {
            content: [{
              type: 'text',
              text: `Shader content from ${result.path}:\n\n${result.content}`
            }]
          };
        }
        
        case 'shader_delete': {
          if (!args.path) {
            throw new Error('path is required');
          }
          await this.adapter.deleteShader(args.path);
          return {
            content: [{
              type: 'text',
              text: `Shader deleted successfully: ${args.path}`
            }]
          };
        }
        
        // Project operations
        case 'project_info': {
          const result = await this.adapter.getProjectInfo();
          return {
            content: [{
              type: 'text',
              text: `Unity Project Information:
Project Path: ${result.projectPath}
Project Name: ${result.projectName || 'N/A'}
Unity Version: ${result.unityVersion}
Platform: ${result.platform}
Is Playing: ${result.isPlaying}`
            }]
          };
        }
        
        case 'project_status': {
          const connected = await this.adapter.isConnected();
          let status = connected ? 'Unity server is connected' : 'Unity server is not connected';
          
          if (connected) {
            try {
              const info = await this.adapter.getProjectInfo();
              status += `\nProject: ${info.projectPath}`;
            } catch (e) {
              // Ignore error getting project info
            }
          }
          
          return {
            content: [{
              type: 'text',
              text: status
            }]
          };
        }
        
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error.message}`
        }]
      };
    }
  }
}