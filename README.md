# Unity 6 MCP Bridge v3.0.0

**Direct Unity API integration for AI-powered game development**

[日本語版 README はこちら](README-ja.md) | [English](README.md)

[![Unity 6](https://img.shields.io/badge/Unity-6000.0+-blue.svg)](https://unity.com/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Test Status](https://img.shields.io/badge/Tests-100%25-success.svg)](V3_TEST_REPORT.md)

Unity 6 MCP Bridge provides seamless integration between AI assistants (like Claude) and Unity Editor through direct Unity API calls. This is a complete rewrite for Unity 6000+, featuring industry-standard diff processing and robust error handling.

## 🚀 Features

### Unity 6 Integration
- **Direct Unity API calls** via Named Pipes/Domain Sockets
- **Real-time synchronization** with Unity Editor
- **Native AssetDatabase operations** (no more meta file issues!)
- **Roslyn-powered code analysis** and IntelliSense
- **Unity 6 template system** for code generation

### Script Operations
- **script_create** - Generate scripts from Unity 6 templates (MonoBehaviour, ScriptableObject, Editor, Custom)
- **script_read** - Read script content with streaming support for large files
- **script_delete** - Safe deletion with reference checking
- **script_rename** - Rename with automatic class name updates
- **script_update_diff** - Apply diffs with fuzzy matching and whitespace handling
- **script_apply_patch** - Batch apply multiple file changes with rollback support
- **script_create_diff** - Generate unified diffs between contents
- **script_validate_diff** - Pre-validate diffs before applying

### Folder Management
- **folder_create** - Create with automatic parent directories
- **folder_delete** - Safe deletion with asset cleanup
- **folder_rename** - Rename with reference updates
- **folder_list** - List contents with Unity metadata (GUIDs, types)

### Advanced Diff Processing (v3.0)
- **Industry-standard diff-match-patch** algorithm by Google
- **Fuzzy matching** for handling minor differences
- **BOM preservation** for Unity files
- **Detailed error reporting** with line-by-line analysis
- **Performance optimized** - processes 10,000 lines in <5ms

## Installation

### Prerequisites
- **Unity 6000.0 or later** (Required)
- **Node.js 18+**
- **Claude Desktop** or compatible MCP client

### Quick Install with Desktop Extension (NEW! 🎉)

The easiest way to install Unity MCP Bridge is using the Desktop Extension:

1. **Download**: Get `unity-mcp-bridge.dxt` from [Releases](https://github.com/zabaglione/mcp-server-unity/releases/latest)
2. **Install**: In Claude Desktop, go to Extensions → Install from file → Select the .dxt file
3. **Configure**: Set your Unity project path in the extension settings
4. **Done!** Unity Bridge will auto-install in your project when you first use it

**Note**: The Desktop Extension uses a bundled single-file format with all dependencies included. This ensures compatibility with Claude Desktop's extension system.

### Manual Installation

#### 1. Install MCP Bridge
```bash
npm install -g unity-mcp-bridge
```

#### 2. Install Unity Bridge in Your Project

Use the built-in installer:
```bash
# After configuring Claude Desktop, use this MCP tool:
bridge_install --projectPath /path/to/your/unity/project
```

Or manually:
1. Copy the Unity scripts from `src/unity-scripts/`
2. Place in `Assets/Editor/MCP/` in your Unity project
3. Unity will automatically compile and start the bridge

#### 3. Configure Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

## 📖 Usage Examples

### Setting Project Path
```bash
# Set the Unity project to work with
project_set_path /path/to/your/unity/project

# Check connection status
project_get_info
```

### Script Operations
```bash
# Create a new player controller
script_create Player --template MonoBehaviour --folder Assets/Scripts/Player

# Create with custom content
script_create GameManager --content "using UnityEngine;\n\npublic class GameManager : MonoBehaviour\n{\n    // Game logic here\n}"

# Read existing script
script_read Assets/Scripts/Enemy.cs

# Rename with class update
script_rename Assets/Scripts/Enemy.cs EnemyAI
```

### Advanced Diff Operations
```bash
# Apply a diff to update code
script_update_diff Assets/Scripts/Player.cs "--- a/Player.cs\n+++ b/Player.cs\n@@ -10,7 +10,7 @@\n-    private float speed = 5.0f;\n+    private float speed = 10.0f;"

# Use fuzzy matching for inexact matches
script_update_diff Assets/Scripts/Enemy.cs "$DIFF_CONTENT" --fuzzy 80 --ignoreWhitespace

# Validate before applying
script_validate_diff Assets/Scripts/Player.cs "$DIFF_CONTENT"
```

### Folder Operations
```bash
# Create nested folders
folder_create Assets/Scripts/AI/Behaviors --recursive

# List folder contents with metadata
folder_list Assets/Scripts

# Rename folder
folder_rename Assets/Scripts/AI Assets/Scripts/ArtificialIntelligence
```

## 🔧 Technical Details

### Architecture
- **Unity Bridge Client**: WebSocket/TCP communication with Unity Editor
- **API Layer**: Modular API design (Script, Folder, Diff APIs)
- **MCP Server**: Standard I/O interface for Claude Desktop
- **Error Handling**: Comprehensive error types with actionable messages

### Performance
- Large file support (streaming for >1MB files)
- Batch operations support
- Connection pooling and retry logic
- Optimized diff processing (<5ms for 10k lines)

### Testing
- Unit test coverage: 100%
- Integration tests with Unity Bridge mock
- Performance benchmarks included
- Japanese/UTF-8 fully supported

## 📋 API Reference

See [V3_TEST_REPORT.md](V3_TEST_REPORT.md) for comprehensive testing results and API examples.

## ⚠️ Breaking Changes from v2.x

- Complete API redesign for Unity 6
- Requires Unity 6000.0 or later
- New Unity Bridge architecture
- Industry-standard diff processing
- All v2.x service-based APIs removed

## 🛠️ Development

### Setup for Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Start in development mode
npm run dev
```

### Development Configuration for Claude Desktop

For local development, you have several options:

#### Option 1: Using npm link (Recommended)
```bash
# In your development directory
cd /path/to/unity-mcp
npm run build
npm link

# Now you can use the same configuration as production
```

Claude Desktop config:
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

#### Option 2: Direct Node.js Execution
```json
{
  "mcpServers": {
    "unity-bridge-dev": {
      "command": "node",
      "args": ["/path/to/unity-mcp/build/index.js"],
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "unity-mcp:*"
      }
    }
  }
}
```

#### Option 3: TypeScript Direct Execution (with tsx)
First install tsx globally:
```bash
npm install -g tsx
```

Then configure:
```json
{
  "mcpServers": {
    "unity-bridge-ts": {
      "command": "tsx",
      "args": ["/path/to/unity-mcp/src/index.ts"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

#### Debugging Configuration
For debugging with Chrome DevTools or VS Code:
```json
{
  "mcpServers": {
    "unity-bridge-debug": {
      "command": "node",
      "args": [
        "--inspect=9229",
        "/path/to/unity-mcp/build/index.js"
      ],
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "*"
      }
    }
  }
}
```

Then open `chrome://inspect` in Chrome or attach VS Code debugger to port 9229.

**Note**: Remember to restart Claude Desktop after changing the configuration.

### Building Desktop Extension

To create a Desktop Extension package (.dxt):

```bash
# Build the extension package
npm run extension:build

# This creates unity-mcp-bridge.dxt ready for distribution
```

The extension package:
- Uses **single-file bundled format** (CommonJS)
- All dependencies included via esbuild
- No subdirectories (Claude Desktop requirement)
- Automatic shebang removal for compatibility
- Icon and metadata included

For detailed Desktop Extension creation guide, see [MCP_DESKTOP_EXTENSION_GUIDE.md](docs/MCP_DESKTOP_EXTENSION_GUIDE_EN.md)

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Run tests: `npm test`
4. Submit a pull request

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Google's [diff-match-patch](https://github.com/google/diff-match-patch) library
- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- Unity Technologies for Unity 6

---

**Note**: This is a complete rewrite (v3.0) with breaking changes. For v2.x documentation, see the [v2.x branch](https://github.com/zabaglione/unity-mcp/tree/v2.x).