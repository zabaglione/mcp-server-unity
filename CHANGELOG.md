# Changelog

All notable changes to Unity MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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