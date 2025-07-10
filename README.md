# Unity MCP Server

Unity MCP Server enables AI assistants (like Claude) to interact with Unity projects through the Model Context Protocol (MCP). This simplified implementation provides essential tools for managing Unity scripts and shaders via a lightweight HTTP-based architecture.

[日本語版 README はこちら](README-ja.md) | [English](README.md)

## 🚀 Quick Start

1. **Install the MCP Server**
   ```bash
   npm install
   npm run build
   ```

2. **Add Unity HTTP Server to your Unity project**
   - Copy `src/unity-scripts/UnityHttpServer.cs` to `Assets/Editor/UnityHttpServer.cs`
   - The server will automatically start when Unity Editor opens

3. **Configure Claude Desktop**
   ```json
   {
     "mcpServers": {
       "unity": {
         "command": "node",
         "args": ["path/to/unity-mcp/build/simple-index.js"]
       }
     }
   }
   ```

## ✨ Features

- 📝 **Script Management**: Create, read, and delete C# scripts
- 🎨 **Shader Operations**: Create and manage Unity shaders
- 📊 **Project Info**: Get Unity project information
- 🔌 **Simple HTTP API**: Reliable communication between MCP and Unity
- 🧪 **Fully Tested**: Comprehensive unit and integration tests

## 🏗️ Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │  MCP    │                 │  HTTP   │                 │
│  AI Assistant   │────────▶│   MCP Server    │────────▶│  Unity Editor   │
│   (Claude)      │  stdio  │   (Node.js)     │  :3001  │  (HTTP Server)  │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `script_create` | Create a new C# script |
| `script_read` | Read script contents |
| `script_delete` | Delete a script |
| `shader_create` | Create a new shader |
| `shader_read` | Read shader contents |
| `shader_delete` | Delete a shader |
| `project_info` | Get Unity project information |
| `project_status` | Check connection status |

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
│   ├── tools/             # MCP tool definitions
│   ├── unity-scripts/     # Unity C# scripts
│   └── simple-index.ts    # Main entry point
├── tests/
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
└── docs/
    └── ARCHITECTURE.md   # Detailed architecture documentation
```

## 🚦 Unity Setup

1. Copy `src/unity-scripts/UnityHttpServer.cs` to your Unity project's `Assets/Editor/` folder
2. The HTTP server will start automatically on port 3001
3. Check Unity Console for "Unity HTTP Server started" message

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
// Get project info
await tools.executeTool('project_info', {});

// Check connection status
await tools.executeTool('project_status', {});
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
- Ensure UnityHttpServer.cs is in the Editor folder
- Verify port 3001 is not in use

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

## 🔮 Future Enhancements

- WebSocket support for real-time communication
- Additional Unity operations (materials, prefabs, etc.)
- Batch operations for improved performance
- Unity project templates

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- Unity Technologies