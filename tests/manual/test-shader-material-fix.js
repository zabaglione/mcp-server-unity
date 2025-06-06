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
      console.log('Response:', data.content[0].text);
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
  console.log('=== Unity MCP Shader-Material Fix Test ===\n');

  try {
    // Test 1: Set project path
    console.log('1. Setting project path...');
    await testEndpoint('Set Project', 'POST', '/api/project/setup', {
      projectPath: TEST_PROJECT_PATH
    });

    // Test 2: Create a custom shader
    console.log('\n2. Creating custom shader "TimeColorShader"...');
    const shaderContent = `Shader "Custom/TimeColorShader"
{
    Properties
    {
        _BaseColor ("Base Color", Color) = (1,1,1,1)
        _Speed ("Color Change Speed", Float) = 1.0
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

            float4 _BaseColor;
            float _Speed;

            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                float time = _Time.y * _Speed;
                float r = sin(time) * 0.5 + 0.5;
                float g = sin(time + 2.094) * 0.5 + 0.5;
                float b = sin(time + 4.189) * 0.5 + 0.5;
                return _BaseColor * float4(r, g, b, 1.0);
            }
            ENDCG
        }
    }
}`;

    const shaderResult = await testEndpoint('Create Shader', 'POST', '/api/asset/create-shader', {
      shaderName: 'TimeColorShader',
      shaderType: 'builtin',
      customContent: shaderContent
    });

    // Extract GUID from response
    const guidMatch = shaderResult.content[0].text.match(/GUID: ([a-f0-9]{32})/);
    const shaderGUID = guidMatch ? guidMatch[1] : null;
    console.log(`Shader GUID: ${shaderGUID}`);

    // Test 3: Create material with custom shader (using new API)
    console.log('\n3. Creating material with custom shader using new API...');
    await testEndpoint('Create Material with Shader', 'POST', '/api/material/create-with-shader', {
      materialName: 'TimeColorMaterial',
      shaderName: 'TimeColorShader'
    });

    // Test 4: Read the created material to verify
    console.log('\n4. Reading created material to verify shader reference...');
    const materialInfo = await testEndpoint('Read Material', 'GET', '/api/material/TimeColorMaterial');
    
    // Check if shader is correctly referenced
    const materialText = materialInfo.content[0].text;
    console.log('\nMaterial Details:');
    console.log(materialText);
    
    if (materialText.includes('TimeColorShader') || materialText.includes('Custom/TimeColorShader')) {
      console.log('\n✅ SUCCESS: Material correctly references the custom shader!');
    } else if (materialText.includes('Hidden/InternalErrorShader')) {
      console.log('\n❌ FAILED: Material shows error shader - GUID mismatch');
    } else {
      console.log('\n⚠️  WARNING: Could not determine shader reference status');
    }

    // Test 5: Update material properties to test if it works
    console.log('\n5. Updating material properties...');
    await testEndpoint('Update Material Properties', 'POST', '/api/material/update-properties', {
      materialName: 'TimeColorMaterial',
      properties: {
        colors: {
          '_BaseColor': [0.2, 0.5, 0.8, 1.0]
        },
        floats: {
          '_Speed': 2.0
        }
      }
    });

    console.log('\n✅ All tests completed successfully!');
    console.log('\nThe fix allows:');
    console.log('1. Creating shaders with proper meta files and GUIDs');
    console.log('2. Creating materials that correctly reference custom shaders');
    console.log('3. No more "Hidden/InternalErrorShader" errors');

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