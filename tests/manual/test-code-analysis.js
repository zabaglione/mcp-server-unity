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
  console.log('=== Unity MCP Code Analysis Features Test ===\n');

  try {
    // Test 1: Set project path
    console.log('1. Setting project path...');
    await testEndpoint('Set Project', 'POST', '/api/project/setup', {
      projectPath: TEST_PROJECT_PATH
    });

    // Test 2: Create test scripts with duplicate class names
    console.log('\n2. Creating test scripts with duplicate class names...');
    
    // Create PlayerController in Controllers folder
    await testEndpoint('Create PlayerController 1', 'POST', '/api/asset/create-script', {
      fileName: 'PlayerController',
      folder: 'Controllers',
      content: `using UnityEngine;

public class PlayerController : MonoBehaviour
{
    public float speed = 5.0f;
    
    void Update()
    {
        // Player movement logic
    }
}`
    });

    // Create another PlayerController in UI folder
    await testEndpoint('Create PlayerController 2', 'POST', '/api/asset/create-script', {
      fileName: 'PlayerController',
      folder: 'UI',
      content: `using UnityEngine;

public class PlayerController : MonoBehaviour
{
    // UI controller with same name!
    public void ShowPlayerUI()
    {
        Debug.Log("Showing player UI");
    }
}`
    });

    // Test 3: Detect duplicate classes
    console.log('\n3. Detecting duplicate class names...');
    const duplicates = await testEndpoint('Detect Duplicates', 'GET', '/api/code/detect-duplicates');
    console.log(duplicates.content[0].text);

    // Test 4: Test file diff
    console.log('\n4. Testing file diff analysis...');
    const newContent = `using UnityEngine;

namespace Controllers
{
    public class PlayerController : MonoBehaviour
    {
        public float speed = 10.0f;  // Changed from 5.0f
        public float jumpHeight = 2.0f;  // New property
        
        void Update()
        {
            // Player movement logic
            HandleMovement();  // New method call
        }
        
        void HandleMovement()  // New method
        {
            // Movement implementation
        }
    }
}`;

    const diff = await testEndpoint('Analyze Diff', 'POST', '/api/code/analyze-diff', {
      fileName: 'PlayerController',
      newContent: newContent
    });
    console.log('\nDiff analysis:', diff.content[0].text.split('\n').slice(0, 10).join('\n') + '...');

    // Test 5: Suggest namespace
    console.log('\n5. Getting namespace suggestion...');
    const namespace1 = await testEndpoint('Suggest Namespace', 'GET', '/api/code/suggest-namespace/Controllers/PlayerController');
    console.log(namespace1.content[0].text.split('\n').slice(0, 3).join('\n'));

    // Test 6: Apply namespace to fix duplicates
    console.log('\n6. Applying namespaces to fix duplicates...');
    await testEndpoint('Apply Namespace 1', 'POST', '/api/code/apply-namespace', {
      fileName: 'Controllers/PlayerController',
      namespace: 'MCPTest.Controllers'
    });

    await testEndpoint('Apply Namespace 2', 'POST', '/api/code/apply-namespace', {
      fileName: 'UI/PlayerController',
      namespace: 'MCPTest.UI'
    });

    // Test 7: Verify duplicates are resolved
    console.log('\n7. Verifying duplicates are resolved...');
    const duplicatesAfter = await testEndpoint('Detect Duplicates After', 'GET', '/api/code/detect-duplicates');
    console.log(duplicatesAfter.content[0].text.split('\n').slice(0, 3).join('\n'));

    // Test 8: Install compilation helper
    console.log('\n8. Installing compilation helper...');
    const helperResult = await testEndpoint('Install Helper', 'POST', '/api/compile/install-helper');
    console.log(helperResult.content[0].text.split('\n').slice(0, 5).join('\n'));

    // Test 9: Get compilation status
    console.log('\n9. Getting compilation status...');
    const status = await testEndpoint('Compilation Status', 'GET', '/api/compile/status');
    console.log(status.content[0].text);

    // Test 10: Get compilation errors (with intentional error)
    console.log('\n10. Creating script with error and checking compilation...');
    await testEndpoint('Create Error Script', 'POST', '/api/asset/create-script', {
      fileName: 'ErrorTest',
      content: `using UnityEngine;

public class ErrorTest : MonoBehaviour
{
    void Start()
    {
        // Intentional error: undefined variable
        Debug.Log(undefinedVariable);
        
        // Intentional error: wrong method name
        transform.Moove(Vector3.forward);
    }
}`
    });

    const errors = await testEndpoint('Get Compilation Errors', 'GET', '/api/compile/errors');
    console.log('\nCompilation errors:', errors.content[0].text.split('\n').slice(0, 20).join('\n'));

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