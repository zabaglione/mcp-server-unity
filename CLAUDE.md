# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Unity MCP Server - Project Knowledge Base

## Project Overview
Unity MCP Server is a Model Context Protocol (MCP) server that bridges AI assistants (like Claude) with Unity game development. It enables programmatic interaction with Unity projects through both Claude Desktop integration and HTTP API.

## Commands

### Build and Development
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Watch mode for development
- `npm start` - Start MCP server (stdio mode for Claude Desktop)
- `npm run start:http` - Start HTTP API server (default port 3000)
- `npm run clean` - Clean build artifacts

### Testing
- `npm test` - Run all tests
- `npm run test:unit` - Unit tests only
- `npm run test:integration` - Integration tests only  
- `npm run test:e2e` - End-to-end tests
- `npm run test:coverage` - Generate coverage report
- `npm run test:manual` - Interactive manual test runner
- `npm run test:performance` - Run performance benchmarks
- `npm run test:watch` - Watch mode for tests

### No Linting/Formatting
- No ESLint or Prettier configured - maintain existing code style

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
- **UIToolkitService**: UXML/USS file creation and management

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
- Jest framework with TypeScript support
- Virtual Unity project utility for test environments (`tests/utils/virtualUnityProject.ts`)
- Snapshot testing for generated content validation
- Performance benchmarks exported to JSON
- Coverage thresholds: 80% lines, 70% branches/functions
- Test structure mirrors source structure (e.g., `src/services/foo.ts` → `tests/unit/services/foo.test.ts`)

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

## Critical Implementation Details

### Unity Asset Refresh
- **CRITICAL**: Always trigger Unity refresh after file operations using `UnityRefreshService`
- Unity won't recognize new/modified assets without refresh
- Batch operations supported to minimize refresh calls
- Both immediate and deferred refresh modes available

### Meta File Generation
- Every Unity asset MUST have a corresponding .meta file
- GUIDs must be consistent to prevent reference breakage
- When updating shaders/materials, preserve existing GUIDs
- Meta files generated automatically by all asset creation services

### Service Dependencies
- Services can depend on each other (inject via constructor)
- Example: `MaterialService` depends on `ShaderService`
- All services registered in `ServicesContainer`
- Use `ServiceFactory` to create properly wired instances

### Template System
- All code generation uses templates from `src/templates/`
- Templates support placeholders: `{{NAMESPACE}}`, `{{CLASS_NAME}}`, etc.
- Shader templates vary by render pipeline (builtin/urp/hdrp)
- UI Toolkit templates for windows, documents, and components

### Large File Support
- Automatic streaming for files larger than 10MB
- Maximum file size limit: 1GB
- Services automatically use streaming for read/write operations
- HTTP API supports up to 1GB request bodies
- Implemented in: ScriptService, ShaderService, MaterialService, UIToolkitService