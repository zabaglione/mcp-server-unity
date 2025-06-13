# Unity MCP Server - Project Knowledge Base

## Project Overview
Unity MCP Server is a Model Context Protocol (MCP) server that bridges AI assistants (like Claude) with Unity game development. It enables programmatic interaction with Unity projects through both Claude Desktop integration and HTTP API.

## Architecture

### Core Services Structure
All services extend from `BaseService` and follow a consistent pattern:
- **ProjectService**: Unity project validation and setup
- **ScriptService**: C# script creation and management  
- **AssetService**: Unity asset reading and listing
- **BuildService**: Multi-platform build automation
- **ShaderService**: Shader creation for Built-in/URP/HDRP
- **MaterialService**: Material creation and property management
- **EditorScriptService**: Editor extensions (windows, inspectors)
- **CodeAnalysisService**: Code diff, namespace management, duplicate detection
- **CompilationService**: Real-time compilation error monitoring
- **UnityRefreshService**: Asset database refresh with batch operations
- **UnityDiagnosticsService**: Editor log analysis and error tracking

### Key Design Patterns

1. **Service Container Pattern**
   - All services registered in `ServicesContainer`
   - Dependency injection for service dependencies
   - Factory pattern for service instantiation

2. **Template-based Code Generation**
   - Templates in `src/templates/` for all generated code
   - Supports shader variants (Built-in, URP, HDRP)
   - Namespace auto-detection based on file location

3. **Meta File Management**
   - Automatic .meta file generation with consistent GUIDs
   - GUID preservation for shader/material updates
   - Prevents Unity reference breakage

4. **Render Pipeline Detection**
   - Auto-detects Built-in, URP, or HDRP from project packages
   - Adjusts shader/material creation accordingly

## Development Guidelines

### Error Handling
- All services use custom error types from `src/errors/`
- Detailed error messages with actionable suggestions
- Validation before operations (project path, Unity version)

### File Operations
- Always use absolute paths
- Create parent directories automatically
- Generate .meta files for all Unity assets
- Respect Unity's folder structure conventions

### Code Style
- TypeScript with strict type checking
- ES modules with .js extensions in imports
- Async/await for all I/O operations
- Comprehensive logging with context

### Testing
- Manual tests in `tests/manual/` for each feature
- Integration tests for service interactions
- Performance benchmarks for batch operations
- Snapshot testing for generated content

## Unity Integration Points

### Project Structure Expected
```
UnityProject/
├── Assets/
│   ├── Scripts/
│   ├── Materials/
│   ├── Shaders/
│   └── Editor/
├── Packages/
│   └── manifest.json (render pipeline detection)
└── ProjectSettings/
```

### Compilation Monitoring
- Watches `Library/Bee/fullprofile.json` for errors
- Parses Unity console logs from `Library/Logs/`
- Real-time feedback on script compilation

### Asset Database Refresh
- Triggers Unity refresh via EditorApplication
- Supports batch operations to minimize refreshes
- Handles both immediate and deferred refresh modes

## Common Workflows

### Material Shader Updates
1. Read current material properties
2. Find target shader GUID
3. Update material preserving properties
4. Maintain material GUID for references

### Script Creation
1. Detect namespace from file path
2. Apply project conventions
3. Generate with proper using statements
4. Create accompanying .meta file

### Build Automation
1. Validate project and target platform
2. Configure build settings
3. Execute build with error handling
4. Report build results and logs

## Performance Considerations
- Batch operations for multiple files
- Minimize Unity refreshes
- Cache render pipeline detection
- Efficient file system operations

## Security Notes
- Path validation to prevent directory traversal
- No execution of arbitrary Unity code
- Safe template rendering
- Input sanitization for all operations