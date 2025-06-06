#!/usr/bin/env node
import { UnityMCPHttpServer } from './http-server.js';

async function main() {
  const port = parseInt(process.env.PORT || '3000', 10);
  const server = new UnityMCPHttpServer(port);
  server.start();
}

main().catch(console.error);