/**
 * Generate a simple icon for Unity MCP Bridge Desktop Extension
 * Creates a 512x512 PNG with Unity-inspired design
 */

import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a 512x512 canvas
const canvas = createCanvas(512, 512);
const ctx = canvas.getContext('2d');

// Background - Unity dark theme color
ctx.fillStyle = '#2D2D30';
ctx.fillRect(0, 0, 512, 512);

// Draw Unity-style cube wireframe
ctx.strokeStyle = '#00BFFF'; // Unity blue
ctx.lineWidth = 8;

// Front face
ctx.beginPath();
ctx.moveTo(150, 200);
ctx.lineTo(362, 200);
ctx.lineTo(362, 412);
ctx.lineTo(150, 412);
ctx.closePath();
ctx.stroke();

// Top face
ctx.beginPath();
ctx.moveTo(150, 200);
ctx.lineTo(256, 100);
ctx.lineTo(468, 100);
ctx.lineTo(362, 200);
ctx.closePath();
ctx.stroke();

// Right face
ctx.beginPath();
ctx.moveTo(362, 200);
ctx.lineTo(468, 100);
ctx.lineTo(468, 312);
ctx.lineTo(362, 412);
ctx.closePath();
ctx.stroke();

// MCP connection dots
ctx.fillStyle = '#FF6B6B'; // Coral red for MCP
const dotRadius = 12;

// Draw connection dots at vertices
const vertices = [
  [150, 200], [362, 200], [362, 412], [150, 412],
  [256, 100], [468, 100], [468, 312]
];

vertices.forEach(([x, y]) => {
  ctx.beginPath();
  ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
  ctx.fill();
});

// Add text
ctx.fillStyle = '#FFFFFF';
ctx.font = 'bold 48px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('Unity MCP', 256, 460);

// Save the icon
const outputPath = path.join(__dirname, '..', 'icon.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);

console.log('Icon generated successfully at:', outputPath);
