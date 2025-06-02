# Changelog

All notable changes to Unity MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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