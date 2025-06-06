#!/usr/bin/env node
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';
const TEST_PROJECT_PATH = '/Users/zabaglione/Unity/MCPTest';
const TEST_MATERIAL = 'TestMaterial';

async function testEndpoint(name, method, path, body = null) {
  console.log(`\nTesting: ${name}`);
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
  console.log('=== Unity MCP Material Features Test (Simple) ===\n');

  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Set project path
    console.log('1. Setting project path...');
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
    console.log('Material info:', JSON.stringify(materialInfo, null, 2).split('\n').slice(0, 10).join('\n') + '...');
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
    console.log('Updated shader:', updatedInfo.content[0].text.split('\n')[1]);
    console.log('Updated colors:', updatedInfo.content[0].text.split('\n').find(line => line.includes('_BaseColor')));
    passed++;

  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    failed++;
  }

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

runTests().catch(console.error);