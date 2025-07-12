# Unity MCP Server

Unity MCP Server lets Claude work with your Unity projects! Create scripts, manage shaders, organize folders - all through natural conversation with Claude.

[日本語版 README はこちら](README-ja.md) | [English](README.md)

## 🎮 What Can You Do?

Talk to Claude to:
- **Create Unity Scripts**: "Create a PlayerController script with jump functionality"
- **Manage Shaders**: "Create a toon shader for my character"
- **Organize Projects**: "Create a folder structure for my RPG game"
- **Get Project Info**: "What render pipeline is my project using?"

## 🚀 Quick Start (Recommended: Claude Desktop Extension)

### Option 1: Install via Claude Desktop Extension (Easiest)

1. **Download the Extension**
   - Go to [Latest Release](https://github.com/zabaglione/mcp-server-unity/releases/latest)
   - Download `unity-mcp-server.dxt` (42KB)

2. **Install in Claude Desktop**
   - Open Claude Desktop
   - Go to Extensions
   - Click "Install from file"
   - Select the downloaded `unity-mcp-server.dxt`

3. **Start Using!**
   - Open any Unity project (2019.4 or newer)
   - Install NewtonSoft JSON package in Unity:
     - Open Window → Package Manager
     - Click the "+" button and select "Add package by name..."
     - Enter: `com.unity.nuget.newtonsoft-json`
     - Click "Add"
   - Ask Claude: "Setup Unity MCP in my project at /path/to/project"
   - Claude will install everything automatically!

### Option 2: Manual Installation (For developers)

<details>
<summary>Click to see manual installation steps</summary>

1. Clone and build:
   ```bash
   git clone https://github.com/zabaglione/mcp-server-unity.git
   cd mcp-server-unity
   npm install
   npm run build
   ```

2. Configure Claude Desktop:
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

</details>

## 📝 How to Use

Once installed, just talk to Claude naturally:

### Creating Scripts
```
You: "Create a PlayerHealth script that handles damage and healing"
Claude: I'll create a PlayerHealth script for you...
```

### Creating Shaders
```
You: "I need a water shader with wave animation"
Claude: I'll create a water shader with wave animation...
```

### Organizing Your Project
```
You: "Set up a folder structure for a platformer game"
Claude: I'll create an organized folder structure for your platformer...
```

### Checking Project Info
```
You: "What Unity version and render pipeline am I using?"
Claude: Let me check your project information...
```

## 🎯 Features

- ✅ **Smart Script Creation** - Claude understands Unity patterns and creates proper MonoBehaviours
- ✅ **Shader Support** - Works with Built-in, URP, and HDRP render pipelines
- ✅ **Project Organization** - Create, move, and rename folders to keep projects tidy
- ✅ **Auto Setup** - Claude automatically sets up the Unity integration when needed
- ✅ **Safe Operations** - All changes are made safely with proper Unity asset handling

## 🛠️ Troubleshooting

### "Unity server not responding"
1. Make sure Unity Editor is open
2. Check Window → Unity MCP Server in Unity
3. Click "Start Server" if it's not running

### "Can't find my project"
- Tell Claude the exact path: "My Unity project is at C:/Projects/MyGame"
- Make sure it's a valid Unity project with an Assets folder

### Need Help?
- Ask Claude: "Help me troubleshoot Unity MCP"
- Check [Issues](https://github.com/zabaglione/mcp-server-unity/issues)
- See [Technical Documentation](TECHNICAL.md) for advanced details

## 🎮 Unity Version Support

- **Unity 2019.4+** - Full support
- **Unity 6 (6000.0+)** - Recommended for best experience
- Works on Windows, macOS, and Linux

## 📈 Latest Updates (v3.1.1)

- ✅ Fixed render pipeline detection (now correctly identifies Built-in, URP, HDRP)
- ✅ Resolved AssetDatabase synchronization errors
- ✅ Improved file management and Unity integration stability

## 🤝 Contributing

Want to help improve Unity MCP Server? Check out our [Contributing Guide](CONTRIBUTING.md)!

## 📝 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for Claude and MCP
- [Unity Technologies](https://unity.com) for the amazing game engine
- All our contributors and users!

---

**Ready to supercharge your Unity development with Claude?** [Download the extension now!](https://github.com/zabaglione/mcp-server-unity/releases/latest)