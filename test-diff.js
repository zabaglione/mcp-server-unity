#!/usr/bin/env node

/**
 * Test script for diff-based update functionality
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configurations
const tests = [
  {
    name: 'Basic diff application',
    action: 'script_update_diff',
    params: {
      path: 'Assets/Scripts/TestPlayer.cs',
      diff: `@@ -15,3 +15,3 @@
-    private float speed = 5f;
+    private float speed = 10f;`,
      options: {
        dryRun: true
      }
    }
  },
  {
    name: 'Large diff with multiple hunks',
    action: 'script_update_diff',
    params: {
      path: 'Assets/Scripts/TestPlayer.cs',
      diff: `@@ -10,3 +10,3 @@
-    private int health = 100;
+    private int health = 200;
@@ -15,3 +15,3 @@
-    private float speed = 5f;
+    private float speed = 10f;
@@ -20,3 +20,4 @@
     void Start() {
         Debug.Log("Player started");
+        Debug.Log($"Health: {health}, Speed: {speed}");
     }`,
      options: {
        dryRun: true,
        validateSyntax: true
      }
    }
  },
  {
    name: 'Create diff between two contents',
    action: 'script_create_diff',
    params: {
      original: `public class Player : MonoBehaviour {
    private int health = 100;
    private float speed = 5f;
    
    void Start() {
        Debug.Log("Player started");
    }
}`,
      modified: `public class Player : MonoBehaviour {
    private int health = 200;
    private float speed = 10f;
    
    void Start() {
        Debug.Log("Player started");
        Debug.Log($"Health: {health}, Speed: {speed}");
    }
}`,
      options: {
        contextLines: 3
      }
    }
  },
  {
    name: 'Large file diff test',
    action: 'script_create_diff',
    params: {
      original: generateLargeScript(5000),
      modified: generateLargeScript(5000, true),
      options: {
        contextLines: 5
      }
    }
  }
];

// Generate large script for testing
function generateLargeScript(lines, modified = false) {
  let script = `using UnityEngine;
using System.Collections.Generic;

public class LargeTestScript : MonoBehaviour {
`;
  
  for (let i = 0; i < lines; i++) {
    if (i % 100 === 0) {
      script += `
    // Section ${i / 100}
    public void Method${i}() {
        int value = ${modified ? i * 2 : i};
        Debug.Log("Line " + value);
    }
`;
    }
  }
  
  script += `
}`;
  
  return script;
}

// Create test file first
async function setupTestFile() {
  const testContent = `using UnityEngine;

public class TestPlayer : MonoBehaviour {
    private int health = 100;
    private float speed = 5f;
    
    void Start() {
        Debug.Log("Player started");
    }
    
    void Update() {
        transform.Translate(Vector3.forward * speed * Time.deltaTime);
    }
}`;

  // Use MCP to create test file
  await runMCPCommand('script_create', {
    fileName: 'TestPlayer',
    content: testContent,
    folder: 'Assets/Scripts'
  });
}

// Run MCP command
async function runMCPCommand(action, params) {
  return new Promise((resolve, reject) => {
    const mcpPath = join(__dirname, 'build', 'index.js');
    const mcp = spawn('node', [mcpPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    mcp.stdout.on('data', (data) => {
      output += data.toString();
    });

    mcp.stderr.on('data', (data) => {
      error += data.toString();
    });

    mcp.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`MCP exited with code ${code}: ${error}`));
      } else {
        resolve(output);
      }
    });

    // Send request
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: action,
        arguments: params
      }
    };

    mcp.stdin.write(JSON.stringify(request) + '\n');
    
    // Give it time to process
    setTimeout(() => {
      mcp.stdin.end();
    }, 5000);
  });
}

// Run tests
async function runTests() {
  console.log('🧪 Unity MCP Diff Functionality Test Suite\n');
  
  try {
    // Setup test file
    console.log('📝 Creating test file...');
    await setupTestFile();
    console.log('✅ Test file created\n');
    
    // Run each test
    for (const test of tests) {
      console.log(`🔄 Running test: ${test.name}`);
      const startTime = Date.now();
      
      try {
        const result = await runMCPCommand(test.action, test.params);
        const duration = Date.now() - startTime;
        
        console.log(`✅ Success (${duration}ms)`);
        console.log(`📊 Result preview:`);
        console.log(result.substring(0, 500) + (result.length > 500 ? '...' : ''));
        console.log();
      } catch (error) {
        console.log(`❌ Failed: ${error.message}\n`);
      }
    }
    
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

// Check for large file handling
async function testLargeFileHandling() {
  console.log('\n🗂️ Testing Large File Handling\n');
  
  const sizes = [1000, 5000, 10000, 50000];
  
  for (const size of sizes) {
    console.log(`📏 Testing with ${size} lines (~${Math.round(size * 0.1)}KB)`);
    const startTime = Date.now();
    
    try {
      const largeContent = generateLargeScript(size);
      const modifiedContent = generateLargeScript(size, true);
      
      await runMCPCommand('script_create_diff', {
        original: largeContent,
        modified: modifiedContent,
        options: { contextLines: 3 }
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Completed in ${duration}ms (${(duration/1000).toFixed(2)}s)\n`);
      
    } catch (error) {
      console.log(`❌ Failed at ${size} lines: ${error.message}\n`);
      break;
    }
  }
}

// Main
(async () => {
  await runTests();
  await testLargeFileHandling();
})();