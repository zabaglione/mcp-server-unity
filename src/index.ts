#!/usr/bin/env node

// Unity 6 MCP Bridge v3.0.0
// Complete rewrite for Unity 6000+ with direct Unity API integration

import { Unity6MCPServer } from './unity6-mcp-server.js';

/**
 * Unity 6 MCP Bridge Entry Point
 * 
 * BREAKING CHANGES in v3.0.0:
 * - Complete API redesign for Unity 6
 * - Direct Unity Editor integration via bridge
 * - Requires Unity 6000.0 or later
 * - Previous v1.x/v2.x APIs are not compatible
 * 
 * New Features:
 * - Real-time Unity API integration
 * - Roslyn-powered code analysis
 * - Native AssetDatabase operations
 * - Advanced script patching
 * - Unity 6 template system
 */

async function main() {
  console.log('Starting Unity 6 MCP Bridge v3.0.0...');
  console.log('Requirements: Unity 6000.0+ with MCP Bridge package');
  console.log('Connecting to Unity Editor...');
  
  const server = new Unity6MCPServer();
  await server.start();
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
main().catch((error) => {
  console.error('Failed to start Unity 6 MCP Bridge:', error);
  process.exit(1);
});