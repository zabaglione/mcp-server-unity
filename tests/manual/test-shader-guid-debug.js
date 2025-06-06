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
  console.log('=== Shader GUID Debug Test ===\n');

  try {
    // Set project
    await testEndpoint('Set Project', 'POST', '/api/project/setup', {
      projectPath: TEST_PROJECT_PATH
    });

    // List existing shaders
    console.log('\n1. Listing existing shaders...');
    const shaderList = await testEndpoint('List Shaders', 'GET', '/api/shader/list');
    console.log(shaderList.content[0].text);

    // Read the HeightBasedColor material
    console.log('\n2. Reading HeightBasedMaterial to see its shader reference...');
    const materialInfo = await testEndpoint('Read Material', 'GET', '/api/material/HeightBasedMaterial');
    console.log(materialInfo.content[0].text);

    // Try to create a new test shader and material
    console.log('\n3. Creating new test shader...');
    const shaderContent = `Shader "Custom/TestDebugShader"
{
    Properties
    {
        _Color ("Color", Color) = (1,1,1,1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
            };

            struct v2f
            {
                float4 vertex : SV_POSITION;
            };

            float4 _Color;

            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                return _Color;
            }
            ENDCG
        }
    }
}`;

    const shaderResult = await testEndpoint('Create Shader', 'POST', '/api/asset/create-shader', {
      shaderName: 'TestDebugShader',
      shaderType: 'builtin',
      customContent: shaderContent
    });
    console.log('Shader creation response:', shaderResult.content[0].text);

    // Extract GUID from response
    const guidMatch = shaderResult.content[0].text.match(/GUID: ([a-f0-9]{32})/);
    const createdGUID = guidMatch ? guidMatch[1] : null;
    console.log(`\nCreated shader GUID: ${createdGUID}`);

    // Wait a moment for file system
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create material using the new API
    console.log('\n4. Creating material with the test shader...');
    const materialResult = await testEndpoint('Create Material with Shader', 'POST', '/api/material/create-with-shader', {
      materialName: 'TestDebugMaterial',
      shaderName: 'TestDebugShader'
    });
    console.log('Material creation response:', materialResult.content[0].text);

    // Read the created material
    console.log('\n5. Reading created material to check shader reference...');
    const newMaterialInfo = await testEndpoint('Read Material', 'GET', '/api/material/TestDebugMaterial');
    console.log(newMaterialInfo.content[0].text);

    // Check if GUID matches
    const materialText = newMaterialInfo.content[0].text;
    if (materialText.includes(`GUID: ${createdGUID}`)) {
      console.log('\n✅ SUCCESS: Material correctly references the shader with matching GUID!');
    } else {
      console.log('\n❌ FAILED: Material GUID does not match the created shader GUID');
      console.log(`Expected GUID: ${createdGUID}`);
      console.log(`Material shows: ${materialText.match(/GUID: ([a-f0-9]{32})/)?.[1] || 'Not found'}`);
    }

    // Additional debug: Try to search for the shader
    console.log('\n6. Debug: Manually searching for TestDebugShader...');
    // This would need to be done through a custom endpoint or by checking the file system

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run tests
fetch(`${API_BASE}/health`)
  .then(() => runTests())
  .catch(() => {
    console.error('❌ Server is not running. Start it with: npm run start:http');
    process.exit(1);
  });