# MCP Server for Unity

A Model Context Protocol (MCP) server that enables Claude to interact directly with Unity projects, providing tools for script creation, asset management, and project building.

## Features

### Core Functionality
- **Project Management**: Set and validate Unity project paths
- **Script Operations**: Create, read, and list C# scripts with folder organization
- **Asset Creation**: Generate Unity scenes, materials, and prefabs
- **Asset Management**: List and filter project assets by type
- **Project Information**: Get Unity version and project statistics

### Advanced Features
- **Shader Support**: Create shaders for Built-in, URP, and HDRP render pipelines
- **Shader Graph**: Generate visual shader graphs for URP and HDRP
- **Editor Extensions**: Create custom editor windows, inspectors, property drawers, and menu items
- **ProBuilder Integration**: Create 3D models and procedural meshes with ProBuilder API
- **Runtime Mesh Generation**: Generate and modify meshes dynamically at runtime

### Automation & Efficiency
- **Automatic Unity Refresh**: Trigger asset database refresh and script recompilation
- **Batch Operations**: Queue multiple file operations for efficient single refresh
- **Build Automation**: Build Unity projects from command line for multiple platforms
- **Package Management**: Search, install, and remove Unity packages with smart search
- **File System Watcher**: Real-time monitoring for automatic Unity synchronization

### Architecture Benefits
- **Service-Oriented Architecture**: Modular design for easy extension and maintenance
- **Dependency Injection**: Flexible service composition and testing
- **Comprehensive Validation**: Path traversal protection and input sanitization
- **Template System**: Consistent code generation with customizable templates
- **Error Handling**: Detailed error messages with recovery suggestions

## Requirements

- Node.js 18.x or higher
- Unity 2021.3 LTS or newer (for build functionality)
- Claude Desktop

## Installation

### Quick Setup (Unix/Linux/macOS)

```bash
git clone https://github.com/zabaglione/mcp-server-unity.git
cd mcp-server-unity
./setup.sh
```

### Manual Setup

1. Clone the repository:
```bash
git clone https://github.com/zabaglione/mcp-server-unity.git
cd mcp-server-unity
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-server-unity": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-unity/build/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/mcp-server-unity` with the actual path to your installation.

## Usage Examples

Claude Desktop can understand natural language requests and convert them to the appropriate MCP tool commands. Here are some examples:

### Project Setup
```
"Set Unity project to /Users/me/MyGame"
"Use my Unity project at /path/to/project"
"Initialize Unity project path: /Users/john/UnityProjects/MyAwesomeGame"
```

### Creating Scripts
```
"Create a PlayerController script with basic movement"
"Make a new C# script called EnemyAI in the Enemies folder"
"Generate a GameManager singleton script"
```

### Reading Scripts
```
"Show me the PlayerController script"
"Read the GameManager.cs file"
"What's in the EnemyAI script?"
```

### Creating Assets
```
"Create a new scene called MainMenu"
"Make a material named PlayerMaterial"
"Create a URP shader called WaterShader"
"Generate a Shader Graph for HDRP called CustomLit"
```

### Package Management
```
"Search for ProBuilder packages"
"What 2D packages are available?"
"Find packages for render pipelines"
"Install ProBuilder"
"Install TextMeshPro version 3.0.6"
"Remove ProBuilder package"
"Show installed packages"
"Install ProBuilder, TextMeshPro, and Cinemachine all at once"
```

### Editor Extensions
```
"Create a custom editor window for level design"
"Make a custom inspector for MyComponent"
"Generate a property drawer for RangeAttribute"
```

### ProBuilder Operations
```
"Create a ProBuilder cube prefab"
"Generate a mesh generator script"
"Make a ProBuilder shape creator"
```

### Build Operations
```
"Build the project for Windows"
"Create a macOS build in /Users/me/Builds"
"Build for WebGL to /path/to/output"
```

### Utility Operations
```
"List all scripts in the project"
"Show all shaders"
"Get project information"
"Refresh Unity"
"Start batch operations"
```

## Tool Reference

For direct tool usage, here are the available MCP tools:

### Project Management
- `project_setup_path` - Set Unity project path
- `project_read_info` - Get project information

### Asset Creation & Management
- `asset_create_script` - Create C# scripts
- `asset_read_script` - Read script contents
- `asset_list_scripts` - List all scripts
- `asset_create_scene` - Create Unity scenes
- `asset_create_material` - Create materials
- `asset_create_shader` - Create shaders
- `asset_list_shaders` - List all shaders
- `asset_list_all` - List all assets by type

### Editor Extensions
- `editor_create_script` - Create editor scripts
- `editor_list_scripts` - List editor scripts

### ProBuilder/Modeling
- `modeling_create_script` - Create ProBuilder scripts
- `modeling_create_prefab` - Create ProBuilder prefabs
- `modeling_list_scripts` - List ProBuilder scripts

### Package Management
- `package_search` - Search for packages
- `package_install` - Install a package
- `package_install_multiple` - Install multiple packages
- `package_remove` - Remove a package
- `package_list` - List installed packages

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
│   │   ├── probuilder-service.ts # ProBuilder integration
│   │   ├── package-service.ts    # Package management
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

- **Test Cases**: See [REGRESSION_TEST_CASES.md](REGRESSION_TEST_CASES.md) for detailed test cases
- **Test Framework**: Integration tests in `tests/integration-test.js`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## Repository

Recommended repository name: `mcp-server-unity`

This follows the MCP ecosystem naming convention where MCP servers are prefixed with `mcp-server-`.

## License

MIT License - see [LICENSE](LICENSE) file for details.