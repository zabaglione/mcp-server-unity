#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

const projectPath = '/Users/zabaglione/Unity/CCExtension';

// Get the refactored templates from the built server
const { Unity6MCPServer } = await import('./build/unity6-mcp-server.js');
const server = new Unity6MCPServer();

// Set up directories
const mcpDir = join(projectPath, 'Assets', 'Editor', 'MCP');
const coreDir = join(mcpDir, 'Core');
const handlersDir = join(mcpDir, 'Handlers');

// Create directory structure
await mkdir(mcpDir, { recursive: true });
await mkdir(coreDir, { recursive: true });
await mkdir(handlersDir, { recursive: true });

// Get all refactored bridge files
const bridgeFiles = server.getRefactoredBridgeFiles();
let installedFiles = 0;

console.log('Installing MCPBridge refactored architecture...');

// Install all files
for (const [relativePath, content] of Object.entries(bridgeFiles)) {
  const targetFile = join(mcpDir, relativePath);
  const targetDir = dirname(targetFile);
  
  // Ensure directory exists
  await mkdir(targetDir, { recursive: true });
  
  // Write file
  await writeFile(targetFile, content, 'utf-8');
  
  // Create .meta file for Unity
  const metaContent = server.generateMetaFile(basename(targetFile), 'MonoScript');
  await writeFile(targetFile + '.meta', metaContent, 'utf-8');
  
  installedFiles++;
  console.log(`✅ Installed: ${relativePath}`);
}

function basename(filePath) {
  return filePath.split('/').pop();
}

console.log(`\n🎉 MCPBridge refactored architecture installed successfully!`);
console.log(`Files installed: ${installedFiles} C# files + ${installedFiles} .meta files`);
console.log(`Location: ${mcpDir}`);

console.log(`\nArchitecture:`);
console.log(`├── MCPBridge.cs (Main entry point)`);
console.log(`├── Core/`);
console.log(`│   ├── IMCPHandler.cs (Interface)`);
console.log(`│   ├── MCPHandlerBase.cs (Base class)`);
console.log(`│   ├── MCPRequest.cs, MCPResponse.cs (Data)`);
console.log(`│   └── ThreadUtils.cs (Main thread utilities)`);
console.log(`├── MCPHandlerFactory.cs (Handler management)`);
console.log(`└── Handlers/`);
console.log(`    ├── ScriptHandler.cs (Script operations)`);
console.log(`    └── FolderHandler.cs (Folder operations)`);

console.log(`\nBenefits:`);
console.log(`• Modular architecture - each file ~50-150 lines`);
console.log(`• Easy to extend - add new handlers for new features`);
console.log(`• Clean separation of concerns`);
console.log(`• Reusable components`);

console.log(`\nNext steps:`);
console.log(`1. Unity Editor will compile all scripts automatically`);
console.log(`2. Check Unity Console for: "MCP Handler Factory initialized with X handlers"`);
console.log(`3. Check Unity Console for: "Unity 6 MCP Bridge starting on TCP port: 23456"`);
console.log(`4. Use bridge_status to verify installation`);