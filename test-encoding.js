// Test script to verify character encoding
import { UnityHttpAdapter } from './build/adapters/unity-http-adapter.js';

async function testEncoding() {
  const adapter = new UnityHttpAdapter();
  
  try {
    // Test with Japanese characters
    const testContent = `using UnityEngine;

public class TestScript : MonoBehaviour
{
    // 日本語のコメント
    private string message = "こんにちは世界！";
    
    void Start()
    {
        Debug.Log("テスト: " + message);
    }
}`;

    console.log('Creating script with Japanese characters...');
    const result = await adapter.createScript('TestEncodingScript', testContent, 'Assets/Scripts');
    console.log('Script created:', result);
    
    // Read it back
    console.log('\nReading script back...');
    const readResult = await adapter.readScript(result.path);
    console.log('Content matches:', readResult.content === testContent);
    console.log('First line:', readResult.content.split('\n')[0]);
    console.log('Japanese comment line:', readResult.content.split('\n')[4]);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testEncoding();