/**
 * Create a simple icon for Unity MCP Bridge Desktop Extension
 * Uses base64 encoded SVG converted to PNG
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SVG icon design
const svgIcon = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="512" height="512" fill="#2D2D30"/>
  
  <!-- Unity-style cube wireframe -->
  <!-- Front face -->
  <path d="M 150 200 L 362 200 L 362 412 L 150 412 Z" 
        fill="none" stroke="#00BFFF" stroke-width="8"/>
  
  <!-- Top face -->
  <path d="M 150 200 L 256 100 L 468 100 L 362 200 Z" 
        fill="none" stroke="#00BFFF" stroke-width="8"/>
  
  <!-- Right face -->
  <path d="M 362 200 L 468 100 L 468 312 L 362 412 Z" 
        fill="none" stroke="#00BFFF" stroke-width="8"/>
  
  <!-- MCP connection dots at vertices -->
  <circle cx="150" cy="200" r="12" fill="#FF6B6B"/>
  <circle cx="362" cy="200" r="12" fill="#FF6B6B"/>
  <circle cx="362" cy="412" r="12" fill="#FF6B6B"/>
  <circle cx="150" cy="412" r="12" fill="#FF6B6B"/>
  <circle cx="256" cy="100" r="12" fill="#FF6B6B"/>
  <circle cx="468" cy="100" r="12" fill="#FF6B6B"/>
  <circle cx="468" cy="312" r="12" fill="#FF6B6B"/>
  
  <!-- Text -->
  <text x="256" y="460" font-family="Arial, sans-serif" font-size="48" 
        font-weight="bold" fill="#FFFFFF" text-anchor="middle">Unity MCP</text>
</svg>
`;

// For now, save as SVG (can be converted to PNG later)
const outputPath = path.join(__dirname, '..', 'icon.svg');
fs.writeFileSync(outputPath, svgIcon.trim());

console.log('Icon SVG created at:', outputPath);
console.log('To convert to PNG, use: convert icon.svg -resize 512x512 icon.png');
