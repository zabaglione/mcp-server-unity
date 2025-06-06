#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

const TEST_PROJECT_PATH = '/Users/zabaglione/Unity/MCPTest';
const TEST_MATERIAL = 'TestMaterial';

function runTool(toolName, params) {
  return new Promise((resolve, reject) => {
    const request = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params
      },
      id: 1
    };

    const child = spawn('npm', ['start'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let output = '';
    let error = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      error += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}: ${error}`));
      } else {
        try {
          const lines = output.trim().split('\n');
          const jsonLine = lines.find(line => line.includes('"jsonrpc"'));
          if (jsonLine) {
            const response = JSON.parse(jsonLine);
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
          } else {
            reject(new Error('No valid JSON response found'));
          }
        } catch (e) {
          reject(e);
        }
      }
    });

    child.stdin.write(JSON.stringify(request) + '\n');
    child.stdin.end();
  });
}

async function testMaterialFeatures() {
  console.log('=== Unity MCP Material Features Test ===\n');

  const tests = [];
  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Set project path
    console.log('1. Setting project path...');
    await runTool('project_setup_path', { projectPath: TEST_PROJECT_PATH });
    console.log('✅ Project path set');
    
    // Verify project is set
    const projectInfo = await runTool('project_read_info', {});
    console.log('✅ Project verified:', projectInfo.content[0].text.split('\n')[0] + '\n');
    passed++;

    // Test 2: Create a test material
    console.log('2. Creating test material...');
    await runTool('asset_create_material', { materialName: TEST_MATERIAL });
    console.log('✅ Material created\n');
    passed++;

    // Test 3: Read material properties
    console.log('3. Reading material properties...');
    const materialInfo = await runTool('asset_read_material', { materialName: TEST_MATERIAL });
    console.log('✅ Material read:', materialInfo.content[0].text.split('\n')[0] + '\n');
    passed++;

    // Test 4: Update material shader to URP
    console.log('4. Updating material shader to URP Lit...');
    await runTool('asset_update_material_shader', {
      materialName: TEST_MATERIAL,
      shaderName: 'Universal Render Pipeline/Lit'
    });
    console.log('✅ Shader updated\n');
    passed++;

    // Test 5: Update material properties
    console.log('5. Updating material properties...');
    await runTool('asset_update_material_properties', {
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
    console.log('✅ Properties updated\n');
    passed++;

    // Test 6: Read updated material
    console.log('6. Reading updated material...');
    const updatedInfo = await runTool('asset_read_material', { materialName: TEST_MATERIAL });
    console.log('✅ Updated material info:');
    console.log(updatedInfo.content[0].text.split('\n').slice(0, 6).join('\n') + '\n');
    passed++;

    // Test 7: Update script
    console.log('7. Testing script update...');
    const testScriptContent = `using UnityEngine;

public class UpdatedTestScript : MonoBehaviour
{
    // This script was updated by MCP
    void Start()
    {
        Debug.Log("Script updated successfully!");
    }
}`;

    // First create a test script
    await runTool('asset_create_script', {
      fileName: 'TestUpdateScript',
      content: 'public class TestUpdateScript : MonoBehaviour { }'
    });

    // Then update it
    await runTool('asset_update_script', {
      fileName: 'TestUpdateScript',
      content: testScriptContent,
      backup: true
    });
    console.log('✅ Script updated with backup\n');
    passed++;

    // Test 8: Batch convert materials
    console.log('8. Testing batch material conversion...');
    
    // Create additional test materials
    await runTool('asset_create_material', { materialName: 'BatchTest1' });
    await runTool('asset_create_material', { materialName: 'BatchTest2' });
    
    // Batch convert them
    await runTool('asset_batch_convert_materials', {
      materials: ['BatchTest1', 'BatchTest2'],
      targetShader: 'Universal Render Pipeline/Lit',
      propertyMapping: {
        '_Color': '_BaseColor',
        '_MainTex': '_BaseMap'
      }
    });
    console.log('✅ Batch conversion completed\n');
    passed++;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
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

  // Cleanup (optional)
  console.log('\nCleaning up test files...');
  try {
    const materialsPath = path.join(TEST_PROJECT_PATH, 'Assets/Materials');
    const testFiles = [
      path.join(materialsPath, TEST_MATERIAL + '.mat'),
      path.join(materialsPath, TEST_MATERIAL + '.mat.backup'),
      path.join(materialsPath, 'BatchTest1.mat'),
      path.join(materialsPath, 'BatchTest2.mat')
    ];
    
    for (const file of testFiles) {
      try {
        await fs.unlink(file);
        await fs.unlink(file + '.meta');
      } catch (e) {
        // Ignore if file doesn't exist
      }
    }

    // Clean up test script
    const scriptsPath = path.join(TEST_PROJECT_PATH, 'Assets/Scripts');
    await fs.unlink(path.join(scriptsPath, 'TestUpdateScript.cs')).catch(() => {});
    await fs.unlink(path.join(scriptsPath, 'TestUpdateScript.cs.backup')).catch(() => {});
    await fs.unlink(path.join(scriptsPath, 'TestUpdateScript.cs.meta')).catch(() => {});
    
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.log('⚠️  Some cleanup failed:', error.message);
  }

  process.exit(failed > 0 ? 1 : 0);
}

testMaterialFeatures().catch(console.error);