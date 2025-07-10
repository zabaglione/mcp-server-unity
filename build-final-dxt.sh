#!/bin/bash

# Unity MCP Server - Final DXT Builder
# This script builds the complete Unity MCP Server DXT package

set -e

echo "Building Unity MCP Server DXT package..."

# Clean previous builds
echo "Cleaning previous builds..."
rm -f unity-mcp-server.bundle.js
rm -f unity-mcp-server.dxt

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Create bundle
echo "Creating JavaScript bundle..."
node build-bundle.js

# Create DXT package
echo "Creating DXT package..."
./create-bundled-dxt.sh

# Verify final package
if [ -f "unity-mcp-server.dxt" ]; then
    echo "✓ Successfully created unity-mcp-server.dxt"
    echo "  Size: $(ls -lh unity-mcp-server.dxt | awk '{print $5}')"
    echo "  Contents:"
    unzip -l unity-mcp-server.dxt | grep -E '\.(json|js)$' | awk '{print "    " $4}'
else
    echo "✗ Failed to create unity-mcp-server.dxt"
    exit 1
fi

echo "DXT package build complete!"
echo "Install the package: unity-mcp-server.dxt"