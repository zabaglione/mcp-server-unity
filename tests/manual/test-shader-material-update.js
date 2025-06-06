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
  console.log('=== Shader and Material Update Feature Test ===\n');

  try {
    // Set project
    await testEndpoint('Set Project', 'POST', '/api/project/setup', {
      projectPath: TEST_PROJECT_PATH
    });

    // Test 1: List existing shaders
    console.log('\n1. Listing existing shaders...');
    const shaderList = await testEndpoint('List Shaders', 'GET', '/api/shader/list');
    console.log(shaderList.content[0].text);

    // Test 2: Create a test shader
    console.log('\n2. Creating test shader...');
    const originalShaderContent = `Shader "Custom/UpdateTestShader"
{
    Properties
    {
        _Color ("Main Color", Color) = (1,1,1,1)
        _MainTex ("Base (RGB)", 2D) = "white" {}
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
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
            };

            sampler2D _MainTex;
            float4 _MainTex_ST;
            float4 _Color;

            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                fixed4 col = tex2D(_MainTex, i.uv) * _Color;
                return col;
            }
            ENDCG
        }
    }
}`;

    await testEndpoint('Create Shader', 'POST', '/api/asset/create-shader', {
      shaderName: 'UpdateTestShader',
      shaderType: 'builtin',
      customContent: originalShaderContent
    });

    // Test 3: Read shader content
    console.log('\n3. Reading shader content...');
    const shaderContent = await testEndpoint('Read Shader', 'POST', '/api/shader/read', {
      shaderName: 'UpdateTestShader'
    });
    console.log('Original shader properties:', shaderContent.content[0].text.match(/Properties[\s\S]*?}/)?.[0]);

    // Test 4: Update shader with new properties
    console.log('\n4. Updating shader with new properties...');
    const updatedShaderContent = originalShaderContent.replace(
      '_Color ("Main Color", Color) = (1,1,1,1)',
      '_Color ("Main Color", Color) = (1,0,0,1)\n        _Emission ("Emission", Color) = (0,0,0,0)'
    );

    await testEndpoint('Update Shader', 'POST', '/api/shader/update', {
      shaderName: 'UpdateTestShader',
      content: updatedShaderContent
    });

    // Test 5: Create material with the shader
    console.log('\n5. Creating material with updated shader...');
    await testEndpoint('Create Material with Shader', 'POST', '/api/material/create-with-shader', {
      materialName: 'UpdateTestMaterial',
      shaderName: 'Custom/UpdateTestShader'
    });

    // Test 6: List materials
    console.log('\n6. Listing materials...');
    const materialList = await testEndpoint('List Materials', 'GET', '/api/asset/materials');
    console.log('Materials found:', materialList.content[0].text.split('\n').filter(l => l.includes('UpdateTest')).join('\n'));

    // Test 7: Update material properties
    console.log('\n7. Updating material properties...');
    await testEndpoint('Update Material Properties', 'POST', '/api/material/update-properties', {
      materialName: 'UpdateTestMaterial',
      properties: {
        colors: {
          '_Color': [0, 1, 0, 1],
          '_Emission': [0.5, 0.5, 0, 1]
        }
      }
    });

    // Test 8: Clone material
    console.log('\n8. Cloning material...');
    await testEndpoint('Clone Material', 'POST', '/api/material/clone', {
      sourceMaterialName: 'UpdateTestMaterial',
      targetMaterialName: 'UpdateTestMaterial_Clone'
    });

    // Test 9: Read cloned material
    console.log('\n9. Reading cloned material...');
    const clonedMaterial = await testEndpoint('Read Material', 'GET', '/api/material/UpdateTestMaterial_Clone');
    console.log('Cloned material:', clonedMaterial.content[0].text);

    // Test 10: Update entire material content
    console.log('\n10. Updating entire material content...');
    const materialYAML = `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!21 &2100000
Material:
  serializedVersion: 6
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_Name: UpdateTestMaterial
  m_Shader: {fileID: 4800000, guid: ${clonedMaterial.content[0].text.match(/GUID: ([a-f0-9]{32})/)?.[1] || '00000000000000000000000000000000'}, type: 3}
  m_ShaderKeywords: 
  m_LightmapFlags: 4
  m_EnableInstancingVariants: 1
  m_DoubleSidedGI: 0
  m_CustomRenderQueue: -1
  stringTagMap: {}
  disabledShaderPasses: []
  m_SavedProperties:
    serializedVersion: 3
    m_TexEnvs:
    - _MainTex:
        m_Texture: {fileID: 0}
        m_Scale: {x: 1, y: 1}
        m_Offset: {x: 0, y: 0}
    m_Floats: []
    m_Colors:
    - _Color: {r: 1, g: 0, b: 1, a: 1}
    - _Emission: {r: 1, g: 1, b: 0, a: 1}`;

    await testEndpoint('Update Material', 'POST', '/api/material/update', {
      materialName: 'UpdateTestMaterial',
      content: materialYAML
    });

    console.log('\n✅ All tests completed successfully!');
    console.log('\nNew features tested:');
    console.log('- asset_update_shader: Update shader content');
    console.log('- asset_read_shader: Read shader content');
    console.log('- asset_list_materials: List all materials');
    console.log('- asset_update_material: Update entire material content');
    console.log('- asset_clone_material: Clone material with new name');

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