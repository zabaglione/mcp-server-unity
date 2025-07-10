import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { UnityHttpAdapter } from '../adapters/unity-http-adapter.js';

/**
 * Unity MCP Tools
 * Provides MCP tool definitions for Unity operations
 */
export class UnityMcpTools {
  private adapter: UnityHttpAdapter;

  constructor() {
    const port = process.env.UNITY_MCP_PORT ? parseInt(process.env.UNITY_MCP_PORT) : 23457;
    const url = `http://localhost:${port}/`;
    console.error(`[Unity MCP] Connecting to Unity at ${url}`);
    
    this.adapter = new UnityHttpAdapter({ 
      url,
      timeout: parseInt(process.env.UNITY_MCP_TIMEOUT || '120000')
    });
    
    // Check connection on startup
    this.checkConnection();
  }
  
  private async checkConnection() {
    try {
      const connected = await this.adapter.isConnected();
      if (connected) {
        console.error('[Unity MCP] Successfully connected to Unity HTTP server');
      } else {
        console.error('[Unity MCP] Unity HTTP server is not responding');
      }
    } catch (error: any) {
      console.error(`[Unity MCP] Connection check failed: ${error.message}`);
    }
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
      {
        name: 'script_apply_diff',
        description: 'Apply a unified diff to a C# script',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the script file'
            },
            diff: {
              type: 'string',
              description: 'Unified diff content to apply'
            },
            options: {
              type: 'object',
              description: 'Optional diff application settings',
              properties: {
                dryRun: {
                  type: 'boolean',
                  description: 'Preview changes without applying (default: false)'
                }
              }
            }
          },
          required: ['path', 'diff']
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
        
        case 'script_apply_diff': {
          if (!args.path || !args.diff) {
            throw new Error('path and diff are required');
          }
          const result = await this.adapter.applyDiff(args.path, args.diff, args.options);
          return {
            content: [{
              type: 'text',
              text: `Diff applied successfully:\nPath: ${result.path}\nLines added: ${result.linesAdded}\nLines removed: ${result.linesRemoved}`
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