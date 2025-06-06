#!/usr/bin/env node
import fetch from 'node-fetch';
import { spawn } from 'child_process';

const API_BASE = 'http://localhost:3000';
const TEST_PROJECT_PATH = '/Users/zabaglione/Unity/MCPTest';
const TEST_MATERIAL = 'TestMaterial';

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
  console.log(`Testing: ${name}`);
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
      console.log('✅ Success');
      return data;
    } else {
      console.log('❌ Failed:', data.message);
      throw new Error(data.message);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    throw error;
  }
}

async function runTests() {
  console.log('=== Unity MCP Material Features Test (HTTP) ===\n');

  let passed = 0;
  let failed = 0;

  try {
    // Start the HTTP server
    await startHttpServer();

    // Test 1: Set project path
    console.log('\n1. Setting project path...');
    await testEndpoint('Set Project', 'POST', '/api/project/setup', {
      projectPath: TEST_PROJECT_PATH
    });
    passed++;

    // Test 2: Create a test material
    console.log('\n2. Creating test material...');
    await testEndpoint('Create Material', 'POST', '/api/asset/create-material', {
      materialName: TEST_MATERIAL
    });
    passed++;

    // Test 3: Read material properties
    console.log('\n3. Reading material properties...');
    const materialInfo = await testEndpoint('Read Material', 'GET', `/api/material/${TEST_MATERIAL}`);
    console.log('Material info:', materialInfo.content[0].text.split('\n').slice(0, 3).join('\n'));
    passed++;

    // Test 4: Update material shader to URP
    console.log('\n4. Updating material shader to URP Lit...');
    await testEndpoint('Update Shader', 'PUT', '/api/material/shader', {
      materialName: TEST_MATERIAL,
      shaderName: 'Universal Render Pipeline/Lit'
    });
    passed++;

    // Test 5: Update material properties
    console.log('\n5. Updating material properties...');
    await testEndpoint('Update Properties', 'PUT', '/api/material/properties', {
      materialName: TEST_MATERIAL,
      properties: {
        colors: {
          '_BaseColor': [0.2, 0.8, 1.0, 1.0]
        },
        floats: {
          '_Metallic': 0.3,
          '_Smoothness': 0.8
        }
      }
    });
    passed++;

    // Test 6: Read updated material
    console.log('\n6. Reading updated material...');
    const updatedInfo = await testEndpoint('Read Updated Material', 'GET', `/api/material/${TEST_MATERIAL}`);
    console.log('Updated properties:', updatedInfo.content[0].text.split('\n').slice(4, 10).join('\n'));
    passed++;

    // Test 7: Update script
    console.log('\n7. Testing script update...');
    
    // First create a test script
    await testEndpoint('Create Script', 'POST', '/api/asset/create-script', {
      fileName: 'TestUpdateScript',
      content: 'public class TestUpdateScript : MonoBehaviour { }'
    });

    // Then update it
    const updatedScriptContent = `using UnityEngine;

public class TestUpdateScript : MonoBehaviour
{
    // This script was updated by MCP
    void Start()
    {
        Debug.Log("Script updated successfully!");
    }
}`;

    await testEndpoint('Update Script', 'PUT', '/api/asset/update-script', {
      fileName: 'TestUpdateScript',
      content: updatedScriptContent,
      backup: true
    });
    passed++;

    // Test 8: Batch convert materials
    console.log('\n8. Testing batch material conversion...');
    
    // Create additional test materials
    await testEndpoint('Create BatchTest1', 'POST', '/api/asset/create-material', {
      materialName: 'BatchTest1'
    });
    await testEndpoint('Create BatchTest2', 'POST', '/api/asset/create-material', {
      materialName: 'BatchTest2'
    });
    
    // Batch convert them
    await testEndpoint('Batch Convert', 'POST', '/api/material/batch-convert', {
      materials: ['BatchTest1', 'BatchTest2'],
      targetShader: 'Universal Render Pipeline/Lit',
      propertyMapping: {
        '_Color': '_BaseColor',
        '_MainTex': '_BaseMap'
      }
    });
    passed++;

  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    failed++;
  } finally {
    // Stop the server
    await stopHttpServer();

    // Summary
    console.log('\n========================================');
    console.log('TEST SUMMARY');
    console.log('========================================');
    console.log(`Total Tests: ${passed + failed}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

    process.exit(failed > 0 ? 1 : 0);
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  await stopHttpServer();
  process.exit(0);
});

runTests().catch(console.error);