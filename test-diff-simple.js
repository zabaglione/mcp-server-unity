#!/usr/bin/env node

import { UnityBridgeClient } from './build/unity-bridge/unity-bridge-client.js';
import { ScriptAPI } from './build/api/script/script-api.js';
import { ScriptDiffAPI } from './build/api/script/script-diff-api.js';
import { ConsoleLogger } from './build/utils/logger.js';

async function testDiffFunctionality() {
  console.log('🧪 Testing Unity MCP Diff Functionality\n');
  
  const logger = new ConsoleLogger('[Test]');
  const bridge = new UnityBridgeClient(logger);
  const scriptAPI = new ScriptAPI(bridge, logger);
  const diffAPI = new ScriptDiffAPI(bridge, logger);
  
  try {
    // Connect to Unity
    console.log('📡 Connecting to Unity...');
    await bridge.connect();
    console.log('✅ Connected\n');
    
    // Test 1: Create a test file
    console.log('📝 Test 1: Creating test file...');
    const testContent = `using UnityEngine;

public class TestDiffScript : MonoBehaviour {
    private int health = 100;
    private float speed = 5f;
    
    void Start() {
        Debug.Log("Player started");
    }
    
    void Update() {
        transform.Translate(Vector3.forward * speed * Time.deltaTime);
    }
}`;
    
    await scriptAPI.create({
      fileName: 'TestDiffScript',
      content: testContent,
      folder: 'Assets/Scripts'
    });
    console.log('✅ Test file created\n');
    
    // Test 2: Create diff between two contents
    console.log('📊 Test 2: Creating diff...');
    const modifiedContent = testContent.replace('speed = 5f', 'speed = 10f').replace('health = 100', 'health = 200');
    
    const diffResult = await diffAPI.createDiff(
      testContent,
      modifiedContent,
      { contextLines: 3 }
    );
    
    console.log('Generated diff:');
    console.log(diffResult.content[0].text);
    console.log();
    
    // Test 3: Apply diff with dry run
    console.log('🔄 Test 3: Applying diff (dry run)...');
    const diff = `@@ -4,2 +4,2 @@
-    private int health = 100;
-    private float speed = 5f;
+    private int health = 200;
+    private float speed = 10f;`;
    
    const applyResult = await diffAPI.updateDiff(
      'Assets/Scripts/TestDiffScript.cs',
      diff,
      { dryRun: true }
    );
    
    console.log('Dry run result:');
    console.log(applyResult.content[0].text);
    console.log();
    
    // Test 4: Validate diff
    console.log('✔️ Test 4: Validating diff...');
    const validationResult = await diffAPI.validateDiff(
      'Assets/Scripts/TestDiffScript.cs',
      diff
    );
    
    console.log('Validation result:');
    console.log(validationResult.content[0].text);
    console.log();
    
    // Test 5: Large file test
    console.log('📏 Test 5: Testing large file handling...');
    let largeContent = 'using UnityEngine;\n\npublic class LargeScript : MonoBehaviour {\n';
    for (let i = 0; i < 1000; i++) {
      largeContent += `    public void Method${i}() { Debug.Log("Method ${i}"); }\n`;
    }
    largeContent += '}\n';
    
    const largeDiffStart = Date.now();
    const largeDiff = await diffAPI.createDiff(
      largeContent,
      largeContent.replace(/Method (\d+)/g, 'UpdatedMethod $1'),
      { contextLines: 1 }
    );
    const largeDiffTime = Date.now() - largeDiffStart;
    
    console.log(`✅ Large diff created in ${largeDiffTime}ms`);
    console.log(`   Size: ${largeDiff.content[0].text.length} characters`);
    console.log();
    
    // Test 6: Apply actual diff
    console.log('💾 Test 6: Applying diff (real)...');
    const realApplyResult = await diffAPI.updateDiff(
      'Assets/Scripts/TestDiffScript.cs',
      diff,
      { 
        createBackup: true,
        validateSyntax: true
      }
    );
    
    console.log('Apply result:');
    console.log(realApplyResult.content[0].text);
    console.log();
    
    // Cleanup
    console.log('🧹 Cleaning up...');
    await scriptAPI.delete('Assets/Scripts/TestDiffScript.cs');
    console.log('✅ Test file deleted\n');
    
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await bridge.disconnect();
  }
}

// Run tests
testDiffFunctionality().catch(console.error);