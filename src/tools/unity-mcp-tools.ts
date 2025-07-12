import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { UnityHttpAdapter } from '../adapters/unity-http-adapter.js';
import { UnityBridgeDeployService } from '../services/unity-bridge-deploy-service.js';

/**
 * Unity MCP Tools
 * Provides MCP tool definitions for Unity operations
 */
export class UnityMcpTools {
  private adapter: UnityHttpAdapter;
  private deployService: UnityBridgeDeployService;

  constructor() {
    const port = process.env.UNITY_MCP_PORT ? parseInt(process.env.UNITY_MCP_PORT) : 23457;
    const url = `http://localhost:${port}/`;
    console.error(`[Unity MCP] Connecting to Unity at ${url}`);
    
    this.adapter = new UnityHttpAdapter({ 
      url,
      timeout: parseInt(process.env.UNITY_MCP_TIMEOUT || '120000')
    });
    
    this.deployService = new UnityBridgeDeployService();
    
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
   * Auto-deploy Unity MCP scripts if connected
   */
  private async autoDeployScripts(): Promise<void> {
    try {
      const result = await this.adapter.getProjectInfo();
      await this.deployService.deployScripts({ 
        projectPath: result.projectPath,
        forceUpdate: false 
      });
    } catch (error: any) {
      console.error(`[Unity MCP] Failed to auto-deploy scripts: ${error.message}`);
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
        description: 'Get comprehensive Unity project information including render pipeline details, project path, Unity version, and platform info',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'project_status',
        description: 'Check Unity MCP server connection status (simple connectivity test only)',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'setup_unity_bridge',
        description: 'Install/update Unity MCP bridge scripts to a Unity project (works even if Unity server is not running)',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the Unity project'
            },
            forceUpdate: {
              type: 'boolean',
              description: 'Force update even if scripts are up to date',
              default: false
            }
          },
          required: ['projectPath']
        }
      },
      
      // Folder tools
      {
        name: 'folder_create',
        description: 'Create a new folder in Unity project',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path for the new folder (e.g., Assets/MyFolder)'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'folder_rename',
        description: 'Rename a folder in Unity project',
        inputSchema: {
          type: 'object',
          properties: {
            oldPath: {
              type: 'string',
              description: 'Current path of the folder'
            },
            newName: {
              type: 'string',
              description: 'New name for the folder'
            }
          },
          required: ['oldPath', 'newName']
        }
      },
      {
        name: 'folder_move',
        description: 'Move a folder to a new location in Unity project',
        inputSchema: {
          type: 'object',
          properties: {
            sourcePath: {
              type: 'string',
              description: 'Current path of the folder'
            },
            targetPath: {
              type: 'string',
              description: 'Target path for the folder'
            }
          },
          required: ['sourcePath', 'targetPath']
        }
      },
      {
        name: 'folder_delete',
        description: 'Delete a folder from Unity project',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path of the folder to delete'
            },
            recursive: {
              type: 'boolean',
              description: 'Delete all contents recursively (default: true)'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'folder_list',
        description: 'List contents of a folder in Unity project',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path of the folder to list (default: Assets)'
            },
            recursive: {
              type: 'boolean',
              description: 'List all subdirectories recursively (default: false)'
            }
          }
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
          
          // Auto-deploy scripts if needed
          await this.autoDeployScripts();
          
          return {
            content: [{
              type: 'text',
              text: `Unity Project Information:
Project Path: ${result.projectPath}
Project Name: ${result.projectName || 'N/A'}
Unity Version: ${result.unityVersion}
Platform: ${result.platform}
Is Playing: ${result.isPlaying}
Render Pipeline: ${result.renderPipeline || 'Unknown'}
Render Pipeline Version: ${result.renderPipelineVersion || 'N/A'}`
            }]
          };
        }
        
        case 'project_status': {
          const connected = await this.adapter.isConnected();
          const status = connected ? 'Unity server is connected and ready' : 'Unity server is not connected or not responding';
          
          return {
            content: [{
              type: 'text',
              text: status
            }]
          };
        }
        
        case 'setup_unity_bridge': {
          const { projectPath, forceUpdate } = args;
          if (!projectPath) {
            throw new Error('projectPath is required');
          }
          
          try {
            await this.deployService.deployScripts({ projectPath, forceUpdate });
            return {
              content: [{
                type: 'text',
                text: `Unity MCP bridge scripts installed successfully to:\n${projectPath}/Assets/Editor/MCP/\n\nPlease restart Unity Editor or open Window > Unity MCP Server to start the server.`
              }]
            };
          } catch (error: any) {
            throw new Error(`Failed to install scripts: ${error.message}`);
          }
        }
        
        // Folder operations
        case 'folder_create': {
          if (!args.path) {
            throw new Error('path is required');
          }
          const result = await this.adapter.createFolder(args.path);
          return {
            content: [{
              type: 'text',
              text: `Folder created successfully:\nPath: ${result.path}\nGUID: ${result.guid}`
            }]
          };
        }
        
        case 'folder_rename': {
          if (!args.oldPath || !args.newName) {
            throw new Error('oldPath and newName are required');
          }
          const result = await this.adapter.renameFolder(args.oldPath, args.newName);
          return {
            content: [{
              type: 'text',
              text: `Folder renamed successfully:\nOld Path: ${result.oldPath}\nNew Path: ${result.newPath}\nGUID: ${result.guid}`
            }]
          };
        }
        
        case 'folder_move': {
          if (!args.sourcePath || !args.targetPath) {
            throw new Error('sourcePath and targetPath are required');
          }
          const result = await this.adapter.moveFolder(args.sourcePath, args.targetPath);
          return {
            content: [{
              type: 'text',
              text: `Folder moved successfully:\nFrom: ${result.sourcePath}\nTo: ${result.targetPath}\nGUID: ${result.guid}`
            }]
          };
        }
        
        case 'folder_delete': {
          if (!args.path) {
            throw new Error('path is required');
          }
          await this.adapter.deleteFolder(args.path, args.recursive);
          return {
            content: [{
              type: 'text',
              text: `Folder deleted successfully: ${args.path}`
            }]
          };
        }
        
        case 'folder_list': {
          const result = await this.adapter.listFolder(args.path, args.recursive);
          const entries = result.entries.map(e => {
            const prefix = e.type === 'folder' ? '📁' : '📄';
            const info = e.type === 'file' ? ` (${e.extension})` : '';
            return `${prefix} ${e.name}${info} - ${e.path}`;
          }).join('\n');
          
          return {
            content: [{
              type: 'text',
              text: `Contents of ${result.path}:\n\n${entries || '(empty)'}`
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