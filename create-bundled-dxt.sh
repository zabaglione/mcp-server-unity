#!/bin/bash

# Clean up
rm -rf dxt-bundled
mkdir -p dxt-bundled

# Copy manifest.json and modify entry point
cp manifest.json dxt-bundled/
sed -i '' 's|"entry_point": "server/simple-index.js"|"entry_point": "unity-mcp-server.bundle.js"|g' dxt-bundled/manifest.json
sed -i '' 's|"args": \["${__dirname}/server/simple-index.js"\]|"args": ["${__dirname}/unity-mcp-server.bundle.js"]|g' dxt-bundled/manifest.json

# Copy bundle
cp unity-mcp-server.bundle.js dxt-bundled/

# Create ZIP file
cd dxt-bundled
zip -r ../unity-mcp-server.dxt * -x "*.DS_Store" -x "__MACOSX/*"
cd ..

# Clean up
rm -rf dxt-bundled

echo "Created unity-mcp-server.dxt"