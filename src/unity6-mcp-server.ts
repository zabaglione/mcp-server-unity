#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { ConsoleLogger } from './utils/logger.js';
import { UnityBridgeClient } from './unity-bridge/unity-bridge-client.js';
import { ScriptAPI } from './api/script/script-api.js';
import { FolderAPI } from './api/folder/folder-api.js';

/**
 * Unity 6 MCP Server
 * Direct Unity Editor integration via Unity Bridge
 */
class Unity6MCPServer {
  private server: Server;
  private logger: ConsoleLogger;
  private unityBridge: UnityBridgeClient;
  private scriptAPI: ScriptAPI;
  private folderAPI: FolderAPI;
  private projectPath: string | null = null;

  constructor() {
    this.logger = new ConsoleLogger('[Unity 6 MCP]');
    
    this.server = new Server(
      {
        name: 'unity-mcp-bridge',
        version: '3.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Initialize Unity Bridge
    this.unityBridge = new UnityBridgeClient(this.logger);
    this.scriptAPI = new ScriptAPI(this.unityBridge, this.logger);
    this.folderAPI = new FolderAPI(this.unityBridge, this.logger);

    this.setupUnityBridgeEvents();
    this.setupHandlers();
  }

  private setupUnityBridgeEvents(): void {
    this.unityBridge.on('connected', () => {
      this.logger.info('Unity Bridge connected - Full Unity API integration available');
    });

    this.unityBridge.on('disconnected', () => {
      this.logger.warn('Unity Bridge disconnected - Ensure Unity Editor is running with MCP Bridge');
    });

    this.unityBridge.on('compilation.started', () => {
      this.logger.info('Unity compilation started');
    });

    this.unityBridge.on('compilation.finished', (data: any) => {
      if (data.hasErrors) {
        this.logger.warn('Unity compilation finished with errors');
      } else {
        this.logger.info('Unity compilation completed successfully');
      }
    });

    this.unityBridge.on('project.changed', () => {
      this.logger.info('Unity project changed');
    });
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Project Management
        {
          name: 'project_set_path',
          description: 'Set the Unity project path for direct integration',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Unity project directory',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'project_get_info',
          description: 'Get Unity project information and connection status',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'bridge_install',
          description: 'Install MCPBridge.cs to Unity project for direct API integration',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Unity project directory (optional, uses current project if not specified)',
              },
              force: {
                type: 'boolean',
                description: 'Force overwrite existing MCPBridge.cs',
                default: false,
              },
            },
            required: [],
          },
        },
        {
          name: 'bridge_uninstall',
          description: 'Remove MCPBridge.cs from Unity project',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Unity project directory (optional, uses current project if not specified)',
              },
            },
            required: [],
          },
        },
        {
          name: 'bridge_status',
          description: 'Check if MCPBridge.cs is installed and running in Unity project',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Unity project directory (optional, uses current project if not specified)',
              },
            },
            required: [],
          },
        },

        // Script Operations
        {
          name: 'script_create',
          description: 'Create a new C# script using Unity 6 API with template support',
          inputSchema: {
            type: 'object',
            properties: {
              fileName: {
                type: 'string',
                description: 'Name of the script file (without .cs extension)',
              },
              content: {
                type: 'string',
                description: 'Script content (optional, will use template if not provided)',
              },
              folder: {
                type: 'string',
                description: 'Target folder path (default: Assets/Scripts)',
              },
              template: {
                type: 'string',
                enum: ['MonoBehaviour', 'ScriptableObject', 'Editor', 'Custom'],
                description: 'Script template to use',
                default: 'MonoBehaviour',
              },
              namespace: {
                type: 'string',
                description: 'Namespace for the script (auto-generated if not provided)',
              },
              usings: {
                type: 'array',
                items: { type: 'string' },
                description: 'Using statements to include',
              },
            },
            required: ['fileName'],
          },
        },
        {
          name: 'script_read',
          description: 'Read script content from Unity project',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the script file',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'script_delete',
          description: 'Delete script using Unity 6 AssetDatabase',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the script file',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'script_rename',
          description: 'Rename script using Unity 6 AssetDatabase',
          inputSchema: {
            type: 'object',
            properties: {
              oldPath: {
                type: 'string',
                description: 'Current path to the script file',
              },
              newName: {
                type: 'string',
                description: 'New name for the script (without .cs extension)',
              },
            },
            required: ['oldPath', 'newName'],
          },
        },

        // Folder Operations
        {
          name: 'folder_create',
          description: 'Create folder using Unity 6 AssetDatabase',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path for the new folder',
              },
              recursive: {
                type: 'boolean',
                description: 'Create parent directories if needed',
                default: true,
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'folder_delete',
          description: 'Delete folder using Unity 6 AssetDatabase',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the folder',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'folder_rename',
          description: 'Rename folder using Unity 6 AssetDatabase',
          inputSchema: {
            type: 'object',
            properties: {
              oldPath: {
                type: 'string',
                description: 'Current path to the folder',
              },
              newName: {
                type: 'string',
                description: 'New name for the folder',
              },
            },
            required: ['oldPath', 'newName'],
          },
        },
        {
          name: 'folder_list',
          description: 'List folder contents with Unity metadata',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the folder',
              },
            },
            required: ['path'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Project Management
          case 'project_set_path':
            this.projectPath = args?.projectPath as string || null;
            return {
              content: [{
                type: 'text',
                text: `Project path set: ${this.projectPath}\n` +
                      `Unity Bridge status: ${this.unityBridge.connected ? 'Connected' : 'Connecting...'}`
              }]
            };

          case 'project_get_info':
            const status = this.unityBridge.getStatus();
            return {
              content: [{
                type: 'text',
                text: `Project Path: ${this.projectPath || 'Not set'}\n` +
                      `Unity Bridge: ${status.connected ? 'Connected' : 'Disconnected'}\n` +
                      `Pending Requests: ${status.pendingRequests}\n` +
                      `Unity 6 MCP Bridge v3.0.0`
              }]
            };

          // Bridge Management
          case 'bridge_install':
            return await this.installBridge(args?.projectPath as string | undefined, args?.force as boolean | undefined);

          case 'bridge_uninstall':
            return await this.uninstallBridge(args?.projectPath as string | undefined);

          case 'bridge_status':
            return await this.checkBridgeStatus(args?.projectPath as string | undefined);

          // Script Operations
          case 'script_create':
            return await this.scriptAPI.create({
              fileName: args?.fileName as string,
              content: args?.content as string | undefined,
              folder: args?.folder as string | undefined,
              template: args?.template as 'MonoBehaviour' | 'ScriptableObject' | 'Editor' | 'Custom' | undefined,
              namespace: args?.namespace as string | undefined,
              usings: args?.usings as string[] | undefined,
            });

          case 'script_read':
            return await this.scriptAPI.read(args?.path as string);

          case 'script_delete':
            return await this.scriptAPI.delete(args?.path as string);

          case 'script_rename':
            return await this.scriptAPI.rename(args?.oldPath as string, args?.newName as string);

          // Folder Operations
          case 'folder_create':
            return await this.folderAPI.create({
              path: args?.path as string,
              recursive: args?.recursive as boolean | undefined,
            });

          case 'folder_delete':
            return await this.folderAPI.delete(args?.path as string);

          case 'folder_rename':
            return await this.folderAPI.rename(args?.oldPath as string, args?.newName as string);

          case 'folder_list':
            return await this.folderAPI.list(args?.path as string);

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Tool execution error [${name}]:`, errorMessage);
        
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(ErrorCode.InternalError, errorMessage);
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    
    try {
      await this.server.connect(transport);
      this.logger.info('Unity 6 MCP Bridge v3.0.0 running');
      this.logger.info('Attempting to connect to Unity Editor Bridge...');
      
      // Attempt initial connection (non-blocking)
      this.unityBridge.connect().catch(() => {
        this.logger.warn('Unity Editor not detected - Bridge will auto-connect when Unity starts');
      });
      
    } catch (error) {
      this.logger.error('Failed to start Unity 6 MCP Server:', error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Unity 6 MCP Bridge...');
    await this.unityBridge.disconnect();
  }

  /**
   * Install refactored MCPBridge.cs files to Unity project
   */
  private async installBridge(projectPath?: string, force?: boolean): Promise<CallToolResult> {
    const targetProject = projectPath || this.projectPath;
    
    if (!targetProject) {
      throw new Error('Project path not specified. Use project_set_path first or provide projectPath parameter.');
    }

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Validate Unity project
      const projectSettingsPath = path.join(targetProject, 'ProjectSettings', 'ProjectSettings.asset');
      try {
        await fs.access(projectSettingsPath);
      } catch {
        throw new Error(`Invalid Unity project path: ${targetProject}\\nProjectSettings/ProjectSettings.asset not found.`);
      }

      // Create target directory structure
      const mcpDir = path.join(targetProject, 'Assets', 'Editor', 'MCP');
      const coreDir = path.join(mcpDir, 'Core');
      const handlersDir = path.join(mcpDir, 'Handlers');

      // Check if main bridge file exists
      const mainBridgeFile = path.join(mcpDir, 'MCPBridge.cs');
      const fileExists = await fs.access(mainBridgeFile).then(() => true).catch(() => false);
      if (fileExists && !force) {
        return {
          content: [{
            type: 'text',
            text: `MCPBridge already exists in: ${mcpDir}\\n` +
                  `Use force: true to overwrite, or use bridge_uninstall first.\\n` +
                  `Current installation appears to be active.`
          }]
        };
      }

      // Create directory structure
      await fs.mkdir(mcpDir, { recursive: true });
      await fs.mkdir(coreDir, { recursive: true });
      await fs.mkdir(handlersDir, { recursive: true });

      // Get all refactored bridge files
      const bridgeFiles = this.getRefactoredBridgeFiles();
      let installedFiles = 0;

      // Install all files
      for (const [relativePath, content] of Object.entries(bridgeFiles)) {
        const targetFile = path.join(mcpDir, relativePath);
        const targetDir = path.dirname(targetFile);
        
        // Ensure directory exists
        await fs.mkdir(targetDir, { recursive: true });
        
        // Write file
        await fs.writeFile(targetFile, content, 'utf-8');
        
        // Create .meta file for Unity
        const metaContent = this.generateMetaFile(path.basename(targetFile), 'MonoScript');
        await fs.writeFile(targetFile + '.meta', metaContent, 'utf-8');
        
        installedFiles++;
      }
      
      return {
        content: [{
          type: 'text',
          text: `MCPBridge refactored architecture installed successfully!\\n\\n` +
                `Files installed: ${installedFiles} C# files + ${installedFiles} .meta files\\n` +
                `Location: ${mcpDir}\\n\\n` +
                `Architecture:\\n` +
                `├── MCPBridge.cs (Main entry point)\\n` +
                `├── Core/\\n` +
                `│   ├── IMCPHandler.cs (Interface)\\n` +
                `│   ├── MCPHandlerBase.cs (Base class)\\n` +
                `│   ├── MCPRequest.cs, MCPResponse.cs (Data)\\n` +
                `│   └── ThreadUtils.cs (Main thread utilities)\\n` +
                `├── MCPHandlerFactory.cs (Handler management)\\n` +
                `└── Handlers/\\n` +
                `    ├── ScriptHandler.cs (Script operations)\\n` +
                `    └── FolderHandler.cs (Folder operations)\\n\\n` +
                `Benefits:\\n` +
                `• Modular architecture - each file ~50-150 lines\\n` +
                `• Easy to extend - add new handlers for new features\\n` +
                `• Clean separation of concerns\\n` +
                `• Reusable components\\n\\n` +
                `Next steps:\\n` +
                `1. Unity Editor will compile all scripts automatically\\n` +
                `2. Check Unity Console for: "MCP Handler Factory initialized with X handlers"\\n` +
                `3. Check Unity Console for: "Unity 6 MCP Bridge starting on TCP port: 23456"\\n` +
                `4. Use bridge_status to verify installation`
        }]
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to install MCPBridge: ${errorMessage}`);
    }
  }

  /**
   * Uninstall refactored MCPBridge files from Unity project
   */
  private async uninstallBridge(projectPath?: string): Promise<CallToolResult> {
    const targetProject = projectPath || this.projectPath;
    
    if (!targetProject) {
      throw new Error('Project path not specified. Use project_set_path first or provide projectPath parameter.');
    }

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const mcpDir = path.join(targetProject, 'Assets', 'Editor', 'MCP');
      const coreDir = path.join(mcpDir, 'Core');
      const handlersDir = path.join(mcpDir, 'Handlers');
      
      let filesRemoved = 0;
      let errors: string[] = [];
      let removedFiles: string[] = [];
      
      // Get list of files to remove
      const bridgeFiles = this.getRefactoredBridgeFiles();
      
      // Remove all bridge files and their .meta files
      for (const relativePath of Object.keys(bridgeFiles)) {
        const targetFile = path.join(mcpDir, relativePath);
        const metaFile = targetFile + '.meta';
        
        // Remove main file
        try {
          await fs.unlink(targetFile);
          filesRemoved++;
          removedFiles.push(path.basename(targetFile));
        } catch (error) {
          if ((error as any).code !== 'ENOENT') {
            errors.push(`Failed to remove ${path.basename(targetFile)}: ${(error as Error).message}`);
          }
        }
        
        // Remove .meta file
        try {
          await fs.unlink(metaFile);
          filesRemoved++;
        } catch (error) {
          if ((error as any).code !== 'ENOENT') {
            errors.push(`Failed to remove ${path.basename(targetFile)}.meta: ${(error as Error).message}`);
          }
        }
      }
      
      // Try to remove directories (Core, Handlers, then MCP)
      const dirsToRemove = [handlersDir, coreDir, mcpDir];
      for (const dir of dirsToRemove) {
        try {
          const dirContents = await fs.readdir(dir);
          if (dirContents.length === 0) {
            await fs.rmdir(dir);
            filesRemoved++;
          }
        } catch {
          // Ignore errors when removing directories
        }
      }
      
      if (filesRemoved === 0 && errors.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `MCPBridge was not found in the project.\\n` +
                  `Location checked: ${mcpDir}\\n` +
                  `The bridge appears to be already uninstalled.`
          }]
        };
      }
      
      const result = `MCPBridge refactored architecture uninstalled successfully!\\n\\n` +
                    `Files removed: ${filesRemoved} files\\n` +
                    `C# files removed: ${removedFiles.join(', ')}\\n` +
                    `Location: ${mcpDir}\\n\\n` +
                    `Unity Editor will automatically detect the changes.\\n` +
                    `The MCP Bridge connection will be unavailable until reinstalled.`;
      
      if (errors.length > 0) {
        return {
          content: [{
            type: 'text',
            text: result + `\\n\\nWarnings:\\n${errors.join('\\n')}`
          }]
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: result
        }]
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to uninstall MCPBridge: ${errorMessage}`);
    }
  }

  /**
   * Check MCPBridge installation status
   */
  private async checkBridgeStatus(projectPath?: string): Promise<CallToolResult> {
    const targetProject = projectPath || this.projectPath;
    
    if (!targetProject) {
      throw new Error('Project path not specified. Use project_set_path first or provide projectPath parameter.');
    }

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const targetFile = path.join(targetProject, 'Assets', 'Editor', 'MCP', 'MCPBridge.cs');
      const metaFile = targetFile + '.meta';
      
      // Check file existence
      const fileExists = await fs.access(targetFile).then(() => true).catch(() => false);
      const metaExists = await fs.access(metaFile).then(() => true).catch(() => false);
      
      // Check TCP connection
      const tcpConnected = await this.checkTcpConnection('127.0.0.1', 23456);
      
      // Get file info if exists
      let fileInfo = '';
      if (fileExists) {
        const stats = await fs.stat(targetFile);
        fileInfo = `File size: ${stats.size} bytes\\nLast modified: ${stats.mtime.toISOString()}`;
      }
      
      const bridgeStatus = this.unityBridge.getStatus();
      
      return {
        content: [{
          type: 'text',
          text: `MCPBridge Status Report\\n\\n` +
                `Installation:\\n` +
                `  MCPBridge.cs: ${fileExists ? 'Installed' : 'Not found'}\\n` +
                `  Meta file: ${metaExists ? 'Present' : 'Missing'}\\n` +
                `  Location: ${targetFile}\\n` +
                (fileExists ? `  ${fileInfo}\\n` : '') +
                `\\n` +
                `Connection:\\n` +
                `  TCP Port 23456: ${tcpConnected ? 'Open' : 'Closed'}\\n` +
                `  MCP Bridge: ${bridgeStatus.connected ? 'Connected' : 'Disconnected'}\\n` +
                `  Pending requests: ${bridgeStatus.pendingRequests}\\n` +
                `\\n` +
                `Status: ${this.getBridgeStatusSummary(fileExists, tcpConnected, bridgeStatus.connected)}\\n` +
                `\\n` +
                `Troubleshooting:\\n` +
                `${this.getBridgeTroubleshooting(fileExists, tcpConnected, bridgeStatus.connected)}`
        }]
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to check bridge status: ${errorMessage}`);
    }
  }

  /**
   * Check if TCP port is open
   */
  private async checkTcpConnection(host: string, port: number): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        const net = await import('net');
        const socket = new net.Socket();
        
        const timeout = setTimeout(() => {
          socket.destroy();
          resolve(false);
        }, 1000);
        
        socket.connect(port, host, () => {
          clearTimeout(timeout);
          socket.destroy();
          resolve(true);
        });
        
        socket.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      } catch (error) {
        resolve(false);
      }
    });
  }

  /**
   * Generate Unity .meta file content
   */
  private generateMetaFile(_fileName: string, _assetType: string): string {
    // Generate a simple GUID for the meta file
    const guid = this.generateSimpleGuid();
    
    return `fileFormatVersion: 2
guid: ${guid}
MonoImporter:
  externalObjects: {}
  serializedVersion: 2
  defaultReferences: []
  executionOrder: 0
  icon: {instanceID: 0}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;
  }

  /**
   * Generate a simple GUID for Unity meta files
   */
  private generateSimpleGuid(): string {
    return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, () => {
      return (Math.random() * 16 | 0).toString(16);
    });
  }

  /**
   * Get bridge status summary
   */
  private getBridgeStatusSummary(fileExists: boolean, tcpConnected: boolean, mcpConnected: boolean): string {
    if (fileExists && tcpConnected && mcpConnected) {
      return 'Fully operational';
    } else if (fileExists && tcpConnected && !mcpConnected) {
      return 'Bridge running, MCP client disconnected';
    } else if (fileExists && !tcpConnected) {
      return 'Installed but not running';
    } else if (!fileExists) {
      return 'Not installed';
    } else {
      return 'Unknown state';
    }
  }

  /**
   * Get troubleshooting suggestions
   */
  private getBridgeTroubleshooting(fileExists: boolean, tcpConnected: boolean, mcpConnected: boolean): string {
    if (!fileExists) {
      return '• Run bridge_install to install MCPBridge.cs\\n• Ensure Unity project path is correct';
    } else if (!tcpConnected) {
      return '• Restart Unity Editor to reload MCPBridge.cs\\n• Check Unity Console for compilation errors\\n• Verify port 23456 is not blocked by firewall';
    } else if (!mcpConnected) {
      return '• MCP Bridge is running but client is disconnected\\n• This is normal when no MCP operations are active\\n• Bridge will auto-connect when needed';
    } else {
      return '• Everything appears to be working correctly\\n• Bridge is ready for MCP operations';
    }
  }


  /**
   * Get main MCPBridge.cs file
   */
  private getMainBridgeTemplate(): string {
    return `using UnityEngine;
using UnityEditor;
using UnityEditor.Compilation;
using System;
using System.Net;
using System.Net.Sockets;
using System.Threading.Tasks;
using System.Linq;
using Newtonsoft.Json;
using System.Text;

namespace Unity.MCP.Bridge
{
    [InitializeOnLoad]
    public static class MCPBridge
    {
        private static TcpListener tcpListener;
        private static bool isRunning = false;
        private static bool isShuttingDown = false;

        static MCPBridge()
        {
            EditorApplication.update += Initialize;
            EditorApplication.quitting += Shutdown;
            EditorApplication.projectChanged += OnProjectChanged;
            CompilationPipeline.compilationStarted += OnCompilationStarted;
            CompilationPipeline.compilationFinished += OnCompilationFinished;
        }

        static void Initialize()
        {
            if (!isRunning && !isShuttingDown)
            {
                EditorApplication.update -= Initialize;
                StartBridgeServer();
            }
        }

        static async void StartBridgeServer()
        {
            try
            {
                isRunning = true;
                int port = 23456;
                
                Debug.Log($"Unity 6 MCP Bridge starting on TCP port: {port}");
                
                tcpListener = new TcpListener(IPAddress.Loopback, port);
                tcpListener.Start();
                Debug.Log("MCP Bridge waiting for connections...");
                
                while (isRunning && !isShuttingDown)
                {
                    try
                    {
                        var tcpClient = await tcpListener.AcceptTcpClientAsync();
                        Debug.Log("MCP Bridge client connected");
                        
                        _ = Task.Run(() => HandleTcpClientAsync(tcpClient));
                        
                        while (tcpClient.Connected && isRunning)
                        {
                            await Task.Delay(100);
                        }
                        
                        Debug.Log("MCP Bridge client disconnected");
                        
                        if (tcpClient.Connected)
                        {
                            tcpClient.Close();
                        }
                    }
                    catch (Exception e)
                    {
                        Debug.LogError($"MCP Bridge connection error: {e.Message}");
                        await Task.Delay(1000);
                    }
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"MCP Bridge startup error: {e.Message}");
            }
        }

        static async Task HandleTcpClientAsync(TcpClient tcpClient)
        {
            var buffer = new byte[4096];
            var messageBuffer = new StringBuilder();
            var stream = tcpClient.GetStream();
            
            try
            {
                while (tcpClient.Connected && isRunning && !isShuttingDown)
                {
                    int bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length);
                    if (bytesRead == 0) break;
                    
                    string data = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                    messageBuffer.Append(data);
                    
                    string bufferContent = messageBuffer.ToString();
                    string[] lines = bufferContent.Split('\\n');
                    
                    messageBuffer.Clear();
                    if (!bufferContent.EndsWith("\\n"))
                    {
                        messageBuffer.Append(lines[lines.Length - 1]);
                        lines = lines.Take(lines.Length - 1).ToArray();
                    }
                    
                    foreach (string line in lines)
                    {
                        if (!string.IsNullOrWhiteSpace(line))
                        {
                            _ = Task.Run(() => ProcessRequestAsync(line, stream));
                        }
                    }
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"MCP Bridge client handling error: {e.Message}");
            }
        }

        static async Task ProcessRequestAsync(string requestJson, NetworkStream stream)
        {
            try
            {
                var request = JsonConvert.DeserializeObject<MCPRequest>(requestJson);
                var response = await MCPHandlerFactory.ProcessRequest(request);
                
                string responseJson = JsonConvert.SerializeObject(response) + "\\n";
                byte[] responseBytes = Encoding.UTF8.GetBytes(responseJson);
                
                await stream.WriteAsync(responseBytes, 0, responseBytes.Length);
                await stream.FlushAsync();
            }
            catch (Exception e)
            {
                Debug.LogError($"MCP Bridge request processing error: {e.Message}");
                
                var errorResponse = new MCPResponse
                {
                    id = -1,
                    error = e.Message
                };
                
                try
                {
                    string errorJson = JsonConvert.SerializeObject(errorResponse) + "\\n";
                    byte[] errorBytes = Encoding.UTF8.GetBytes(errorJson);
                    await stream.WriteAsync(errorBytes, 0, errorBytes.Length);
                }
                catch { }
            }
        }

        static void OnProjectChanged()
        {
            Debug.Log("MCP Event: project.changed");
        }

        static void OnCompilationStarted(object context)
        {
            Debug.Log("MCP Event: compilation.started");
        }

        static void OnCompilationFinished(object context)
        {
            Debug.Log("MCP Event: compilation.finished");
        }

        static void Shutdown()
        {
            isShuttingDown = true;
            isRunning = false;
            
            try
            {
                tcpListener?.Stop();
                Debug.Log("MCP Bridge shutdown complete");
            }
            catch (Exception e)
            {
                Debug.LogError($"MCP Bridge shutdown error: {e.Message}");
            }
        }
    }
}`;
  }

  /**
   * Get all refactored MCP Bridge files
   */
  private getRefactoredBridgeFiles(): { [key: string]: string } {
    return {
      'MCPBridge.cs': this.getMainBridgeTemplate(),
      'Core/MCPRequest.cs': this.getMCPRequestTemplate(),
      'Core/MCPResponse.cs': this.getMCPResponseTemplate(),
      'Core/IMCPHandler.cs': this.getIMCPHandlerTemplate(),
      'Core/MCPHandlerBase.cs': this.getMCPHandlerBaseTemplate(),
      'Core/ThreadUtils.cs': this.getThreadUtilsTemplate(),
      'MCPHandlerFactory.cs': this.getMCPHandlerFactoryTemplate(),
      'Handlers/ScriptHandler.cs': this.getScriptHandlerTemplate(),
      'Handlers/FolderHandler.cs': this.getFolderHandlerTemplate()
    };
  }

  private getMCPRequestTemplate(): string {
    return `using System;

namespace Unity.MCP.Bridge
{
    [Serializable]
    public class MCPRequest
    {
        public int id;
        public string method;
        public dynamic parameters;
    }
}`;
  }

  private getMCPResponseTemplate(): string {
    return `using System;

namespace Unity.MCP.Bridge
{
    [Serializable]
    public class MCPResponse
    {
        public int id;
        public object result;
        public string error;
    }
}`;
  }

  private getIMCPHandlerTemplate(): string {
    return `using System.Threading.Tasks;

namespace Unity.MCP.Bridge
{
    public interface IMCPHandler
    {
        bool CanHandle(string method);
        Task<object> HandleAsync(string method, dynamic parameters);
        string[] GetSupportedMethods();
    }
}`;
  }

  private getMCPHandlerBaseTemplate(): string {
    return `using System.Threading.Tasks;
using Unity.MCP.Bridge.Core;

namespace Unity.MCP.Bridge
{
    public abstract class MCPHandlerBase : IMCPHandler
    {
        public abstract bool CanHandle(string method);
        public abstract Task<object> HandleAsync(string method, dynamic parameters);
        public abstract string[] GetSupportedMethods();

        protected Task<T> ExecuteOnMainThread<T>(System.Func<T> action)
        {
            return ThreadUtils.ExecuteOnMainThread(action);
        }

        protected Task ExecuteOnMainThread(System.Action action)
        {
            return ThreadUtils.ExecuteOnMainThread(action);
        }
    }
}`;
  }

  private getThreadUtilsTemplate(): string {
    return `using System;
using System.Threading.Tasks;
using UnityEditor;
using UnityEngine;

namespace Unity.MCP.Bridge.Core
{
    public static class ThreadUtils
    {
        public static Task<T> ExecuteOnMainThread<T>(Func<T> action)
        {
            var tcs = new TaskCompletionSource<T>();
            
            // Debug log to track execution
            Debug.Log($"[ThreadUtils] Scheduling main thread execution for {typeof(T).Name}");
            
            // Use a more reliable approach
            void ExecuteAction()
            {
                try
                {
                    Debug.Log($"[ThreadUtils] Executing main thread action for {typeof(T).Name}");
                    var result = action();
                    Debug.Log($"[ThreadUtils] Main thread action completed successfully for {typeof(T).Name}");
                    tcs.SetResult(result);
                }
                catch (Exception e)
                {
                    Debug.LogError($"[ThreadUtils] Main thread action failed for {typeof(T).Name}: {e.Message}");
                    tcs.SetException(e);
                }
            }
            
            // Always use delayCall for safety
            try
            {
                EditorApplication.delayCall += ExecuteAction;
            }
            catch (Exception e)
            {
                Debug.LogError($"[ThreadUtils] Failed to schedule main thread execution: {e.Message}");
                tcs.SetException(e);
            }
            
            return tcs.Task;
        }

        public static Task ExecuteOnMainThread(Action action)
        {
            var tcs = new TaskCompletionSource<bool>();
            
            Debug.Log("[ThreadUtils] Scheduling main thread execution for Action");
            
            void ExecuteAction()
            {
                try
                {
                    Debug.Log("[ThreadUtils] Executing main thread action");
                    action();
                    Debug.Log("[ThreadUtils] Main thread action completed successfully");
                    tcs.SetResult(true);
                }
                catch (Exception e)
                {
                    Debug.LogError($"[ThreadUtils] Main thread action failed: {e.Message}");
                    tcs.SetException(e);
                }
            }
            
            try
            {
                EditorApplication.delayCall += ExecuteAction;
            }
            catch (Exception e)
            {
                Debug.LogError($"[ThreadUtils] Failed to schedule main thread execution: {e.Message}");
                tcs.SetException(e);
            }
            
            return tcs.Task;
        }
    }
}`;
  }

  private getMCPHandlerFactoryTemplate(): string {
    return `using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UnityEngine;
using Unity.MCP.Bridge.Handlers;

namespace Unity.MCP.Bridge
{
    public static class MCPHandlerFactory
    {
        private static readonly List<IMCPHandler> handlers = new List<IMCPHandler>();
        private static bool initialized = false;

        static MCPHandlerFactory()
        {
            Initialize();
        }

        private static void Initialize()
        {
            if (initialized) return;

            // Register all handlers
            handlers.Add(new ScriptHandler());
            handlers.Add(new FolderHandler());
            
            initialized = true;
            Debug.Log($"MCP Handler Factory initialized with {handlers.Count} handlers");
        }

        public static async Task<MCPResponse> ProcessRequest(MCPRequest request)
        {
            var response = new MCPResponse { id = request.id };
            
            try
            {
                var handler = handlers.FirstOrDefault(h => h.CanHandle(request.method));
                
                if (handler == null)
                {
                    throw new NotImplementedException($"Method not implemented: {request.method}");
                }

                response.result = await handler.HandleAsync(request.method, request.parameters);
            }
            catch (Exception e)
            {
                response.error = e.Message;
                Debug.LogError($"MCP Handler error [{request.method}]: {e.Message}");
            }
            
            return response;
        }

        public static string[] GetAllSupportedMethods()
        {
            return handlers.SelectMany(h => h.GetSupportedMethods()).ToArray();
        }
    }
}`;
  }

  private getScriptHandlerTemplate(): string {
    return `using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using UnityEditor;
using UnityEngine;

namespace Unity.MCP.Bridge.Handlers
{
    public class ScriptHandler : MCPHandlerBase
    {
        private readonly string[] supportedMethods = {
            "Unity.Script.Create",
            "Unity.Script.Read", 
            "Unity.Script.Delete"
        };

        public override bool CanHandle(string method)
        {
            return Array.Exists(supportedMethods, m => m == method);
        }

        public override string[] GetSupportedMethods()
        {
            return (string[])supportedMethods.Clone();
        }

        public override async Task<object> HandleAsync(string method, dynamic parameters)
        {
            switch (method)
            {
                case "Unity.Script.Create":
                    return await CreateScript(parameters);
                case "Unity.Script.Read":
                    return await ReadScript(parameters);
                case "Unity.Script.Delete":
                    return await DeleteScript(parameters);
                default:
                    throw new NotImplementedException($"Method not implemented: {method}");
            }
        }

        private async Task<object> CreateScript(dynamic parameters)
        {
            return await ExecuteOnMainThread(() =>
            {
                Debug.Log($"[ScriptHandler] CreateScript called with parameters: {parameters}");
                
                string fileName = parameters?.fileName;
                string content = parameters?.content;
                string folder = parameters?.folder ?? "Assets/Scripts";
                string template = parameters?.template ?? "MonoBehaviour";
                
                Debug.Log($"[ScriptHandler] Parsed - fileName: '{fileName}', folder: '{folder}', template: '{template}'");
                
                if (string.IsNullOrEmpty(fileName))
                {
                    throw new ArgumentException("fileName parameter is required and cannot be null or empty");
                }
                
                if (!AssetDatabase.IsValidFolder(folder))
                {
                    CreateDirectoryRecursive(folder);
                }
                
                string fullPath = $"{folder}/{fileName}.cs";
                
                if (string.IsNullOrEmpty(content))
                {
                    content = GenerateScriptFromTemplate(fileName, template);
                }
                
                File.WriteAllText(fullPath, content);
                AssetDatabase.ImportAsset(fullPath);
                
                var guid = AssetDatabase.AssetPathToGUID(fullPath);
                
                return new
                {
                    path = fullPath,
                    guid = guid,
                    folder = folder,
                    success = true
                };
            });
        }

        private async Task<object> ReadScript(dynamic parameters)
        {
            Debug.Log($"[ScriptHandler] ReadScript called with parameters: {parameters}");
            
            string path = parameters?.path;
            
            Debug.Log($"[ScriptHandler] Target path: '{path}'");
            
            if (!File.Exists(path))
            {
                Debug.LogError($"[ScriptHandler] File not found: '{path}'");
                throw new FileNotFoundException($"Script not found: {path}");
            }
            
            // Use async file reading to avoid blocking
            string content = await Task.Run(() => File.ReadAllText(path));
            
            Debug.Log($"[ScriptHandler] File read successfully, content length: {content.Length}");
            
            return new
            {
                path = path,
                content = content,
                success = true
            };
        }

        private async Task<object> DeleteScript(dynamic parameters)
        {
            return await ExecuteOnMainThread(() =>
            {
                string path = parameters?.path;
                
                if (!AssetDatabase.DeleteAsset(path))
                {
                    throw new InvalidOperationException($"Failed to delete script: {path}");
                }
                
                return new
                {
                    path = path,
                    success = true
                };
            });
        }

        private void CreateDirectoryRecursive(string path)
        {
            string[] folders = path.Split('/');
            string currentPath = folders[0];
            
            for (int i = 1; i < folders.Length; i++)
            {
                string newPath = currentPath + "/" + folders[i];
                if (!AssetDatabase.IsValidFolder(newPath))
                {
                    AssetDatabase.CreateFolder(currentPath, folders[i]);
                }
                currentPath = newPath;
            }
        }

        private string GenerateScriptFromTemplate(string className, string template)
        {
            var content = new StringBuilder();
            content.AppendLine("using UnityEngine;");
            content.AppendLine();
            
            switch (template)
            {
                case "MonoBehaviour":
                    content.AppendLine($"public class {className} : MonoBehaviour");
                    content.AppendLine("{");
                    content.AppendLine("    void Start()");
                    content.AppendLine("    {");
                    content.AppendLine("        ");
                    content.AppendLine("    }");
                    content.AppendLine("    ");
                    content.AppendLine("    void Update()");
                    content.AppendLine("    {");
                    content.AppendLine("        ");
                    content.AppendLine("    }");
                    content.AppendLine("}");
                    break;
                    
                case "ScriptableObject":
                    content.AppendLine($"[CreateAssetMenu(fileName = \\"New {className}\\", menuName = \\"{className}\\")]");
                    content.AppendLine($"public class {className} : ScriptableObject");
                    content.AppendLine("{");
                    content.AppendLine("    ");
                    content.AppendLine("}");
                    break;
                    
                default:
                    content.AppendLine($"public class {className}");
                    content.AppendLine("{");
                    content.AppendLine("    ");
                    content.AppendLine("}");
                    break;
            }
            
            return content.ToString();
        }
    }
}`;
  }

  private getFolderHandlerTemplate(): string {
    return `using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using UnityEditor;
using UnityEngine;

namespace Unity.MCP.Bridge.Handlers
{
    public class FolderHandler : MCPHandlerBase
    {
        private readonly string[] supportedMethods = {
            "Unity.Folder.Create",
            "Unity.Folder.Delete",
            "Unity.Folder.List"
        };

        public override bool CanHandle(string method)
        {
            return Array.Exists(supportedMethods, m => m == method);
        }

        public override string[] GetSupportedMethods()
        {
            return (string[])supportedMethods.Clone();
        }

        public override async Task<object> HandleAsync(string method, dynamic parameters)
        {
            switch (method)
            {
                case "Unity.Folder.Create":
                    return await CreateFolder(parameters);
                case "Unity.Folder.Delete":
                    return await DeleteFolder(parameters);
                case "Unity.Folder.List":
                    return await ListFolder(parameters);
                default:
                    throw new NotImplementedException($"Method not implemented: {method}");
            }
        }

        private async Task<object> CreateFolder(dynamic parameters)
        {
            return await ExecuteOnMainThread(() =>
            {
                string path = parameters?.path;
                bool recursive = parameters?.recursive ?? true;
                
                var createdPaths = new List<string>();
                
                if (recursive)
                {
                    string[] folders = path.Split('/');
                    string currentPath = folders[0];
                    
                    for (int i = 1; i < folders.Length; i++)
                    {
                        string newPath = currentPath + "/" + folders[i];
                        if (!AssetDatabase.IsValidFolder(newPath))
                        {
                            AssetDatabase.CreateFolder(currentPath, folders[i]);
                            createdPaths.Add(newPath);
                        }
                        currentPath = newPath;
                    }
                }
                
                var guid = AssetDatabase.AssetPathToGUID(path);
                
                return new
                {
                    path = path,
                    guid = guid,
                    createdPaths = createdPaths,
                    success = true
                };
            });
        }

        private async Task<object> DeleteFolder(dynamic parameters)
        {
            return await ExecuteOnMainThread(() =>
            {
                string path = parameters?.path;
                
                if (!AssetDatabase.DeleteAsset(path))
                {
                    throw new InvalidOperationException($"Failed to delete folder: {path}");
                }
                
                return new
                {
                    path = path,
                    success = true
                };
            });
        }

        private async Task<object> ListFolder(dynamic parameters)
        {
            return await ExecuteOnMainThread(() =>
            {
                Debug.Log($"[FolderHandler] ListFolder called with parameters: {parameters}");
                
                string path = parameters?.path ?? "Assets";
                
                Debug.Log($"[FolderHandler] Target path: '{path}'");
                
                if (!AssetDatabase.IsValidFolder(path))
                {
                    Debug.LogError($"[FolderHandler] Invalid folder path: '{path}'");
                    throw new DirectoryNotFoundException($"Folder not found: {path}");
                }
                
                var folders = new List<object>();
                var files = new List<object>();
                
                string[] guids = AssetDatabase.FindAssets("", new[] { path });
                
                Debug.Log($"[FolderHandler] Found {guids.Length} assets in path: {path}");
            
                foreach (string guid in guids)
                {
                    string assetPath = AssetDatabase.GUIDToAssetPath(guid);
                    
                    // Skip if not direct child of the specified path
                    string parentPath = Path.GetDirectoryName(assetPath).Replace('\\\\', '/');
                    if (parentPath != path) continue;
                    
                    if (AssetDatabase.IsValidFolder(assetPath))
                    {
                        folders.Add(new
                        {
                            name = Path.GetFileName(assetPath),
                            path = assetPath,
                            type = "folder",
                            guid = guid
                        });
                    }
                    else
                    {
                        var fileInfo = new FileInfo(assetPath);
                        files.Add(new
                        {
                            name = Path.GetFileName(assetPath),
                            path = assetPath,
                            type = "file",
                            extension = fileInfo.Extension,
                            guid = guid
                        });
                    }
                }
                
                Debug.Log($"[FolderHandler] Found {folders.Count} folders, {files.Count} files");
                
                return new
                {
                    path = path,
                    folders = folders,
                    files = files,
                    success = true
                };
            });
        }
    }
}`;
  }
}

// Start the server
async function main() {
  const server = new Unity6MCPServer();
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    await server.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await server.shutdown();
    process.exit(0);
  });

  await server.start();
}

// Export for testing
export { Unity6MCPServer };

// Only run main if this is the main module
if (import.meta.url === 'file://' + process.argv[1]) {
  main().catch(console.error);
}