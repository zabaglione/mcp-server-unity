# Building Unity MCP Server DXT Package

## Quick Build

To build the complete DXT package for Claude Desktop:

```bash
npm run build:dxt
```

This will create `unity-mcp-server.dxt` which can be installed in Claude Desktop.

## Manual Build Steps

If you need to build manually:

1. **Build TypeScript:**
   ```bash
   npm run build
   ```

2. **Create JavaScript bundle:**
   ```bash
   node build-bundle.js
   ```

3. **Create DXT package:**
   ```bash
   ./create-bundled-dxt.sh
   ```

## Installation

1. Build the DXT package using `npm run build:dxt`
2. Install `unity-mcp-server.dxt` in Claude Desktop
3. The server will automatically start when Claude Desktop loads

## What's Included

The DXT package contains:
- **manifest.json** - Extension metadata
- **unity-mcp-server.bundle.js** - Complete bundled server with embedded Unity scripts

All Unity C# scripts are embedded directly in the JavaScript bundle, eliminating file dependencies.

## Clean Build

To start fresh:

```bash
npm run clean
npm run build:dxt
```