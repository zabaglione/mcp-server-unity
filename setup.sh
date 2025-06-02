#!/bin/bash

# MCP Server for Unity - Setup Script

echo "MCP Server for Unity - Setup"
echo "======================"

# Check Node.js version
NODE_VERSION=$(node --version 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "Error: Node.js is not installed. Please install Node.js 18.x or higher."
    exit 1
fi

MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1 | sed 's/v//')
if [ $MAJOR_VERSION -lt 18 ]; then
    echo "Error: Node.js version $NODE_VERSION is too old. Please install Node.js 18.x or higher."
    exit 1
fi

echo "✓ Node.js version: $NODE_VERSION"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Build the project
echo ""
echo "Building the project..."
npm run build

# Check if build succeeded
if [ $? -ne 0 ]; then
    echo "Error: Build failed. Please check the error messages above."
    exit 1
fi

echo ""
echo "✓ Setup completed successfully!"
echo ""
echo "Claude Desktop Configuration:"
echo "============================"
echo ""
echo "Add the following to your Claude Desktop configuration file:"
echo ""
echo "macOS: ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "Windows: %APPDATA%\\Claude\\claude_desktop_config.json"
echo ""
echo '{'
echo '  "mcpServers": {'
echo '    "mcp-server-unity": {'
echo '      "command": "node",'
echo '      "args": ["'$(pwd)'/build/index.js"]'
echo '    }'
echo '  }'
echo '}'
echo ""
echo "After adding this configuration, restart Claude Desktop."
echo ""
echo "Usage Example:"
echo "============="
echo ""
echo "1. Set Unity project: 'Use project /path/to/unity/project'"
echo "2. Create script: 'Create a PlayerController script'"
echo "3. Install package: 'Install ProBuilder'"
echo "4. Get project info: 'Show project information'"
echo ""