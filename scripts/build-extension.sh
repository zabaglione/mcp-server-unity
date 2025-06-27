#!/bin/bash

# Unity MCP Bridge - Desktop Extension Builder
# Builds a .dxt package for MCP Desktop Extensions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Unity MCP Bridge - Desktop Extension Builder${NC}"
echo "============================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Clean previous build
echo -e "\n${YELLOW}Cleaning previous build...${NC}"
rm -rf extension-package
rm -f unity-mcp-bridge.dxt

# Create package structure
echo -e "${YELLOW}Creating package structure...${NC}"
mkdir -p extension-package/{server,dependencies}

# Build the project
echo -e "\n${YELLOW}Building Unity MCP Bridge...${NC}"
npm run build

# Copy server files
echo -e "${YELLOW}Copying server files...${NC}"
cp -r build extension-package/server/
cp -r src extension-package/server/
cp package.json extension-package/server/
cp package-lock.json extension-package/server/

# Copy manifest
echo -e "${YELLOW}Copying manifest...${NC}"
cp manifest.json extension-package/

# Copy icon if exists
if [ -f "icon.png" ]; then
    echo -e "${YELLOW}Copying icon...${NC}"
    cp icon.png extension-package/
else
    echo -e "${YELLOW}Warning: icon.png not found. Extension will have no icon.${NC}"
fi

# Install production dependencies
echo -e "\n${YELLOW}Installing production dependencies...${NC}"
cd extension-package/server
npm ci --production
cd ../..

# Create minimal package.json for the extension
echo -e "${YELLOW}Creating minimal package.json...${NC}"
cat > extension-package/server/package.json << 'EOF'
{
  "name": "unity-mcp-bridge-server",
  "version": "3.0.0",
  "type": "module",
  "main": "build/unity6-mcp-server.js",
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# Copy dependencies info
echo -e "${YELLOW}Creating dependencies info...${NC}"
cat > extension-package/dependencies/README.md << 'EOF'
# Dependencies

All required dependencies are bundled in the server/node_modules directory.

Core dependencies:
- @modelcontextprotocol/sdk: MCP protocol implementation
- diff-match-patch: Google's diff algorithm for code updates
- ws: WebSocket client for Unity Bridge communication

No additional installation required.
EOF

# Create the .dxt package (ZIP archive)
echo -e "\n${YELLOW}Creating .dxt package...${NC}"
cd extension-package
zip -r ../unity-mcp-bridge.dxt . -x "*.DS_Store" "*/node_modules/.bin/*"
cd ..

# Calculate package size
SIZE=$(du -h unity-mcp-bridge.dxt | cut -f1)

echo -e "\n${GREEN}✅ Build complete!${NC}"
echo -e "Package: ${GREEN}unity-mcp-bridge.dxt${NC} (${SIZE})"
echo -e "\nTo install in Claude Desktop:"
echo -e "1. Open Claude Desktop"
echo -e "2. Go to Extensions"
echo -e "3. Click 'Install from file'"
echo -e "4. Select unity-mcp-bridge.dxt"
echo -e "\nNote: Unity project path can be configured after installation."
