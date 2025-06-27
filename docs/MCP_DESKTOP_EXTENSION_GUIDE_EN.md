# MCP Desktop Extension (.dxt) Creation Guide

## Key Discovery

### Root Causes of Issues
1. **Directory Structure Issue**: Claude Desktop attempts to read directories as "files", causing ENOENT errors
2. **Shebang Issue**: `#!/usr/bin/env node` causes SyntaxError when present
3. **Module Format Issue**: Using ESM (import/export) causes `Cannot use import statement outside a module` error

### Solution: Single File + CommonJS Format
**Bundle all code and dependencies into a single CommonJS format JavaScript file**

## Essential Requirements

### 1. manifest.json Structure
```json
{
  "dxt_version": "1.0.0",
  "name": "extension-name",
  "version": "1.0.0",
  "server": {
    "type": "node",
    "entry_point": "bundled-server.js",  // Single file!
    "mcp_config": {
      "command": "node",
      "args": ["${__dirname}/bundled-server.js"]
    }
  },
  "tools": [
    {
      "name": "tool_name",
      "description": "Tool description"
    }
    // ... other tools
  ]
}
```

### 2. Build Process

#### Required Tools
```bash
npm install --save-dev esbuild
```

#### Example Build Script
```bash
#!/bin/bash

# Compile TypeScript
npm run build

# Bundle into single file with esbuild (Important: CommonJS format)
npx esbuild build/index.js \
  --bundle \
  --platform=node \
  --target=node18 \
  --outfile=extension-package/bundled-server.js \
  --external:fsevents \  # Exclude platform-specific modules
  --format=cjs \         # CommonJS format (Important!)

# Remove shebang (Important!)
# esbuild might automatically add it
sed -i '' '1s/^#!/\/\/ Removed shebang: #!/' extension-package/bundled-server.js

# Copy and update manifest.json
cp manifest.json extension-package/
sed -i '' 's|"entry_point": ".*"|"entry_point": "bundled-server.js"|g' extension-package/manifest.json

# Copy icon if exists
if [ -f "icon.png" ]; then
  cp icon.png extension-package/
fi

# Create .dxt package (ZIP archive)
cd extension-package
zip -r ../your-extension.dxt . -x "*.DS_Store"
cd ..
```

## Recommended .dxt Package Structure

```
your-extension.dxt (ZIP archive)
├── manifest.json           # Extension metadata
├── bundled-server.js       # Single file containing all code and dependencies
└── icon.png               # Optional (512x512 recommended)
```

**Important**: Do NOT create subdirectories!

## Common Mistakes and Solutions

### ❌ Wrong: Including node_modules
```
extension.dxt
├── manifest.json
├── server.js
└── node_modules/    # This causes errors!
```

### ✅ Correct: Bundle dependencies
```
extension.dxt
├── manifest.json
├── bundled-server.js  # node_modules contents are bundled here
└── icon.png
```

### ❌ Wrong: Multiple directory structure
```
extension.dxt
├── manifest.json
├── build/          # Error!
├── src/            # Error!
└── lib/            # Error!
```

### ✅ Correct: Flat structure
```
extension.dxt
├── manifest.json
├── bundled-server.js
└── icon.png
```

## Important esbuild Settings

### Required Settings
```bash
--format=cjs      # CommonJS format (ESM causes errors)
--platform=node   # Node.js environment
--target=node18   # Claude Desktop's Node.js version
```

### Exclude Platform-Specific Modules
```bash
--external:fsevents  # macOS specific
--external:@parcel/watcher  # Optional dependencies
```

### Shebang Handling
```bash
# Remove shebang that esbuild automatically adds
sed -i '' '1s/^#!/\/\/ Removed shebang: #!/' bundled-file.js
```

### Handling Large File Sizes
- Works even with large bundled files (>1MB)
- Unity MCP example: 326KB (after bundling)

## Testing and Debugging

### 1. Verify Package Structure
```bash
unzip -l your-extension.dxt
# Confirm no directories are included
```

### 2. Validate manifest.json
```bash
# Confirm entry_point points to single file
cat manifest.json | jq '.server.entry_point'
```

### 3. Test Bundle File
```bash
# Run directly to check for errors
node bundled-server.js
```

## Unity MCP Implementation Example

See complete implementation:
- [build-extension.sh](../scripts/build-extension.sh)
- [manifest.json](../manifest.json)

### Success Points
1. **Use esbuild** to bundle all dependencies into single file
2. **Flat structure** - no subdirectories
3. **Accurate manifest.json** - entry_point must point to single file
4. **Proper exclusions** - exclude platform-specific modules

## Debugging Methods

### Check Installed Files
```bash
# For macOS
cd "/Users/$USER/Library/Application Support/Claude/Claude Extensions/local.dxt.your-extension-name/"
ls -la

# Test the file directly
node bundled-server.js
```

### Check Log Files
```bash
# For macOS
tail -f "/Users/$USER/Library/Logs/Claude/mcp-server-your-extension-name.log"
```

## Summary

Key points for creating MCP Desktop Extensions:

1. **No directory structures** - Claude Desktop tries to read directories as files
2. **Bundle into single CommonJS file** - Use esbuild with `--format=cjs`
3. **Remove shebang** - `#!/usr/bin/env node` causes SyntaxError
4. **Precise manifest.json** - especially entry_point configuration
5. **Test with actual installation** - structural issues only appear during installation

### Verified Working Environment
- Claude Desktop (macOS)
- Node.js v20.15.0
- Bundled with esbuild
- CommonJS format

Following this approach ensures your MCP extension works reliably in Claude Desktop.