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
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[Unity MCP] Server running');
  }
}

// Main entry point
const server = new UnityMcpServer();
server.run().catch(console.error);