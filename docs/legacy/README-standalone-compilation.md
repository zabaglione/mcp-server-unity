# Standalone C# Compilation Service

The Unity MCP Server now includes a standalone compilation service that can compile Unity scripts directly using system C# compilers, independent of Unity Editor. This provides reliable compilation error detection even when Unity is not running.

## Features

### Multiple Compiler Support
The service automatically detects and uses the best available C# compiler:

1. **Roslyn (csc)** - Microsoft's C# compiler (preferred)
2. **.NET CLI** - .NET Core/5+ compiler via `dotnet` command
3. **Mono (mcs)** - Mono C# compiler
4. **Unity Bundled** - Unity's included C# compiler

### Assembly Discovery
Automatically discovers and includes:
- Unity engine assemblies (UnityEngine.dll, etc.)
- Unity package assemblies from Library/PackageCache
- System assemblies (mscorlib.dll, System.dll, etc.)
- Custom project assemblies

### Smart Script Filtering
- Includes all runtime scripts from Assets folder
- Optionally includes Editor scripts and test assemblies
- Excludes inappropriate files automatically

## Usage

### Check Compilation Capabilities

First, check what compilers and assemblies are available:

```
unity-mcp-server:standalone_compilation_capabilities
```

This will show:
- Available C# compilers and their versions
- Number of Unity assemblies found
- Number of package assemblies found
- Unity installation path

### Compile Unity Scripts

Compile all Unity scripts independently:

```
unity-mcp-server:standalone_compile_scripts
```

With options:
```
unity-mcp-server:standalone_compile_scripts (
  outputPath: "MyProject.dll",
  includeTestAssemblies: true,
  defines: ["DEBUG", "UNITY_EDITOR"]
)
```

## Parameters

### standalone_compile_scripts

- **outputPath** (optional): Custom output path for compiled assembly
- **targetFramework** (optional): Target .NET framework version
- **additionalReferences** (optional): Additional assembly references
- **defines** (optional): Preprocessor defines (e.g., ["DEBUG", "CUSTOM_FLAG"])
- **includeTestAssemblies** (optional): Include test and editor scripts (default: false)

### standalone_compilation_capabilities

No parameters required.

## Output Format

### Compilation Results

```
Standalone C# Compilation Results
================================

Compiler: Roslyn (csc) (roslyn)
Success: No
Compilation Time: 1250ms
Errors: 2
Warnings: 1

COMPILATION ERRORS:
──────────────────

❌ ERROR CS0246
   File: Scripts/Player/PlayerController.cs:15:13
   The type or namespace name 'NonExistentType' could not be found

❌ ERROR CS0103
   File: Scripts/Game/GameManager.cs:25:9
   The name 'undefined' does not exist in the current context

COMPILATION WARNINGS:
───────────────────

⚠️ WARNING CS0108
   File: Scripts/UI/UIManager.cs:42:17
   'UIManager.Update()' hides inherited member 'MonoBehaviour.Update()'
```

### Capabilities Output

```
Standalone C# Compilation Capabilities
=====================================

Available Compilers:
1. Roslyn (csc) (roslyn) - /usr/bin/csc
   Version: Microsoft (R) Visual C# Compiler version 4.5.0-6.22580.4
2. .NET CLI (dotnet) - dotnet
   Version: 7.0.203

Unity Assemblies: 156
Package Assemblies: 43

Primary Compiler: Roslyn (csc)
Unity Installation: /Applications/Unity/Hub/Editor/2022.3.21f1
```

## Benefits

### Independent of Unity Editor
- Works even when Unity is closed
- Useful for CI/CD pipelines
- Great for automated testing

### Fast and Reliable
- Direct compilation without Unity overhead
- Consistent error reporting
- Cross-platform support (Windows, macOS, Linux)

### Comprehensive Error Detection
- Standard C# compiler error messages
- Exact file, line, and column information
- Proper error codes (CS0xxx)

## Technical Details

### Compiler Priority
1. Roslyn (most accurate, Microsoft's official compiler)
2. .NET CLI (modern, cross-platform)
3. Mono (legacy, but widely available)
4. Unity Bundled (fallback, may be outdated)

### Assembly Resolution
The service searches for assemblies in:
- Unity installation managed folders
- Project's Library/PackageCache
- System framework directories
- Unity extensions directories

### Preprocessor Defines
Default defines include:
- `UNITY_EDITOR`
- `UNITY_STANDALONE`
- `UNITY_2021_1_OR_NEWER`

Additional defines can be specified via the `defines` parameter.

### Platform Support
- **Windows**: Searches Program Files for Unity/compilers
- **macOS**: Searches Applications for Unity, uses Mono if available
- **Linux**: Searches opt/usr directories, prioritizes system compilers

## Troubleshooting

### No Compiler Found
```bash
# Install .NET SDK (recommended)
wget https://dotnet.microsoft.com/download
# Or install Mono
sudo apt-get install mono-complete
```

### Unity Assemblies Not Found
- Ensure Unity is installed in standard location
- Check Unity version compatibility
- Verify project has valid Unity project structure

### Compilation Errors
- Errors indicate actual code issues
- Use the error messages to fix C# syntax/logic problems
- Check that all required packages are installed in Unity

### Performance
- Initial discovery takes a few seconds
- Subsequent compilations are faster
- Large projects may take longer to compile

## Integration with Enhanced Compilation

The standalone compilation service complements the enhanced compilation service:

- **Enhanced Compilation**: Multiple Unity-based error detection methods
- **Standalone Compilation**: Direct C# compiler for reliable, independent compilation

Use both for comprehensive error detection:
1. `compile_get_errors` (enhanced) - For Unity-integrated error detection
2. `standalone_compile_scripts` - For independent verification and CI/CD

## Example Workflow

```bash
# 1. Check capabilities
unity-mcp-server:standalone_compilation_capabilities

# 2. Compile with basic options
unity-mcp-server:standalone_compile_scripts

# 3. Compile including tests with custom defines
unity-mcp-server:standalone_compile_scripts (
  includeTestAssemblies: true,
  defines: ["DEBUG", "TESTING", "CUSTOM_FEATURE"]
)

# 4. Compare with Unity-based compilation
unity-mcp-server:compile_get_errors (forceCompile: true)
```

This provides both Unity-integrated and independent compilation verification for maximum reliability.