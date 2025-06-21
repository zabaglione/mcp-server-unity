# Unity 6 MCP Bridge v3.0.0

**Direct Unity API integration for AI-powered game development**

[![Unity 6](https://img.shields.io/badge/Unity-6000.0+-blue.svg)](https://unity.com/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Unity 6 MCP Bridge provides seamless integration between AI assistants (like Claude) and Unity Editor through direct Unity API calls. This is a complete rewrite of the previous MCP server, designed specifically for Unity 6000+ with breaking changes from v1.x/v2.x.

## Features

### Unity 6 Integration
- **Direct Unity API calls** via Named Pipes/Domain Sockets
- **Real-time synchronization** with Unity Editor
- **Native AssetDatabase operations** (no more meta file issues!)
- **Roslyn-powered code analysis** and IntelliSense
- **Unity 6 template system** for code generation

### Script Operations
- **script_create** - Generate scripts from Unity 6 templates
- **script_read** - Read script content from Unity project
- **script_delete** - Safe deletion with reference checking
- **script_rename** - Rename with class name updates

### Folder Management
- **folder_create** - Create with automatic parent directories
- **folder_delete** - Safe deletion with asset cleanup
- **folder_rename** - Rename with reference updates
- **folder_list** - List with Unity metadata

## Installation

### Prerequisites
- **Unity 6000.0 or later** (Required)
- **Node.js 18+**
- **Claude Desktop** or compatible MCP client

### 1. Install MCP Bridge
```bash
npm install -g unity-mcp-bridge
```

### 2. Install Unity Package
1. Download `MCPBridge.cs` from this repository
2. Place it in `Assets/Editor/MCP/MCPBridge.cs` in your Unity project
3. Unity will automatically compile and start the bridge

### 3. Configure Claude Desktop
Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "unity-bridge": {
      "command": "unity-mcp-bridge",
      "args": []
    }
  }
}
```

## Quick Start

### 1. Start Unity 6
Open your Unity 6 project. The MCP Bridge will automatically start and listen for connections.

### 2. Connect with Claude
Open Claude Desktop and start using Unity commands:

```
Create a new PlayerController script using the MonoBehaviour template
```

### 3. Verify Connection
```
Check Unity project status
```

## API Reference

### Project Management
- `project_set_path` - Set Unity project path
- `project_get_info` - Get project info and connection status

### Script Operations

#### Create Script
```typescript
script_create({
  fileName: "PlayerController",
  template: "MonoBehaviour",
  folder: "Assets/Scripts/Player",
  namespace: "Game.Player"
})
```

#### Read Script
```typescript
script_read({
  path: "Assets/Scripts/PlayerController.cs"
})
```

### Folder Operations

#### Create Folder
```typescript
folder_create({
  path: "Assets/Scripts/Player/Components",
  recursive: true
})
```

#### List Folder
```typescript
folder_list({
  path: "Assets/Scripts"
})
```

## Advanced Features

### Real-time Code Analysis
The bridge provides real-time Roslyn-powered analysis:
- Syntax error detection
- Reference finding
- Usage analysis
- IntelliSense data

### Template System
Supports Unity 6's built-in templates:
- `MonoBehaviour` - Standard Unity component
- `ScriptableObject` - Data container
- `Editor` - Editor extension
- `Custom` - Basic C# class

### Template System
Supports Unity 6's built-in templates:
- `MonoBehaviour` - Standard Unity component
- `ScriptableObject` - Data container
- `Editor` - Editor extension
- `Custom` - Basic C# class

## Configuration

### Environment Variables
- `UNITY_MCP_LOG_LEVEL` - Set logging level (debug, info, warn, error)
- `UNITY_MCP_TIMEOUT` - Request timeout in milliseconds (default: 30000)

### Unity Settings
The bridge automatically detects Unity installation and project settings. No manual configuration required.

## Troubleshooting

### Common Issues

#### "Unity Bridge disconnected"
- Ensure Unity 6000+ is running
- Verify MCPBridge.cs is in `Assets/Editor/MCP/`
- Check Unity Console for errors

#### "Method not implemented"
- Verify Unity version (6000.0+ required)
- Check if Newtonsoft.Json package is installed
- Update Unity to latest 6.x version

#### Permission Errors
- On macOS/Linux, ensure socket file permissions
- Run Unity with appropriate permissions
- Check firewall settings

### Debug Mode
```bash
UNITY_MCP_LOG_LEVEL=debug unity-mcp-bridge
```

## Breaking Changes from v2.x

### API Changes
- `asset_create_script` → `script_create`
- `asset_update_script` → Removed (update functionality removed)
- `script_patch` → Removed (patch functionality removed)
- `script_move` → Removed (move functionality removed)
- `folder_move` → Removed (move functionality removed)
- `script_analyze` → Removed (analysis functionality removed)
- `folder_info` → Removed (detailed info functionality removed)
- All APIs now use Unity's AssetDatabase directly

### Requirements
- Unity 6000+ required (was 2019+)
- Node.js 18+ required (was 16+)
- MCP Bridge package required

### Removed Features
- File system-based operations
- Manual meta file handling
- Legacy Unity version support
- Script update/patch functionality
- File/folder move functionality
- Script analysis functionality
- Detailed folder information

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
```bash
git clone https://github.com/yourusername/unity-mcp-bridge.git
cd unity-mcp-bridge
npm install
npm run dev
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Unity Technologies for Unity 6 API improvements
- Anthropic for the Model Context Protocol
- The Unity developer community

---

**Unity 6 MCP Bridge v3.0.0** - Bringing AI and Unity closer together