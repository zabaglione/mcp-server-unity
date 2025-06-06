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
  console.log('=== Unity MCP Render Pipeline Detection Test ===\n');

  try {
    // Test 1: Set project path
    console.log('1. Setting project path...');
    await testEndpoint('Set Project', 'POST', '/api/project/setup', {
      projectPath: TEST_PROJECT_PATH
    });

    // Test 2: Get project info and check render pipeline
    console.log('\n2. Getting project information...');
    const projectInfo = await testEndpoint('Get Project Info', 'GET', '/api/project/info');
    console.log('\nProject Information:');
    console.log(projectInfo.content[0].text);

    // Extract render pipeline info
    const text = projectInfo.content[0].text;
    const renderPipelineMatch = text.match(/Render Pipeline: (.+)/);
    const renderPipeline = renderPipelineMatch ? renderPipelineMatch[1] : 'Unknown';
    
    console.log(`\n🔍 Detected Render Pipeline: ${renderPipeline}`);
    
    if (renderPipeline.includes('URP') || renderPipeline.includes('Universal')) {
      console.log('✅ URP correctly detected!');
    } else {
      console.log('⚠️  Warning: Expected URP but detected:', renderPipeline);
    }

    // Test 3: Create a material and see which template is used
    console.log('\n3. Creating a test material...');
    const materialResult = await testEndpoint('Create Material', 'POST', '/api/asset/create-material', {
      materialName: 'RenderPipelineTest'
    });
    console.log('Material creation result:', materialResult.content[0].text);

    // Test 4: Read the created material to verify shader
    console.log('\n4. Reading created material...');
    const materialInfo = await testEndpoint('Read Material', 'GET', '/api/material/RenderPipelineTest');
    const materialText = materialInfo.content[0].text;
    const shaderMatch = materialText.match(/Shader: (.+)/);
    const shader = shaderMatch ? shaderMatch[1] : 'Unknown';
    
    console.log(`\n🔍 Material shader: ${shader}`);
    
    if (shader.includes('Universal Render Pipeline')) {
      console.log('✅ Material correctly created with URP shader!');
    } else if (shader.includes('Standard') || shader.includes('Hidden/InternalErrorShader')) {
      console.log('⚠️  Warning: Material created with Built-in shader instead of URP');
    }

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Check if server is running
fetch(`${API_BASE}/health`)
  .then(() => runTests())
  .catch(() => {
    console.error('❌ Server is not running. Start it with: npm run start:http');
    process.exit(1);
  });