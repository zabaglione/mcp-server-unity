# Standalone C# Compilation Service

The Standalone Compilation Service provides the ability to compile Unity scripts directly using system C# compilers (Roslyn, .NET Core, or Mono) without requiring Unity Editor to be running. This is useful for:

- CI/CD pipelines
- Code validation without Unity
- Performance testing of compilation
- Development workflows where Unity isn't available

## Features

### Compiler Detection
- **Roslyn Compiler**: Microsoft's modern C# compiler (preferred)
- **.NET Core/5+ Compiler**: Cross-platform .NET compiler via `dotnet` CLI
- **Mono Compiler**: Open-source C# compiler (`mcs`)
- **Unity Bundled Compilers**: Compilers bundled with Unity installations

### Reference Assembly Discovery
- **Unity Engine Assemblies**: Automatically locates Unity DLLs
- **Unity Package Assemblies**: Discovers assemblies from Unity packages
- **System Assemblies**: Standard .NET framework assemblies
- **Project Assemblies**: Custom project assemblies

### Advanced Features
- **Smart Assembly Resolution**: Automatically resolves dependencies
- **Unity Preprocessor Defines**: Includes Unity-specific defines
- **Multiple Target Frameworks**: Supports different .NET targets
- **Error Parsing**: Comprehensive error and warning reporting
- **Performance Monitoring**: Compilation timing and statistics

## API Usage

### Check Compilation Capabilities

```typescript
// Via MCP tool
{
  "name": "standalone_compilation_capabilities"
}
```

This will return information about:
- Available compilers and their versions
- Unity installation detection
- Reference assembly counts
- Script discovery results
- Configuration details

### Compile Scripts

```typescript
// Via MCP tool
{
  "name": "standalone_compile_scripts",
  "arguments": {
    "scriptPaths": ["Assets/Scripts/PlayerController.cs"], // Optional: specific scripts
    "outputPath": "Library/StandaloneCompilation/MyAssembly.dll", // Optional: custom output
    "target": "library", // or "executable"
    "includeUnityReferences": true, // Include Unity assemblies
    "additionalReferences": ["/path/to/custom.dll"], // Extra references
    "defines": ["CUSTOM_DEFINE"], // Additional preprocessor defines
    "framework": "netstandard2.1" // Target framework
  }
}
```

## Compiler Detection Logic

The service uses the following priority order for compiler selection:

1. **Roslyn via dotnet CLI** - `dotnet build` or `csc` command
2. **.NET Core Compiler** - `dotnet` command with C# compilation
3. **Unity Bundled Roslyn** - From Unity installation directory
4. **Unity Bundled Mono** - Mono compiler from Unity
5. **System Mono** - System-installed Mono compiler

### Platform-Specific Paths

#### Windows
- Unity: `C:/Program Files/Unity/Hub/Editor/*/Editor/Data/Tools/Roslyn/csc.exe`
- .NET: `dotnet` command or `csc.exe` in PATH
- Mono: `mcs.exe` in PATH

#### macOS
- Unity: `/Applications/Unity/Hub/Editor/*/Unity.app/Contents/Data/Tools/Roslyn/csc`
- .NET: `dotnet` command
- Mono: `/usr/local/bin/mcs` or `mcs` in PATH

#### Linux
- Unity: `/opt/Unity/Editor/Data/Tools/Roslyn/csc`
- .NET: `dotnet` command
- Mono: `/usr/bin/mcs` or `mcs` in PATH

## Assembly Reference Discovery

### Unity Assemblies

The service automatically discovers Unity assemblies from:

1. **Unity Installation Managed Folder**:
   - `UnityEngine.dll` - Core Unity functionality
   - `UnityEngine.CoreModule.dll` - Core systems
   - `UnityEditor.dll` - Editor-specific APIs
   - `netstandard.dll` - .NET Standard compatibility

2. **Package Cache**: `Library/PackageCache/*/Runtime/*.dll`

3. **Precompiled Assemblies**: `Library/ScriptAssemblies/*.dll`

### System Assemblies

Standard .NET assemblies are discovered from:
- Framework installation directories
- .NET Core shared frameworks
- Mono framework directories

## Compilation Process

1. **Compiler Detection**: Find best available C# compiler
2. **Reference Assembly Discovery**: Gather all required assemblies
3. **Script Discovery**: Find all .cs files (or use provided list)
4. **Argument Building**: Construct compiler command line
5. **Compilation Execution**: Run compiler with proper arguments
6. **Output Parsing**: Parse compiler output for errors/warnings
7. **Result Formatting**: Present comprehensive results

## Error Handling

The service provides detailed error information including:

- **File Location**: Exact file path where error occurred
- **Line/Column**: Precise location in source code
- **Error Code**: C# compiler error code (e.g., CS0103)
- **Message**: Descriptive error message
- **Severity**: Error vs Warning classification

Example error output:
```
📍 ERRORS:
   CS0103 - Assets/Scripts/Player.cs:15:8
   The name 'UnknownVariable' does not exist in the current context

⚠️  WARNINGS:
   CS0168 - Assets/Scripts/Enemy.cs:23:12
   The variable 'unused' is declared but never used
```

## Performance Considerations

- **Compiler Caching**: Detected compilers are cached per session
- **Reference Caching**: Assembly references are cached per project
- **Incremental Compilation**: Only compile changed files when possible
- **Parallel Processing**: Multiple compilation tasks can run simultaneously

## Limitations

1. **Unity-Specific Features**: Some Unity-specific attributes may not compile
2. **Runtime Dependencies**: Compiled assemblies may not run without Unity runtime
3. **Platform Targeting**: May require specific .NET framework versions
4. **Package Dependencies**: Complex package dependencies might not resolve automatically

## Troubleshooting

### No Compiler Found
- Install .NET SDK or Mono
- Ensure Unity is installed and detected
- Check PATH environment variable

### Missing References
- Verify Unity installation path
- Check package dependencies in manifest.json
- Ensure all required assemblies are present

### Compilation Errors
- Review Unity version compatibility
- Check for platform-specific code
- Verify all dependencies are included

## Integration Examples

### CI/CD Pipeline
```bash
# Check compilation capabilities
node dist/index.js --tool standalone_compilation_capabilities

# Compile all scripts
node dist/index.js --tool standalone_compile_scripts --args '{"target":"library"}'
```

### Custom Build Scripts
```typescript
import { StandaloneCompilationService } from './services/standalone-compilation-service';

const service = new StandaloneCompilationService(logger);
const result = await service.compileScripts({
  scriptPaths: await findModifiedScripts(),
  includeUnityReferences: true,
  target: 'library'
});

if (!result.success) {
  throw new Error('Compilation failed');
}
```

## Future Enhancements

- **Incremental Compilation**: Track file changes for faster rebuilds
- **Dependency Analysis**: Automatic dependency resolution
- **Cross-Platform Targets**: Support for multiple target platforms
- **Performance Profiling**: Detailed compilation performance metrics
- **Custom Analyzers**: Support for code analysis tools