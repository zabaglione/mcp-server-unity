#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

const projectPath = '/Users/zabaglione/Unity/CCExtension';
const targetDir = join(projectPath, 'Assets', 'Editor', 'MCP');
const targetFile = join(targetDir, 'MCPBridge.cs');

// Get the fixed template from the built server
const { Unity6MCPServer } = await import('./build/unity6-mcp-server.js');
const server = new Unity6MCPServer();

// Create directory
await mkdir(targetDir, { recursive: true });

// Get the fixed template content
const bridgeContent = server.getMCPBridgeTemplate();

// Write the fixed bridge file
await writeFile(targetFile, bridgeContent, 'utf-8');

// Create meta file
const metaContent = `fileFormatVersion: 2
guid: ${server.generateSimpleGuid()}
MonoImporter:
  externalObjects: {}
  serializedVersion: 2
  defaultReferences: []
  executionOrder: 0
  icon: {instanceID: 0}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;

await writeFile(targetFile + '.meta', metaContent, 'utf-8');

console.log('MCPBridge.cs reinstalled with null-safe fixes!');
console.log('Location:', targetFile);