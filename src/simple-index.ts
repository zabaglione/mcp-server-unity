#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { UnityMcpTools } from './tools/unity-mcp-tools.js';

/**
 * Simple Unity MCP Server
 * Provides Unity Editor integration through MCP protocol
 */
class UnityMcpServer {
  private server: Server;
  private tools: UnityMcpTools;

  constructor() {
    this.tools = new UnityMcpTools();
    this.server = new Server(
      {
        name: 'unity-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.tools.getTools(),
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return this.tools.executeTool(request.params.name, request.params.arguments || {});
    });
  }

  async run() {
    try {
      console.error('[Unity MCP] Starting server...');
      const transport = new StdioServerTransport();
      
      console.error('[Unity MCP] Connecting to transport...');
      await this.server.connect(transport);
      console.error('[Unity MCP] Server connected successfully');
      
      // Keep the process alive - this is critical!
      process.stdin.resume();
      
      process.on('SIGINT', () => {
        console.error('[Unity MCP] Received SIGINT, shutting down...');
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        console.error('[Unity MCP] Received SIGTERM, shutting down...');
        process.exit(0);
      });
      
      // Log that we're ready
      console.error('[Unity MCP] Server is ready and listening');
    } catch (error) {
      console.error('[Unity MCP] Failed to start server:', error);
      throw error;
    }
  }
}

// Main entry point
const server = new UnityMcpServer();
server.run().catch((error) => {
  console.error('[Unity MCP] Fatal error:', error);
  process.exit(1);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[Unity MCP] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unity MCP] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});