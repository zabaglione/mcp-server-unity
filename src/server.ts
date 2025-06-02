import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { Logger } from './types/index.js';
import { ConsoleLogger } from './utils/logger.js';
import { ServiceFactory, Services } from './services/service-factory.js';

export class UnityMCPServer {
  private server: Server;
  private logger: Logger;
  private services: Services;

  constructor(logger?: Logger) {
    this.logger = logger || new ConsoleLogger('[Unity MCP]');
    
    this.server = new Server(
      {
        name: 'unity-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Initialize services using factory
    this.services = ServiceFactory.createServices(this.logger);
    ServiceFactory.connectServices(this.services);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Project Management
        {
          name: 'project_setup_path',
          description: 'Set the Unity project path',
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
          name: 'project_read_info',
          description: 'Get Unity project information',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        
        // Asset Creation
        {
          name: 'asset_create_script',
          description: 'Create a new C# script in the Unity project',
          inputSchema: {
            type: 'object',
            properties: {
              fileName: {
                type: 'string',
                description: 'Name of the script file (without .cs extension)',
              },
              content: {
                type: 'string',
                description: 'Content of the script',
              },
              folder: {
                type: 'string',
                description: 'Folder path relative to Assets/Scripts (optional)',
              },
            },
            required: ['fileName', 'content'],
          },
        },
        {
          name: 'asset_create_scene',
          description: 'Create a new Unity scene',
          inputSchema: {
            type: 'object',
            properties: {
              sceneName: {
                type: 'string',
                description: 'Name of the scene (without .unity extension)',
              },
            },
            required: ['sceneName'],
          },
        },
        {
          name: 'asset_create_material',
          description: 'Create a new Unity material',
          inputSchema: {
            type: 'object',
            properties: {
              materialName: {
                type: 'string',
                description: 'Name of the material (without .mat extension)',
              },
            },
            required: ['materialName'],
          },
        },
        {
          name: 'asset_create_shader',
          description: 'Create a new Unity shader',
          inputSchema: {
            type: 'object',
            properties: {
              shaderName: {
                type: 'string',
                description: 'Name of the shader (without extension)',
              },
              shaderType: {
                type: 'string',
                description: 'Type of shader to create',
                enum: ['builtin', 'urp', 'hdrp', 'urpGraph', 'hdrpGraph'],
                default: 'builtin',
              },
              customContent: {
                type: 'string',
                description: 'Custom shader content (optional, uses template if not provided)',
              },
            },
            required: ['shaderName'],
          },
        },
        
        // Asset Reading
        {
          name: 'asset_read_script',
          description: 'Read a C# script from the Unity project',
          inputSchema: {
            type: 'object',
            properties: {
              fileName: {
                type: 'string',
                description: 'Name of the script file',
              },
            },
            required: ['fileName'],
          },
        },
        
        // Asset Listing
        {
          name: 'asset_list_scripts',
          description: 'List all C# scripts in the Unity project',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'asset_list_shaders',
          description: 'List all shaders in the Unity project',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'asset_list_all',
          description: 'List assets in the Unity project',
          inputSchema: {
            type: 'object',
            properties: {
              assetType: {
                type: 'string',
                description: 'Type of assets to list (all, scenes, materials, scripts, shaders)',
                enum: ['all', 'scenes', 'materials', 'scripts', 'shaders'],
              },
            },
          },
        },
        
        // Editor Extensions
        {
          name: 'editor_create_script',
          description: 'Create a Unity Editor extension script',
          inputSchema: {
            type: 'object',
            properties: {
              scriptName: {
                type: 'string',
                description: 'Name of the editor script (without .cs extension)',
              },
              scriptType: {
                type: 'string',
                description: 'Type of editor script to create',
                enum: ['editorWindow', 'customEditor', 'propertyDrawer', 'menuItems', 'scriptableObjectEditor'],
              },
              targetClass: {
                type: 'string',
                description: 'Target class name (required for customEditor)',
              },
              attributeName: {
                type: 'string',
                description: 'Attribute name (optional for propertyDrawer)',
              },
              customContent: {
                type: 'string',
                description: 'Custom script content (optional)',
              },
            },
            required: ['scriptName', 'scriptType'],
          },
        },
        {
          name: 'editor_list_scripts',
          description: 'List all editor scripts in the Unity project',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        
        // ProBuilder/Modeling
        {
          name: 'modeling_create_script',
          description: 'Create a ProBuilder script for 3D modeling',
          inputSchema: {
            type: 'object',
            properties: {
              scriptName: {
                type: 'string',
                description: 'Name of the ProBuilder script',
              },
              scriptType: {
                type: 'string',
                description: 'Type of ProBuilder script',
                enum: ['shape', 'meshEditor', 'runtime'],
              },
              customContent: {
                type: 'string',
                description: 'Custom script content (optional)',
              },
            },
            required: ['scriptName', 'scriptType'],
          },
        },
        {
          name: 'modeling_create_prefab',
          description: 'Create a ProBuilder prefab with a specific shape',
          inputSchema: {
            type: 'object',
            properties: {
              prefabName: {
                type: 'string',
                description: 'Name of the prefab',
              },
              shapeType: {
                type: 'string',
                description: 'Type of ProBuilder shape',
                enum: ['cube', 'cylinder', 'sphere', 'plane', 'stairs', 'arch', 'torus', 'custom'],
              },
              size: {
                type: 'object',
                description: 'Size of the shape',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                  z: { type: 'number' },
                },
              },
              includeScript: {
                type: 'boolean',
                description: 'Include a controller script with the prefab',
                default: true,
              },
            },
            required: ['prefabName', 'shapeType'],
          },
        },
        {
          name: 'modeling_list_scripts',
          description: 'List all ProBuilder scripts in the project',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        
        // Package Management
        {
          name: 'package_search',
          description: 'Search Unity standard packages by name, category, or feature',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query (package name, category, or feature)',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'package_install',
          description: 'Install a Unity package',
          inputSchema: {
            type: 'object',
            properties: {
              packageName: {
                type: 'string',
                description: 'Package name (e.g., com.unity.probuilder)',
              },
              version: {
                type: 'string',
                description: 'Package version (optional, defaults to latest)',
              },
            },
            required: ['packageName'],
          },
        },
        {
          name: 'package_remove',
          description: 'Remove a Unity package',
          inputSchema: {
            type: 'object',
            properties: {
              packageName: {
                type: 'string',
                description: 'Package name to remove',
              },
            },
            required: ['packageName'],
          },
        },
        {
          name: 'package_list',
          description: 'List all installed packages',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'package_install_multiple',
          description: 'Install multiple Unity packages at once with a single refresh',
          inputSchema: {
            type: 'object',
            properties: {
              packages: {
                type: 'array',
                description: 'Array of packages to install',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Package name',
                    },
                    version: {
                      type: 'string',
                      description: 'Package version (optional)',
                    },
                  },
                  required: ['name'],
                },
              },
            },
            required: ['packages'],
          },
        },
        
        // Build Operations
        {
          name: 'build_execute_project',
          description: 'Build the Unity project',
          inputSchema: {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                description: 'Build target platform',
                enum: ['StandaloneWindows64', 'StandaloneOSX', 'StandaloneLinux64', 'iOS', 'Android', 'WebGL'],
              },
              outputPath: {
                type: 'string',
                description: 'Output path for the build',
              },
            },
            required: ['target', 'outputPath'],
          },
        },
        
        // System Operations
        {
          name: 'system_setup_refresh',
          description: 'Install Unity refresh handler script',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'system_refresh_assets',
          description: 'Trigger Unity asset database refresh and optional script recompilation',
          inputSchema: {
            type: 'object',
            properties: {
              forceRecompile: {
                type: 'boolean',
                description: 'Force script recompilation',
                default: false,
              },
              recompileScripts: {
                type: 'boolean',
                description: 'Request script recompilation',
                default: false,
              },
              saveAssets: {
                type: 'boolean',
                description: 'Save all assets after refresh',
                default: false,
              },
              specificFolders: {
                type: 'array',
                description: 'Specific folders to refresh',
                items: { type: 'string' },
              },
            },
          },
        },
        {
          name: 'system_batch_start',
          description: 'Start batch mode for multiple file operations',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'system_batch_end',
          description: 'End batch mode and trigger single refresh for all operations',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Project Management
          case 'project_setup_path':
            if (!args || typeof args.projectPath !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'projectPath is required');
            }
            return await this.services.projectService.setProject(args.projectPath);

          case 'project_read_info':
            const info = await this.services.projectService.getProjectInfo();
            // Enhance with asset counts
            const counts = await this.services.assetService.getAssetCounts();
            info.content[0].text += `\nScripts: ${counts.scripts}\nScenes: ${counts.scenes}\nMaterials: ${counts.materials}`;
            return info;

          // Asset Creation
          case 'asset_create_script':
            if (!args || typeof args.fileName !== 'string' || typeof args.content !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'fileName and content are required');
            }
            return await this.services.scriptService.createScript(
              args.fileName,
              args.content,
              args.folder as string | undefined
            );

          case 'asset_create_scene':
            if (!args || typeof args.sceneName !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'sceneName is required');
            }
            return await this.services.assetService.createScene(args.sceneName);

          case 'asset_create_material':
            if (!args || typeof args.materialName !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'materialName is required');
            }
            return await this.services.assetService.createMaterial(args.materialName);

          case 'asset_create_shader':
            if (!args || typeof args.shaderName !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'shaderName is required');
            }
            return await this.services.shaderService.createShader(
              args.shaderName,
              args.shaderType as any || 'builtin',
              args.customContent as string | undefined
            );

          // Asset Reading
          case 'asset_read_script':
            if (!args || typeof args.fileName !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'fileName is required');
            }
            return await this.services.scriptService.readScript(args.fileName);

          // Asset Listing
          case 'asset_list_scripts':
            return await this.services.scriptService.listScripts();

          case 'asset_list_shaders':
            return await this.services.shaderService.listShaders();

          case 'asset_list_all':
            return await this.services.assetService.listAssets(args?.assetType as string);

          // Editor Extensions
          case 'editor_create_script':
            if (!args || typeof args.scriptName !== 'string' || typeof args.scriptType !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'scriptName and scriptType are required');
            }
            return await this.services.editorScriptService.createEditorScript(
              args.scriptName,
              args.scriptType as any,
              {
                targetClass: args.targetClass as string,
                attributeName: args.attributeName as string,
                customContent: args.customContent as string,
              }
            );

          case 'editor_list_scripts':
            return await this.services.editorScriptService.listEditorScripts();

          // ProBuilder/Modeling
          case 'modeling_create_script':
            if (!args || typeof args.scriptName !== 'string' || typeof args.scriptType !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'scriptName and scriptType are required');
            }
            return await this.services.proBuilderService.createProBuilderScript(
              args.scriptName,
              args.scriptType as any,
              args.customContent as string
            );

          case 'modeling_create_prefab':
            if (!args || typeof args.prefabName !== 'string' || typeof args.shapeType !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'prefabName and shapeType are required');
            }
            return await this.services.proBuilderService.createProBuilderPrefab(
              args.prefabName,
              {
                type: args.shapeType as any,
                size: args.size as any,
              },
              args.includeScript !== false
            );

          case 'modeling_list_scripts':
            return await this.services.proBuilderService.listProBuilderScripts();

          // Package Management
          case 'package_search':
            if (!args || typeof args.query !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'query is required');
            }
            return await this.services.packageService.searchPackages(args.query);

          case 'package_install':
            if (!args || typeof args.packageName !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'packageName is required');
            }
            return await this.services.packageService.installPackage(
              args.packageName,
              args.version as string | undefined
            );

          case 'package_remove':
            if (!args || typeof args.packageName !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'packageName is required');
            }
            return await this.services.packageService.removePackage(args.packageName);

          case 'package_list':
            return await this.services.packageService.listInstalledPackages();

          case 'package_install_multiple':
            if (!args || !Array.isArray(args.packages) || args.packages.length === 0) {
              throw new McpError(ErrorCode.InvalidParams, 'packages array is required and must not be empty');
            }
            return await this.services.packageService.installMultiplePackages(args.packages);

          // Build Operations
          case 'build_execute_project':
            if (!args || typeof args.target !== 'string' || typeof args.outputPath !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'target and outputPath are required');
            }
            return await this.services.buildService.buildProject(args.target, args.outputPath);

          // System Operations
          case 'system_setup_refresh':
            return await this.services.refreshService.setupRefreshHandler();

          case 'system_refresh_assets':
            return await this.services.refreshService.refreshUnityAssets({
              forceRecompile: args?.forceRecompile as boolean,
              recompileScripts: args?.recompileScripts as boolean,
              saveAssets: args?.saveAssets as boolean,
              specificFolders: args?.specificFolders as string[],
            });

          case 'system_batch_start':
            return await this.services.refreshService.startBatchOperation();

          case 'system_batch_end':
            return await this.services.refreshService.endBatchOperation();

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        this.logger.error(`Error executing ${name}`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing ${name}: ${error}`
        );
      }
    });
  }

  getServer(): Server {
    return this.server;
  }
}