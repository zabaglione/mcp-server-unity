#!/usr/bin/env node
import fetch from 'node-fetch';
import { spawn } from 'child_process';

const API_BASE = 'http://localhost:3000';
let httpServer;

async function startHttpServer() {
  return new Promise((resolve) => {
    httpServer = spawn('npm', ['run', 'start:http'], {
      stdio: 'pipe',
      shell: true
    });

    httpServer.stdout.on('data', (data) => {
      if (data.toString().includes('running on')) {
        console.log('✅ HTTP Server started');
        setTimeout(resolve, 1000); // Give it a moment to fully start
      }
    });

    httpServer.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });
  });
}

async function stopHttpServer() {
  if (httpServer) {
    httpServer.kill();
    console.log('🛑 HTTP Server stopped');
  }
}

async function testEndpoint(name, method, path, body = null) {
  console.log(`\n🧪 Testing: ${name}`);
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${path}`, options);
    const data = await response.json();

    if (response.ok) {
      console.log('✅ Success:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.log('❌ Failed:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('=== Unity MCP AI Features Test ===\n');

  let passed = 0;
  let total = 0;

  try {
    // Start the HTTP server
    await startHttpServer();

    // Test 1: Health check
    total++;
    if (await testEndpoint('Health Check', 'GET', '/health')) passed++;

    // Test 2: Set project path
    total++;
    if (await testEndpoint('Set Project Path', 'POST', '/api/project/setup', {
      projectPath: '/Users/zabaglione/Unity/MCPTest'
    })) passed++;

    // Test 3: AI Requirements Analysis
    total++;
    if (await testEndpoint('AI Requirements Analysis', 'POST', '/api/ai/analyze', {
      description: 'I want to create a 2D platformer game with inventory system, combat mechanics, and multiplayer support'
    })) passed++;

    // Test 4: Create project structure
    total++;
    if (await testEndpoint('Create Project Structure', 'POST', '/api/project/create-structure', {
      projectType: '2D_Platformer'
    })) passed++;

    // Test 5: Setup architecture
    total++;
    if (await testEndpoint('Setup Architecture', 'POST', '/api/project/setup-architecture', {
      pattern: 'MVC'
    })) passed++;

    // Test 6: Create player controller
    total++;
    if (await testEndpoint('Create Player Controller', 'POST', '/api/system/player-controller', {
      gameType: 'platformer',
      requirements: ['doubleJump', 'wallJump', 'dash']
    })) passed++;

    // Test 7: Create camera system
    total++;
    if (await testEndpoint('Create Camera System', 'POST', '/api/system/camera', {
      cameraType: 'follow',
      specifications: {
        smoothing: true,
        bounds: true,
        deadzone: true
      }
    })) passed++;

    // Test 8: Create UI framework
    total++;
    if (await testEndpoint('Create UI Framework', 'POST', '/api/system/ui-framework', {
      uiType: 'mobile',
      screens: ['mainMenu', 'gameplay', 'inventory', 'settings']
    })) passed++;

    // Test 9: Batch operations
    total++;
    if (await testEndpoint('Batch Operations', 'POST', '/api/batch', {
      operations: [
        {
          action: 'scriptService.listScripts',
          params: []
        },
        {
          action: 'projectService.getProjectInfo',
          params: []
        }
      ]
    })) passed++;

    // Test 10: Diagnostics summary
    total++;
    if (await testEndpoint('Diagnostics Summary', 'GET', '/api/diagnostics/summary')) passed++;

  } catch (error) {
    console.error('Test suite error:', error);
  } finally {
    // Stop the server
    await stopHttpServer();

    // Summary
    console.log('\n========================================');
    console.log('TEST SUMMARY');
    console.log('========================================');
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${total - passed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    process.exit(total === passed ? 0 : 1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  await stopHttpServer();
  process.exit(0);
});

runTests().catch(console.error);