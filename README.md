# Unity MCP Server

[日本語版 README はこちら](./README-ja.md)

A Model Context Protocol (MCP) server that enables AI assistants like Claude to interact with Unity projects programmatically. Supports both Claude Desktop integration and HTTP API for flexible development workflows.

## Features

### 📦 Core Features
- **Project Management**: Set up and manage Unity projects with automatic validation
- **Asset Creation**: Create scripts, materials, shaders, and scenes
- **Asset Management**: Read, list, and update Unity assets
- **Build Automation**: Multi-platform builds with custom settings
- **Render Pipeline Detection**: Automatic detection of Built-in, URP, or HDRP

### 🔧 Material Management
- **Material Creation**: Auto-detects render pipeline for correct shader selection
- **Shader Updates**: Change material shaders with GUID management
- **Property Editing**: Update colors, floats, textures, and vectors
- **Batch Conversion**: Convert multiple materials to different shaders
- **Material Reading**: Inspect material properties and shader information

### 📝 Code Management
- **Script Creation**: Create C# scripts with proper namespace structure
- **Script Updates**: Update existing scripts with full content replacement
- **Code Analysis**: Diff comparison, duplicate class detection
- **Namespace Management**: Auto-suggest and apply namespaces based on file location
- **Compilation Monitoring**: Real-time compilation error tracking

### 🛠️ Advanced Features
- **Editor Extensions**: Custom windows, inspectors, property drawers
- **Shader Creation**: Built-in, URP, HDRP, Shader Graph support
- **Unity Refresh**: Automatic asset database refresh with batch operations
- **Diagnostics**: Compilation errors, asset validation, editor log analysis

### 🎨 UI Toolkit Development
- **UXML Creation**: Create UI layouts with templates (window, document, component)
- **USS Styling**: Generate stylesheets with themes, utilities, and component styles
- **Component System**: Create complete UI components with UXML, USS, and C# controller
- **File Management**: Read, update, and list UXML/USS files
- **UI Builder Integration**: Files compatible with Unity's visual UI Builder tool

## Installation

```bash
# Clone the repository
git clone https://github.com/zabaglione/unity-mcp-server.git
cd unity-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage Options

### Option 1: Claude Desktop (MCP stdio)

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-server-unity": {
      "command": "node",
      "args": ["/absolute/path/to/unity-mcp/build/index.js"]
    }
  }
}
```

Then use natural language in Claude Desktop:
- "Set Unity project to /path/to/project"
- "Create a 2D platformer with inventory system"
- "Generate a player controller with double jump"

### Option 2: HTTP Server

1. **Start the HTTP server:**
```bash
npm run start:http
# or specify a custom port
PORT=8080 npm run start:http
```

2. **Set up your Unity project:**
```bash
curl -X POST http://localhost:3000/api/project/setup \
  -H "Content-Type: application/json" \
  -d '{"projectPath": "/path/to/your/unity/project"}'
```

3. **Analyze requirements with AI:**
```bash
curl -X POST http://localhost:3000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"description": "Create a 2D platformer with inventory system"}'
```

## Documentation

- [API Documentation](./docs/api/HTTP_API.md) - Complete HTTP API reference
- [Available Tools](./docs/api/AVAILABLE_TOOLS.md) - List of all MCP tools
- [Documentation Index](./docs/index.md) - All documentation

### Key Endpoints

- `GET /health` - Health check
- `GET /api-docs` - API documentation
- `POST /api/project/setup` - Configure Unity project
- `POST /api/ai/analyze` - Analyze requirements
- `POST /api/system/player-controller` - Generate player controller
- `POST /api/asset/create-script` - Create C# scripts
- `POST /api/batch` - Execute batch operations

## Usage Examples

### Create a Player Controller
```javascript
const response = await fetch('http://localhost:3000/api/system/player-controller', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    gameType: 'platformer',
    requirements: ['doubleJump', 'wallJump', 'dash']
  })
});
```

### Generate Project Structure
```javascript
const response = await fetch('http://localhost:3000/api/project/create-structure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectType: '2D_Platformer',
    customStructure: {
      folders: ['Scripts/Player', 'Scripts/Enemy', 'Scripts/UI']
    }
  })
});
```

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Clean build
npm run clean
```

## Configuration

### Environment Variables
- `PORT` - HTTP server port (default: 3000)
- `UNITY_PATH` - Path to Unity executable (auto-detected if not set)

### Supported Platforms
- macOS
- Windows
- Linux

### Unity Versions
- Unity 2021.3 LTS and newer
- Unity 6000.x (Unity 6)

## Architecture

The server uses a modular service architecture:

- **AI Core** - Natural language processing and planning
- **Service Layer** - Unity project operations
- **HTTP API** - RESTful endpoints
- **Template System** - Code generation templates

## Requirements

- Node.js 18.x or higher
- Unity 2021.3 LTS or newer
- npm or yarn

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

Built with:
- Express.js for HTTP server
- TypeScript for type safety
- Unity Editor integration

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/zabaglione/unity-mcp-server/issues).

For direct tool usage, here are the available MCP tools:

### Project Management
- `project_setup_path` - Set Unity project path
- `project_read_info` - Get project information

### Asset Creation & Management
- `asset_create_script` - Create C# scripts
- `asset_read_script` - Read script contents
- `asset_update_script` - Update script content
- `asset_list_scripts` - List all scripts
- `asset_create_scene` - Create Unity scenes
- `asset_create_shader` - Create shaders (builtin, URP, HDRP, ShaderGraph)
- `asset_read_shader` - Read shader content
- `asset_update_shader` - Update shader content
- `asset_list_shaders` - List all shaders
- `asset_list_all` - List all assets by type

### Editor Extensions
- `editor_create_script` - Create editor scripts
- `editor_list_scripts` - List editor scripts

### Material Management
- `asset_create_material` - Create materials with auto-detected render pipeline
- `asset_create_material_with_shader` - Create material with specific shader
- `asset_update_material_shader` - Change material shader
- `asset_update_material_properties` - Update material properties
- `asset_read_material` - Read material properties
- `asset_update_material` - Update entire material content (YAML)
- `asset_clone_material` - Clone material with new name
- `asset_batch_convert_materials` - Batch convert materials
- `asset_list_materials` - List all materials

### Code Analysis
- `code_analyze_diff` - Get detailed diff between files
- `code_detect_duplicates` - Detect duplicate class names
- `code_suggest_namespace` - Suggest namespace for file
- `code_apply_namespace` - Apply namespace to script

### Compilation Tools
- `compile_get_errors` - Get compilation errors with context
- `compile_get_status` - Get current compilation status
- `compile_install_helper` - Install compilation monitoring helper

### Build Operations
- `build_execute_project` - Build Unity project

### System Operations
- `system_setup_refresh` - Setup Unity refresh handler
- `system_refresh_assets` - Refresh Unity assets
- `system_batch_start` - Start batch mode
- `system_batch_end` - End batch mode

## Supported Build Targets

- StandaloneWindows64
- StandaloneOSX
- StandaloneLinux64
- iOS
- Android
- WebGL

## Development

### Scripts

- `npm run build` - Build the TypeScript project
- `npm run dev` - Watch mode for development
- `npm start` - Run the built server
- `npm run clean` - Clean build directory
- `npm run test` - Run automated tests (when implemented)
- `npm run test:manual` - Instructions for manual testing

### Project Structure

```
mcp-server-unity/
├── src/
│   ├── server.ts                 # Main server implementation
│   ├── config/                   # Configuration files
│   ├── services/                 # Service layer (modular architecture)
│   │   ├── project-service.ts    # Unity project management
│   │   ├── script-service.ts     # Script operations
│   │   ├── asset-service.ts      # Asset creation
│   │   ├── shader-service.ts     # Shader management
│   │   ├── editor-script-service.ts  # Editor extensions
│   │   ├── material-service.ts   # Material management
│   │   ├── code-analysis-service.ts  # Code analysis tools
│   │   ├── compilation-service.ts    # Compilation monitoring
│   │   ├── build-service.ts      # Build automation
│   │   └── unity-refresh-service.ts  # Unity refresh system
│   ├── templates/                # Code generation templates
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   └── validators/               # Input validation
├── tests/
│   ├── comprehensive-test.js     # Full feature test suite
│   ├── integration-test.js       # Integration tests
│   └── run-manual-tests.sh      # Manual test runner
├── build/                        # Compiled output (gitignored)
├── package.json                  # Project configuration
├── tsconfig.json                 # TypeScript configuration
├── setup.sh                      # Setup script
└── REGRESSION_TEST_CASES.md      # Detailed test documentation
```

## Troubleshooting

### Unity project not recognized
- Ensure the project path contains both `Assets` and `ProjectSettings` folders
- Check file permissions

### Build command fails
- Verify Unity is installed at the expected location
- For custom Unity installations, modify the Unity path in your fork

### Script not found
- Scripts are searched recursively from the Assets folder
- Ensure the file has a .cs extension

## Testing

The project includes comprehensive test cases with 100% feature coverage:

### Comprehensive Test Suite
```bash
# Run all feature tests (38 test cases)
node tests/comprehensive-test.js /path/to/unity/project

# Example
node tests/comprehensive-test.js /Users/me/Unity/MyProject
```

### Automated Integration Tests
```bash
# Run integration tests with your Unity project
npm run test:integration /path/to/unity/project

# Example
npm run test:integration /Users/me/Unity/MyProject
```

### Manual Testing
```bash
# Run guided manual tests
./tests/run-manual-tests.sh /path/to/unity/project
```

### Test Coverage
- **38 automated test cases** covering all features
- **10 test categories**: Project, Scripts, Assets, Shaders, Editor, ProBuilder, Packages, Refresh, Build, Errors
- **Automatic cleanup** after test execution
- **Performance metrics** for each test

- **Test Documentation**: See [tests/README.md](./tests/README.md) for testing guide
- **Test Cases**: Comprehensive test coverage in `tests/` directory

## Recent Updates

### v2.2.0 (2025-06-06)
- Added shader and material update features
- Implemented temporary backup system with automatic cleanup
- Added material cloning functionality
- Enhanced shader GUID caching and lookup
- Added comprehensive read operations for shaders

### v2.1.0 (2025-06-06)
- Fixed shader-material GUID reference issues
- Added meta file generation for all Unity assets
- Improved custom shader detection and lookup
- Enhanced material creation with proper shader references
- Added comprehensive debugging and logging

See [CHANGELOG.md](./CHANGELOG.md) for full version history.

## Known Issues and Solutions

### Custom Shader References
When creating custom shaders, use the full shader name (including "Custom/" prefix) when creating materials:
```bash
# Create shader
asset_create_shader shaderName:"MyShader" shaderType:"builtin"
# Returns: Shader Name: Custom/MyShader

# Create material with that shader
asset_create_material_with_shader materialName:"MyMaterial" shaderName:"Custom/MyShader"
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## Repository

Recommended repository name: `mcp-server-unity`

This follows the MCP ecosystem naming convention where MCP servers are prefixed with `mcp-server-`.

## License

MIT License - see [LICENSE](LICENSE) file for details.