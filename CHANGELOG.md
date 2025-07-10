# Changelog

All notable changes to Unity MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2025-07-10

### Added
- Folder operations support:
  - `folder_create` - Create new folders in Unity project
  - `folder_rename` - Rename existing folders
  - `folder_move` - Move folders to new locations
  - `folder_delete` - Delete folders recursively
  - `folder_list` - List folder contents with optional recursion
- Automatic Unity MCP bridge script deployment:
  - `setup_unity_bridge` - Install/update Unity scripts automatically
  - Auto-deployment on first project info request
  - Version checking and auto-update support
- Unity control window (Window > Unity MCP Server) for server management
- Shader operations (simplified):
  - `shader_create` - Create new shaders with default template
  - `shader_read` - Read shader contents
  - `shader_delete` - Delete shaders
- **DXT Package Build System**:
  - `npm run build:dxt` - One-command DXT package creation
  - Embedded Unity C# scripts for elimination of file dependencies
  - Unified build system with TypeScript compilation and bundling

### Changed
- **DXT Package Optimization**: Reduced package size from 24MB to 41KB through embedded scripts
- **Package Name**: Changed final DXT filename from `unity-mcp-server-bundled.dxt` to `unity-mcp-server.dxt`
- **Build System**: Complete overhaul with automated bundling and packaging scripts
- **Script Deployment**: Unity C# scripts now embedded directly in TypeScript bundle
- Updated port from 3001 to 23457 for better conflict avoidance
- Improved UTF-8 BOM handling for Unity compatibility
- Simplified HTTP-based architecture for better reliability
- Enhanced error messages and logging with [UnityMCP] prefix
- Scripts now install to `Assets/Editor/MCP/` folder structure

### Fixed
- **UTF-8 BOM Encoding**: Fixed BOM generation using proper byte array `[0xEF, 0xBB, 0xBF]`
- **Module Resolution**: Eliminated all external file dependencies in DXT package
- **Process Lifecycle**: Added `process.stdin.resume()` to prevent early server shutdown
- Character encoding issues with UTF-8 BOM for Unity files
- Script deployment path handling for various Unity project structures
- Connection stability with retry logic

### Removed
- Obsolete shader template files (builtin-shader.ts, hdrp-shader.ts, urp-shader.ts, index.ts)
- External file dependencies in DXT package

### Documentation
- Updated README files with correct repository name (mcp-server-unity)
- Added comprehensive usage examples for all operations
- Improved setup instructions with automatic and manual options
- Added BUILD.md with complete build system documentation

## [3.0.0] - 2025-06-08

### Changed
- Complete rewrite with simplified HTTP-based architecture
- Removed complex service layer in favor of direct API implementation
- Industry-standard diff processing for script updates
- Streamlined to essential features only

### Added
- Desktop Extension support with bundled configuration
- Large file support (up to 1GB) with streaming
- Diff-based script update system (`script_apply_diff`)
- Comprehensive test coverage (100%)

### Removed
- Legacy service-based architecture
- Complex material and shader management
- Compilation monitoring features
- ProBuilder and package management

## [2.2.0] - 2025-06-06

### Added
- Shader and material update features:
  - `asset_update_shader` - Update existing shader content with automatic temporary backup
  - `asset_read_shader` - Read shader file content (supports both code and ShaderGraph)
  - `asset_update_material` - Update entire material content with YAML validation
  - `asset_clone_material` - Clone material with a new name
  - `asset_list_materials` - List all materials in the project
- Enhanced shader service:
  - Shader GUID caching for faster lookups
  - Shader name detection from file content
  - Support for finding shaders by file name or internal shader name
- Temporary backup system:
  - Creates backup files only during update operations
  - Automatically cleans up backup files after success or failure
  - Restores original content on update failure

### Changed
- Backup system now uses temporary files with automatic cleanup
- Improved shader lookup to check both file names and shader declarations
- Enhanced error handling with try-finally blocks for resource cleanup

### Fixed
- Fixed shader-material GUID reference issues for custom shaders
- Added UnityMetaGenerator for proper meta file creation
- Improved material service to work with custom shader GUIDs

## [2.1.0] - 2025-06-06

### Added
- Material management features:
  - `asset_update_material_shader` - Change material shaders dynamically
  - `asset_update_material_properties` - Update material colors, floats, textures, vectors
  - `asset_read_material` - Read and inspect material properties
  - `asset_batch_convert_materials` - Batch convert materials to different shaders
- Script update functionality:
  - `asset_update_script` - Update existing script content
- Code analysis tools:
  - `code_analyze_diff` - Get detailed diff between current and new content
  - `code_detect_duplicates` - Detect duplicate class names across project
  - `code_suggest_namespace` - Auto-suggest namespace based on file location
  - `code_apply_namespace` - Apply namespace to scripts automatically
- Compilation monitoring:
  - `compile_get_errors` - Get detailed compilation errors with file context
  - `compile_get_status` - Check current compilation status
  - `compile_install_helper` - Install real-time compilation monitoring
- Render pipeline detection:
  - Automatic detection of Built-in, URP, or HDRP
  - Material creation uses correct default shader for detected pipeline

### Changed
- Material creation now detects render pipeline and uses appropriate shader
- Improved YAML parsing to handle Unity's custom tags (!u!21 &2100000)
- Enhanced project info to include render pipeline information

### Fixed
- Fixed URP detection incorrectly showing as Built-in
- Fixed YAML parsing errors for Unity material files
- Fixed material shader GUID handling

### Removed
- Removed ProBuilder service (non-functional)
- Removed package management service (non-functional)
- Removed backup functionality from all services

## [1.0.0] - 2025-06-02

### Added
- Initial release of Unity MCP Server
- Core MCP server implementation with stdio transport
- Unity project management tools:
  - `set_unity_project` - Set and validate Unity project path
  - `create_script` - Create C# scripts with folder support
  - `read_script` - Read C# scripts with recursive search
  - `list_scripts` - List all scripts in the project
  - `create_scene` - Create Unity scene files with YAML template
  - `create_material` - Create Unity material files
  - `list_assets` - List and filter project assets
  - `project_info` - Get Unity version and project statistics
  - `build_project` - Build Unity projects via command line
- Cross-platform support (Windows, macOS, Linux)
- TypeScript implementation with strict typing
- Comprehensive error handling and validation
- Setup scripts for easy installation
- GitHub Actions CI/CD pipeline
- Full documentation and contribution guidelines

### Security
- Path traversal protection
- Input validation for all tools
- Safe error messages without sensitive information

[1.0.0]: https://github.com/zabaglione/mcp-server-unity/releases/tag/v1.0.0