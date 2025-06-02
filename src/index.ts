#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { UnityMCPServer } from './server.js';
import { ConsoleLogger } from './utils/logger.js';

async function main() {
  const logger = new ConsoleLogger('[Unity MCP]');
  const server = new UnityMCPServer(logger);
  const transport = new StdioServerTransport();
  
  try {
    await server.getServer().connect(transport);
    logger.info('Unity MCP server running on stdio');
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

main().catch(console.error);