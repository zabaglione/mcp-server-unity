#!/usr/bin/env node

import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Build the bundle
await esbuild.build({
  entryPoints: ['build/simple-index.js'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'unity-mcp-server.bundle.js',
  format: 'esm',
  // No banner needed - causes conflicts
  external: [
    'crypto',
    'fs',
    'path',
    'url',
    'util',
    'stream',
    'os',
    'events',
    'http',
    'https',
    'net',
    'child_process',
    'readline',
    'zlib',
    'buffer',
    'string_decoder',
    'querystring',
    'assert',
    'tty',
    'dgram',
    'dns',
    'v8',
    'vm',
    'worker_threads',
    'perf_hooks'
  ],
  minify: false,
  sourcemap: false,
  metafile: true
});

console.log('Bundle created: unity-mcp-server.bundle.js');