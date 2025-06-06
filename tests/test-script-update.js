#!/usr/bin/env node
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';
const TEST_PROJECT_PATH = '/Users/zabaglione/Unity/MCPTest';
const TEST_SCRIPT = 'TestUpdateScript';

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
  console.log('=== Unity MCP Script Update Test ===\n');

  try {
    // Test 1: Set project path
    console.log('1. Setting project path...');
    await testEndpoint('Set Project', 'POST', '/api/project/setup', {
      projectPath: TEST_PROJECT_PATH
    });

    // Test 2: Create a test script
    console.log('\n2. Creating test script...');
    const originalContent = `using UnityEngine;

public class TestUpdateScript : MonoBehaviour
{
    void Start()
    {
        Debug.Log("Original script");
    }
}`;

    await testEndpoint('Create Script', 'POST', '/api/asset/create-script', {
      fileName: TEST_SCRIPT,
      content: originalContent
    });

    // Test 3: Update the script
    console.log('\n3. Updating script content...');
    const updatedContent = `using UnityEngine;

public class TestUpdateScript : MonoBehaviour
{
    // This script was updated by MCP
    public float speed = 5.0f;
    public bool enableLogging = true;
    
    void Start()
    {
        if (enableLogging)
        {
            Debug.Log("Script updated successfully!");
            Debug.Log($"Speed: {speed}");
        }
    }
    
    void Update()
    {
        // New update method added
        transform.Rotate(Vector3.up * speed * Time.deltaTime);
    }
}`;

    const updateResult = await testEndpoint('Update Script', 'PUT', '/api/asset/update-script', {
      fileName: TEST_SCRIPT,
      content: updatedContent,
      backup: true
    });

    console.log('Update result:', updateResult.content[0].text);

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests().catch(console.error);