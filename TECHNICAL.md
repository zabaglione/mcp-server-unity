# Unity MCP Server - Technical Documentation

This document provides technical details for developers working with or contributing to Unity MCP Server.

## 🏗️ Architecture Overview

Unity MCP Server follows a three-tier architecture:

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │  MCP    │                 │  HTTP   │                 │
│  AI Assistant   │────────▶│   MCP Server    │────────▶│  Unity Editor   │
│   (Claude)      │  stdio  │   (Node.js)     │  :23457 │  (HTTP Server)  │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

### Components

1. **MCP Server** (Node.js/TypeScript)
   - Implements Model Context Protocol
   - Provides tool definitions for Unity operations
   - Manages HTTP communication with Unity

2. **Unity HTTP Server** (C#)
   - Runs inside Unity Editor
   - Processes requests on main thread for Unity API access
   - Handles file operations with proper AssetDatabase integration

3. **Unity Control Window** (C#)
   - Editor window for server management
   - Shows connection status and logs
   - Provides manual start/stop controls

## 📁 Project Structure

```
unity-mcp/
├── src/
│   ├── adapters/          # HTTP adapter for Unity communication
│   │   └── unity-http-adapter.ts
│   ├── api/               # API implementations
│   │   ├── shader-api.ts
│   │   └── script-api.ts
│   ├── services/          # Service layer
│   │   └── unity-bridge-deploy-service.ts
│   ├── tools/             # MCP tool definitions
│   │   └── unity-mcp-tools.ts
│   ├── unity-scripts/     # Unity C# scripts
│   │   ├── UnityHttpServer.cs
│   │   └── UnityMCPServerWindow.cs
│   ├── embedded-scripts.ts # Generated script embeddings
│   └── simple-index.ts    # Main entry point
├── tests/
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── build-final-dxt.sh    # DXT package build script
└── generate-embedded-scripts.cjs # Script embedding generator
```

## 🛠️ Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `script_create` | Create a new C# script | fileName, content?, folder? |
| `script_read` | Read script contents | path |
| `script_apply_diff` | Apply unified diff to update scripts | path, diff |
| `script_delete` | Delete a script | path |
| `shader_create` | Create a new shader | name, content?, folder? |
| `shader_read` | Read shader contents | path |
| `shader_delete` | Delete a shader | path |
| `folder_create` | Create a new folder | path |
| `folder_rename` | Rename a folder | oldPath, newName |
| `folder_move` | Move a folder to new location | sourcePath, targetPath |
| `folder_delete` | Delete a folder recursively | path, recursive |
| `folder_list` | List folder contents | path, recursive? |
| `project_info` | Get Unity project information | - |
| `project_status` | Check connection status | - |
| `setup_unity_bridge` | Install/update Unity MCP scripts | projectPath, forceUpdate? |

## 🔧 Development Setup

### Prerequisites
- Node.js 16+
- npm
- Unity 2019.4+

### Installation
```bash
# Clone repository
git clone https://github.com/zabaglione/mcp-server-unity.git
cd mcp-server-unity

# Install dependencies
npm install

# Build project
npm run build
```

### Development Commands
```bash
# Watch mode for development
npm run dev

# Run tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Generate coverage report
npm run test:coverage

# Build DXT package
npm run build:dxt
```

## 📦 DXT Package Build Process

The DXT (Desktop Extension) package is built using `build-final-dxt.sh`:

1. **Generate Embedded Scripts**: `generate-embedded-scripts.cjs` reads Unity C# scripts and embeds them into `embedded-scripts.ts`
2. **Compile TypeScript**: Build all TypeScript files to JavaScript
3. **Bundle with esbuild**: Create single bundle file with all dependencies
4. **Create DXT Package**: ZIP manifest.json and bundle into .dxt file

### Key Files
- `manifest.json`: Extension metadata and configuration
- `unity-mcp-server.bundle.js`: Complete bundled application
- `unity-mcp-server.dxt`: Final extension package (~42KB)

## 🔌 Unity Integration Details

### Script Deployment
Unity scripts are deployed via `UnityBridgeDeployService`:
1. Checks if scripts need updating (version comparison)
2. Removes existing files and .meta files if present
3. Writes new scripts with UTF-8 BOM encoding
4. Creates Unity-compatible .meta files with consistent GUIDs

### Main Thread Execution
Operations requiring Unity API access run on main thread:
- `project/info` - Render pipeline detection
- `script_create` - AssetDatabase operations
- `shader_create` - Asset creation
- All folder operations

Worker thread operations:
- `ping` - Simple connectivity check
- `script_read` - File system read
- `shader_read` - File system read

### Render Pipeline Detection
Multiple detection methods for reliability:
1. Check `GraphicsSettings.renderPipelineAsset`
2. Fallback to package detection (com.unity.render-pipelines.*)
3. Default to "Built-in" if no SRP found

## 🧪 Testing Strategy

### Unit Tests
- Test individual components in isolation
- Mock external dependencies
- Focus on business logic

### Integration Tests
- Test complete request/response flows
- Use mock Unity HTTP server
- Verify tool execution

### Test Structure
```
tests/
├── unit/
│   ├── adapters/
│   ├── api/
│   └── tools/
└── integration/
    └── simple-integration.test.ts
```

## 🔒 Security Considerations

- Path validation prevents directory traversal
- No execution of arbitrary code
- Input sanitization for all parameters
- Safe file operations with proper error handling

## 🚀 Performance Optimizations

- Streaming support for large files (up to 1GB)
- Efficient diff application
- Minimal Unity refreshes
- Cached render pipeline detection

## 📝 API Reference

### HTTP Endpoints (Unity Server)

All requests use POST method with JSON body:

```typescript
interface Request {
  method: string;
  params: any;
}

interface Response {
  result?: any;
  error?: {
    message: string;
    code: number;
  };
}
```

### Example Requests

Create Script:
```json
{
  "method": "script/create",
  "params": {
    "fileName": "PlayerController",
    "content": "public class PlayerController : MonoBehaviour { }",
    "folder": "Assets/Scripts"
  }
}
```

Get Project Info:
```json
{
  "method": "project/info",
  "params": {}
}
```

## 🐛 Debugging

### Enable Debug Logging
Set environment variable:
```bash
export UNITY_MCP_LOG_LEVEL=debug
```

### Unity Console Logs
All server operations log with `[UnityMCP]` prefix

### Common Issues

1. **Port Already in Use**
   - Check if another process is using port 23457
   - Restart Unity Editor

2. **AssetDatabase Errors**
   - Ensure operations run on main thread
   - Check file permissions
   - Verify Unity project is not corrupted

3. **Render Pipeline Detection**
   - Check Graphics Settings in Unity
   - Verify package manifest
   - Review debug logs in Unity Console

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Code Style
- TypeScript with strict typing
- ES modules with .js extensions
- Async/await for all I/O operations
- Comprehensive error handling

### Pull Request Process
1. Fork and create feature branch
2. Write tests for new functionality
3. Ensure all tests pass
4. Update documentation
5. Submit PR with clear description