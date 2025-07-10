# Unity MCP Server

Unity MCP Server enables AI assistants (like Claude) to interact with Unity projects through the Model Context Protocol (MCP). This simplified implementation provides essential tools for managing Unity scripts and shaders via a lightweight HTTP-based architecture.

[日本語版 README はこちら](README-ja.md) | [English](README.md)

## 🚀 Quick Start

1. **Install the MCP Server**
   ```bash
   npm install
   npm run build
   ```

2. **Setup Unity MCP Bridge**
   ```bash
   # Use the setup tool after starting MCP server
   setup_unity_bridge projectPath="/path/to/your/unity/project"
   ```
   - Or manually copy scripts to `Assets/Editor/MCP/`
   - The server will automatically start when Unity Editor opens

3. **Configure Claude Desktop**
   ```json
   {
     "mcpServers": {
       "unity": {
         "command": "node",
         "args": ["/path/to/mcp-server-unity/build/simple-index.js"]
       }
     }
   }
   ```

## ✨ Features

- 📝 **Script Management**: Create, read, update (diff-based), and delete C# scripts
- 🎨 **Shader Operations**: Create, read, and delete Unity shaders
- 📁 **Folder Operations**: Create, rename, move, delete, and list folders
- 📊 **Project Info**: Get Unity project information with auto-setup
- 🔌 **Simple HTTP API**: Reliable communication between MCP and Unity
- 🔄 **Auto Update**: Scripts automatically update when newer versions are available
- 🧪 **Fully Tested**: Comprehensive unit and integration tests

## 🏗️ Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │  MCP    │                 │  HTTP   │                 │
│  AI Assistant   │────────▶│   MCP Server    │────────▶│  Unity Editor   │
│   (Claude)      │  stdio  │   (Node.js)     │  :23457 │  (HTTP Server)  │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `script_create` | Create a new C# script |
| `script_read` | Read script contents |
| `script_apply_diff` | Apply unified diff to update scripts |
| `script_delete` | Delete a script |
| `shader_create` | Create a new shader |
| `shader_read` | Read shader contents |
| `shader_delete` | Delete a shader |
| `folder_create` | Create a new folder |
| `folder_rename` | Rename a folder |
| `folder_move` | Move a folder to new location |
| `folder_delete` | Delete a folder recursively |
| `folder_list` | List folder contents |
| `project_info` | Get Unity project information |
| `project_status` | Check connection status |
| `setup_unity_bridge` | Install/update Unity MCP scripts |

## 📋 Requirements

- Unity 2019.4 or later
- Node.js 16 or later
- npm

## 🔧 Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run specific test suites
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only

# Development mode
npm run dev
```

## 📁 Project Structure

```
unity-mcp/
├── src/
│   ├── adapters/          # HTTP adapter for Unity communication
│   ├── api/               # API implementations (shader, script)
│   ├── services/          # Service layer (deployment, etc.)
│   ├── tools/             # MCP tool definitions
│   ├── unity-scripts/     # Unity C# scripts
│   │   ├── UnityHttpServer.cs    # Main HTTP server
│   │   └── UnityMCPServerWindow.cs # Control window
│   └── index.ts           # Main entry point
├── tests/
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
└── docs/
    └── ARCHITECTURE.md   # Detailed architecture documentation
```

## 🚦 Unity Setup

### Automatic Setup (Recommended)
1. Install and start the MCP server
2. Use the `setup_unity_bridge` tool to install scripts:
   ```bash
   setup_unity_bridge projectPath="/path/to/your/unity/project"
   ```

### Manual Setup
1. Copy scripts to your Unity project:
   - `src/unity-scripts/UnityHttpServer.cs` → `Assets/Editor/MCP/UnityHttpServer.cs`
   - `src/unity-scripts/UnityMCPServerWindow.cs` → `Assets/Editor/MCP/UnityMCPServerWindow.cs`
2. The HTTP server will start automatically on port 23457
3. Check Unity Console for "[UnityMCP] HTTP Server started" message
4. Use Window > Unity MCP Server to control the server

## 📖 Usage Examples

### Script Operations
```javascript
// Create a new script
await tools.executeTool('script_create', {
  fileName: 'PlayerController',
  content: 'public class PlayerController : MonoBehaviour { }',
  folder: 'Assets/Scripts'
});

// Read a script
await tools.executeTool('script_read', {
  path: 'Assets/Scripts/PlayerController.cs'
});

// Update a script with diff
await tools.executeTool('script_apply_diff', {
  path: 'Assets/Scripts/PlayerController.cs',
  diff: `@@ -1,3 +1,4 @@
 using UnityEngine;
+using System.Collections;
 
 public class PlayerController : MonoBehaviour { }`
});

// Delete a script
await tools.executeTool('script_delete', {
  path: 'Assets/Scripts/PlayerController.cs'
});
```

### Shader Operations
```javascript
// Create a new shader
await tools.executeTool('shader_create', {
  name: 'MyShader',
  content: 'Shader "Custom/MyShader" { }',
  folder: 'Assets/Shaders'
});

// Read a shader
await tools.executeTool('shader_read', {
  path: 'Assets/Shaders/MyShader.shader'
});

// Delete a shader
await tools.executeTool('shader_delete', {
  path: 'Assets/Shaders/MyShader.shader'
});
```

### Project Operations
```javascript
// Get project info (auto-deploys scripts if needed)
await tools.executeTool('project_info', {});

// Check connection status
await tools.executeTool('project_status', {});

// Install/update Unity MCP scripts
await tools.executeTool('setup_unity_bridge', {
  projectPath: '/path/to/unity/project',
  forceUpdate: false
});
```

### Folder Operations
```javascript
// Create a folder
await tools.executeTool('folder_create', {
  path: 'Assets/MyNewFolder'
});

// Rename a folder
await tools.executeTool('folder_rename', {
  oldPath: 'Assets/MyNewFolder',
  newName: 'RenamedFolder'
});

// Move a folder
await tools.executeTool('folder_move', {
  sourcePath: 'Assets/RenamedFolder',
  targetPath: 'Assets/Scripts/RenamedFolder'
});

// List folder contents
await tools.executeTool('folder_list', {
  path: 'Assets/Scripts',
  recursive: false
});

// Delete a folder
await tools.executeTool('folder_delete', {
  path: 'Assets/Scripts/RenamedFolder',
  recursive: true
});
```

## 🧪 Testing

The project uses Vitest for testing:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test the complete flow with mock Unity server
- **Coverage**: Comprehensive test coverage for reliability

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## 🐛 Troubleshooting

### Unity server not responding
- Check Unity Console for errors
- Ensure scripts are in `Assets/Editor/MCP/` folder
- Verify port 23457 is not in use
- Open Window > Unity MCP Server to start the server manually
- Try using `setup_unity_bridge` to reinstall scripts

### MCP connection issues
- Verify Claude Desktop configuration
- Check that the build directory exists
- Review logs for error messages

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please ensure:
- All tests pass (`npm test`)
- Code follows existing patterns
- New features include tests

## 📚 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)

## 📈 Recent Updates (v3.1.1)

### Fixed Issues
- ✅ **Render Pipeline Detection**: Fixed "Unknown" render pipeline - now correctly detects Built-in, URP, and HDRP
- ✅ **AssetDatabase Errors**: Eliminated "[Worker0] Import Error Code:(4)" synchronization issues
- ✅ **File Management**: Enhanced script deployment with proper cleanup of existing files and .meta files

### Improvements
- 🔄 **Dynamic Script Generation**: Unity C# scripts now generated from source files at build time
- 🎯 **Better Threading**: project/info requests now run on main thread for proper Unity API access
- 🛠️ **Enhanced Debugging**: Improved logging for render pipeline detection troubleshooting

## 🔮 Future Enhancements

- WebSocket support for real-time communication
- Additional Unity operations (materials, prefabs, etc.)
- Batch operations for improved performance
- Unity project templates
- Advanced diff merging with conflict resolution

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- Unity Technologies