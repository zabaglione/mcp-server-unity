#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ConsoleLogger } from './utils/logger.js';
import { ServicesContainer } from './services-container.js';

/**
 * Unity MCP Server for Claude Desktop
 * This server provides stdio transport for Claude Desktop integration
 */
class UnityMCPServer {
  private server: Server;
  private servicesContainer: ServicesContainer;
  private services: any;
  private logger: ConsoleLogger;

  constructor(logger?: ConsoleLogger) {
    this.logger = logger || new ConsoleLogger('[Unity MCP]');
    this.server = new Server(
      {
        name: 'unity-mcp-server',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Initialize services using container
    this.servicesContainer = new ServicesContainer(this.logger);
    this.services = this.servicesContainer.getServices();

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
        // Diagnostics Tools
        {
          name: 'diagnostics_set_unity_path',
          description: 'Set Unity executable path for diagnostics',
          inputSchema: {
            type: 'object',
            properties: {
              unityPath: {
                type: 'string',
                description: 'Path to Unity executable (optional, will auto-detect if not provided)',
              },
            },
          },
        },
        {
          name: 'diagnostics_read_editor_log',
          description: 'Read Unity Editor log for errors and warnings',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'diagnostics_compile_scripts',
          description: 'Compile Unity scripts and get compilation errors',
          inputSchema: {
            type: 'object',
            properties: {
              forceRecompile: {
                type: 'boolean',
                description: 'Force recompilation of all scripts',
                default: false,
              },
            },
          },
        },
        {
          name: 'diagnostics_validate_assets',
          description: 'Validate asset integrity (missing meta files, orphaned assets, etc.)',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'diagnostics_run_tests',
          description: 'Run Unity tests and get results',
          inputSchema: {
            type: 'object',
            properties: {
              testPlatform: {
                type: 'string',
                description: 'Test platform (EditMode or PlayMode)',
                default: 'EditMode',
              },
            },
          },
        },
        {
          name: 'diagnostics_summary',
          description: 'Get comprehensive diagnostics summary for AI analysis',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'diagnostics_install_script',
          description: 'Install Unity diagnostics script for real-time error detection',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'diagnostics_read_results',
          description: 'Read diagnostics results saved by Unity',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        // AI Tools
        {
          name: 'ai_analyze_requirements',
          description: 'Analyze natural language requirements and generate project plan',
          inputSchema: {
            type: 'object',
            properties: {
              description: {
                type: 'string',
                description: 'Natural language description of the game or feature to create',
              },
            },
            required: ['description'],
          },
        },
        {
          name: 'ai_create_project_structure',
          description: 'Create project structure based on project type',
          inputSchema: {
            type: 'object',
            properties: {
              projectType: {
                type: 'string',
                description: 'Type of project',
                enum: ['2D_Platformer', '3D_FPS', 'VR', 'Mobile', 'Custom'],
              },
              customStructure: {
                type: 'object',
                description: 'Custom folder structure (optional)',
              },
            },
            required: ['projectType'],
          },
        },
        {
          name: 'ai_setup_architecture',
          description: 'Setup architecture pattern for the project',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'Architecture pattern',
                enum: ['MVC', 'ECS', 'Observer', 'Custom'],
              },
              customConfig: {
                type: 'object',
                description: 'Custom configuration (optional)',
              },
            },
            required: ['pattern'],
          },
        },
        // Game System Generation
        {
          name: 'system_create_player_controller',
          description: 'Generate a complete player controller system',
          inputSchema: {
            type: 'object',
            properties: {
              gameType: {
                type: 'string',
                description: 'Type of game (platformer, fps, thirdperson, topdown)',
              },
              requirements: {
                type: 'array',
                description: 'List of required features',
                items: { type: 'string' },
              },
            },
            required: ['gameType', 'requirements'],
          },
        },
        {
          name: 'system_create_camera',
          description: 'Generate a camera system',
          inputSchema: {
            type: 'object',
            properties: {
              cameraType: {
                type: 'string',
                description: 'Type of camera (follow, orbit, fixed)',
              },
              specifications: {
                type: 'object',
                description: 'Camera specifications',
              },
            },
            required: ['cameraType'],
          },
        },
        {
          name: 'system_create_ui_framework',
          description: 'Generate a complete UI framework',
          inputSchema: {
            type: 'object',
            properties: {
              uiType: {
                type: 'string',
                description: 'Type of UI (mobile, desktop, vr)',
              },
              screens: {
                type: 'array',
                description: 'List of screens to create',
                items: { type: 'string' },
              },
            },
            required: ['uiType', 'screens'],
          },
        },
        {
          name: 'system_create_audio_manager',
          description: 'Generate an audio management system',
          inputSchema: {
            type: 'object',
            properties: {
              requirements: {
                type: 'array',
                description: 'Audio system requirements',
                items: { type: 'string' },
              },
            },
            required: ['requirements'],
          },
        },
        // Material Management
        {
          name: 'asset_update_material_shader',
          description: 'Change the shader of an existing material',
          inputSchema: {
            type: 'object',
            properties: {
              materialName: {
                type: 'string',
                description: 'Name of the material file (with or without .mat extension)',
              },
              shaderName: {
                type: 'string',
                description: 'Full shader name (e.g., "Universal Render Pipeline/Lit", "Custom/URP/CubeController")',
              },
            },
            required: ['materialName', 'shaderName'],
          },
        },
        {
          name: 'asset_update_material_properties',
          description: 'Update properties of an existing material',
          inputSchema: {
            type: 'object',
            properties: {
              materialName: {
                type: 'string',
                description: 'Name of the material file',
              },
              properties: {
                type: 'object',
                description: 'Material properties to update',
                properties: {
                  colors: {
                    type: 'object',
                    description: 'Color properties (e.g., {"_BaseColor": [1.0, 0.0, 0.0, 1.0]})',
                  },
                  floats: {
                    type: 'object',
                    description: 'Float properties (e.g., {"_Metallic": 0.5, "_Smoothness": 0.8})',
                  },
                  textures: {
                    type: 'object',
                    description: 'Texture properties (e.g., {"_MainTex": "path/to/texture.png"})',
                  },
                  vectors: {
                    type: 'object',
                    description: 'Vector4 properties (e.g., {"_Tiling": [1.0, 1.0, 0.0, 0.0]})',
                  },
                },
              },
            },
            required: ['materialName', 'properties'],
          },
        },
        {
          name: 'asset_read_material',
          description: 'Read material properties and current shader',
          inputSchema: {
            type: 'object',
            properties: {
              materialName: {
                type: 'string',
                description: 'Name of the material file',
              },
            },
            required: ['materialName'],
          },
        },
        {
          name: 'asset_batch_convert_materials',
          description: 'Convert multiple materials to specified shader with property mapping',
          inputSchema: {
            type: 'object',
            properties: {
              materials: {
                type: 'array',
                description: 'List of material names to convert',
                items: { type: 'string' },
              },
              targetShader: {
                type: 'string',
                description: 'Target shader name',
              },
              propertyMapping: {
                type: 'object',
                description: 'Mapping from old properties to new properties (optional)',
              },
            },
            required: ['materials', 'targetShader'],
          },
        },
        {
          name: 'asset_create_material_with_shader',
          description: 'Create a material with a specific shader (including custom shaders)',
          inputSchema: {
            type: 'object',
            properties: {
              materialName: {
                type: 'string',
                description: 'Name of the material (without .mat extension)',
              },
              shaderName: {
                type: 'string',
                description: 'Name of the shader to use (e.g., "TimeColorShader", "Universal Render Pipeline/Lit")',
              },
            },
            required: ['materialName', 'shaderName'],
          },
        },
        {
          name: 'asset_update_script',
          description: 'Update content of an existing C# script',
          inputSchema: {
            type: 'object',
            properties: {
              fileName: {
                type: 'string',
                description: 'Name of the script file',
              },
              content: {
                type: 'string',
                description: 'New script content',
              },
            },
            required: ['fileName', 'content'],
          },
        },
        // Code Analysis Tools
        {
          name: 'code_analyze_diff',
          description: 'Get detailed diff between current file and new content',
          inputSchema: {
            type: 'object',
            properties: {
              fileName: {
                type: 'string',
                description: 'Name of the script file',
              },
              newContent: {
                type: 'string',
                description: 'New content to compare with current file',
              },
            },
            required: ['fileName', 'newContent'],
          },
        },
        {
          name: 'code_detect_duplicates',
          description: 'Detect duplicate class names across the project',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'code_suggest_namespace',
          description: 'Suggest namespace based on file location',
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
        {
          name: 'code_apply_namespace',
          description: 'Apply namespace to a script file',
          inputSchema: {
            type: 'object',
            properties: {
              fileName: {
                type: 'string',
                description: 'Name of the script file',
              },
              namespace: {
                type: 'string',
                description: 'Namespace to apply (optional, auto-generated if not provided)',
              },
            },
            required: ['fileName'],
          },
        },
        // Compilation Tools
        {
          name: 'compile_get_errors',
          description: 'Get detailed compilation errors with context',
          inputSchema: {
            type: 'object',
            properties: {
              forceCompile: {
                type: 'boolean',
                description: 'Force Unity to recompile',
                default: false,
              },
            },
          },
        },
        {
          name: 'compile_get_status',
          description: 'Get current compilation status',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'compile_install_helper',
          description: 'Install compilation helper script for real-time error monitoring',
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
            return await this.services.scriptService.createScript(args.fileName, args.content, args.folder);

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
              args.shaderType || 'builtin',
              args.customContent
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
            return await this.services.assetService.listAssets(args?.assetType);

          // Editor Extensions
          case 'editor_create_script':
            if (!args || typeof args.scriptName !== 'string' || typeof args.scriptType !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'scriptName and scriptType are required');
            }
            return await this.services.editorScriptService.createEditorScript(
              args.scriptName,
              args.scriptType,
              {
                targetClass: args.targetClass,
                attributeName: args.attributeName,
                customContent: args.customContent,
              }
            );

          case 'editor_list_scripts':
            return await this.services.editorScriptService.listEditorScripts();

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
              forceRecompile: args?.forceRecompile,
              recompileScripts: args?.recompileScripts,
              saveAssets: args?.saveAssets,
              specificFolders: args?.specificFolders,
            });

          case 'system_batch_start':
            return await this.services.refreshService.startBatchOperation();

          case 'system_batch_end':
            return await this.services.refreshService.endBatchOperation();

          // Diagnostics
          case 'diagnostics_set_unity_path':
            await this.services.diagnosticsService.setUnityPath(args?.unityPath);
            return {
              content: [{
                type: 'text',
                text: 'Unity path set successfully'
              }]
            };

          case 'diagnostics_read_editor_log':
            return await this.services.diagnosticsService.readEditorLog();

          case 'diagnostics_compile_scripts':
            return await this.services.diagnosticsService.compileScripts(args?.forceRecompile);

          case 'diagnostics_validate_assets':
            return await this.services.diagnosticsService.validateAssets();

          case 'diagnostics_run_tests':
            return await this.services.diagnosticsService.runTests(args?.testPlatform);

          case 'diagnostics_summary':
            return await this.services.diagnosticsService.getDiagnosticsSummary();

          case 'diagnostics_install_script':
            return await this.services.diagnosticsService.installDiagnosticsScript();

          case 'diagnostics_read_results':
            return await this.services.diagnosticsService.readDiagnosticsResults();

          // AI Tools
          case 'ai_analyze_requirements':
            if (!args || typeof args.description !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'description is required');
            }
            return await this.services.aiAutomationService.analyzeAndPlanProject(args.description);

          case 'ai_create_project_structure':
            if (!args || typeof args.projectType !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'projectType is required');
            }
            return await this.services.aiAutomationService.createProjectStructure(
              args.projectType,
              args.customStructure
            );

          case 'ai_setup_architecture':
            if (!args || typeof args.pattern !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'pattern is required');
            }
            return await this.services.aiAutomationService.setupArchitecture(
              args.pattern,
              args.customConfig
            );

          // Game System Generation
          case 'system_create_player_controller':
            if (!args || typeof args.gameType !== 'string' || !Array.isArray(args.requirements)) {
              throw new McpError(ErrorCode.InvalidParams, 'gameType and requirements are required');
            }
            return await this.services.gameSystemService.createPlayerController(
              args.gameType,
              args.requirements
            );

          case 'system_create_camera':
            if (!args || typeof args.cameraType !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'cameraType is required');
            }
            return await this.services.gameSystemService.createCameraSystem(
              args.cameraType,
              args.specifications || {}
            );

          case 'system_create_ui_framework':
            if (!args || typeof args.uiType !== 'string' || !Array.isArray(args.screens)) {
              throw new McpError(ErrorCode.InvalidParams, 'uiType and screens are required');
            }
            return await this.services.gameSystemService.createUIFramework(
              args.uiType,
              args.screens
            );

          case 'system_create_audio_manager':
            if (!args || !Array.isArray(args.requirements)) {
              throw new McpError(ErrorCode.InvalidParams, 'requirements are required');
            }
            return await this.services.gameSystemService.createAudioManager(args.requirements);

          // Material Management
          case 'asset_update_material_shader':
            if (!args || typeof args.materialName !== 'string' || typeof args.shaderName !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'materialName and shaderName are required');
            }
            return await this.services.materialService.updateMaterialShader(
              args.materialName,
              args.shaderName
            );

          case 'asset_update_material_properties':
            if (!args || typeof args.materialName !== 'string' || !args.properties) {
              throw new McpError(ErrorCode.InvalidParams, 'materialName and properties are required');
            }
            return await this.services.materialService.updateMaterialProperties(
              args.materialName,
              args.properties
            );

          case 'asset_read_material':
            if (!args || typeof args.materialName !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'materialName is required');
            }
            return await this.services.materialService.readMaterial(args.materialName);

          case 'asset_batch_convert_materials':
            if (!args || !Array.isArray(args.materials) || typeof args.targetShader !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'materials array and targetShader are required');
            }
            return await this.services.materialService.batchConvertMaterials(
              args.materials,
              args.targetShader,
              args.propertyMapping
            );
            
          case 'asset_create_material_with_shader':
            if (!args || typeof args.materialName !== 'string' || typeof args.shaderName !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'materialName and shaderName are required');
            }
            return await this.services.materialService.createMaterialWithShader(
              args.materialName,
              args.shaderName
            );

          case 'asset_update_script':
            if (!args || typeof args.fileName !== 'string' || typeof args.content !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'fileName and content are required');
            }
            return await this.services.scriptService.updateScript(
              args.fileName,
              args.content
            );

          // Code Analysis Tools
          case 'code_analyze_diff':
            if (!args || typeof args.fileName !== 'string' || typeof args.newContent !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'fileName and newContent are required');
            }
            return await this.services.codeAnalysisService.getFileDiff(
              args.fileName,
              args.newContent
            );

          case 'code_detect_duplicates':
            return await this.services.codeAnalysisService.detectClassDuplicates();

          case 'code_suggest_namespace':
            if (!args || typeof args.fileName !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'fileName is required');
            }
            return await this.services.codeAnalysisService.suggestNamespace(args.fileName);

          case 'code_apply_namespace':
            if (!args || typeof args.fileName !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'fileName is required');
            }
            return await this.services.codeAnalysisService.applyNamespace(
              args.fileName,
              args.namespace
            );

          // Compilation Tools
          case 'compile_get_errors':
            return await this.services.compilationService.getCompilationErrors(
              args?.forceCompile || false
            );

          case 'compile_get_status':
            return await this.services.compilationService.getCompilationStatus();

          case 'compile_install_helper':
            return await this.services.compilationService.installCompilationHelper();

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        this.logger.error(`Error executing ${name}`, error);
        throw new McpError(ErrorCode.InternalError, `Error executing ${name}: ${error}`);
      }
    });
  }

  getServer(): Server {
    return this.server;
  }
}

async function main() {
  const logger = new ConsoleLogger('[Unity MCP]');
  const server = new UnityMCPServer(logger);
  const transport = new StdioServerTransport();

  try {
    await server.getServer().connect(transport);
    logger.info('Unity MCP server running on stdio');
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

main().catch(console.error);