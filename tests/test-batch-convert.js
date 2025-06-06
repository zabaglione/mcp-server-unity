#!/usr/bin/env node
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';
const TEST_PROJECT_PATH = '/Users/zabaglione/Unity/MCPTest';

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
  console.log('=== Unity MCP Batch Material Conversion Test ===\n');

  try {
    // Test 1: Set project path
    console.log('1. Setting project path...');
    await testEndpoint('Set Project', 'POST', '/api/project/setup', {
      projectPath: TEST_PROJECT_PATH
    });

    // Test 2: Create test materials
    console.log('\n2. Creating test materials...');
    const testMaterials = ['BatchMat1', 'BatchMat2', 'BatchMat3'];
    
    for (const matName of testMaterials) {
      await testEndpoint(`Create ${matName}`, 'POST', '/api/asset/create-material', {
        materialName: matName
      });
    }

    // Test 3: Batch convert materials
    console.log('\n3. Batch converting materials to URP...');
    const conversionResult = await testEndpoint('Batch Convert', 'POST', '/api/material/batch-convert', {
      materials: testMaterials,
      targetShader: 'Universal Render Pipeline/Lit',
      propertyMapping: {
        '_Color': '_BaseColor',
        '_MainTex': '_BaseMap',
        '_Metallic': '_Metallic',
        '_Glossiness': '_Smoothness'
      }
    });

    console.log('\nConversion result:');
    console.log(conversionResult.content[0].text);

    // Test 4: Verify conversion
    console.log('\n4. Verifying conversions...');
    const mat1Info = await testEndpoint('Read BatchMat1', 'GET', '/api/material/BatchMat1');
    console.log('\nBatchMat1 shader:', mat1Info.content[0].text.split('\n')[1]);

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests().catch(console.error);