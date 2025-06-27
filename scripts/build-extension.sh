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
mkdir -p extension-package

# Build the project
echo -e "\n${YELLOW}Building Unity MCP Bridge...${NC}"
npm run build

# Bundle into a single file using esbuild
echo -e "${YELLOW}Creating bundled server file...${NC}"
npx esbuild build/index.js --bundle --platform=node --target=node18 --outfile=extension-package/unity6-mcp-server.bundle.js --external:fsevents --format=cjs

# Remove shebang that esbuild might have added
# The shebang causes SyntaxError when Node.js loads the file via 'node' command
echo -e "${YELLOW}Removing shebang from bundled file...${NC}"
sed -i '' '1s/^#!/\/\/ Removed shebang: #!/' extension-package/unity6-mcp-server.bundle.js

# Copy manifest and update entry point
echo -e "${YELLOW}Copying and updating manifest...${NC}"
cp manifest.json extension-package/
sed -i '' 's|"entry_point": "build/unity6-mcp-server.js"|"entry_point": "unity6-mcp-server.bundle.js"|g' extension-package/manifest.json
sed -i '' 's|"args": \["\${__dirname}/build/unity6-mcp-server.js"\]|"args": \["\${__dirname}/unity6-mcp-server.bundle.js"\]|g' extension-package/manifest.json

# Copy icon if exists
if [ -f "icon.png" ]; then
    echo -e "${YELLOW}Copying icon...${NC}"
    cp icon.png extension-package/
else
    echo -e "${YELLOW}Warning: icon.png not found. Extension will have no icon.${NC}"
fi

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
