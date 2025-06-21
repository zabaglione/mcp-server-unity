#!/usr/bin/env node

import { UnityMCPServer } from './dist/index.js';
import { ConsoleLogger } from './dist/utils/logger.js';

async function testScriptUpdate() {
  const logger = new ConsoleLogger('[Test]');
  const server = new UnityMCPServer(logger);
  
  try {
    // Set project path
    await server.handleToolCall({
      name: 'project_setup_path',
      arguments: { projectPath: '/Users/zabaglione/Unity/CCExtension' }
    });
    
    // Create a test script
    logger.info('Creating test script...');
    await server.handleToolCall({
      name: 'asset_create_script',
      arguments: {
        fileName: 'TestUpdateScript',
        content: `using UnityEngine;

public class TestUpdateScript : MonoBehaviour
{
    void Start()
    {
        Debug.Log("Original version");
    }
}`
      }
    });
    
    // Read the created script
    logger.info('Reading created script...');
    const readResult = await server.handleToolCall({
      name: 'asset_read_script',
      arguments: { fileName: 'TestUpdateScript' }
    });
    logger.info('Original content:', readResult.content[0].text);
    
    // Update the script
    logger.info('Updating script...');
    await server.handleToolCall({
      name: 'asset_update_script',
      arguments: {
        fileName: 'TestUpdateScript',
        content: `using UnityEngine;

public class TestUpdateScript : MonoBehaviour
{
    void Start()
    {
        Debug.Log("Updated version!");
    }
    
    void Update()
    {
        // New method added
    }
}`
      }
    });
    
    // Read the updated script
    logger.info('Reading updated script...');
    const updatedResult = await server.handleToolCall({
      name: 'asset_read_script',
      arguments: { fileName: 'TestUpdateScript' }
    });
    logger.info('Updated content:', updatedResult.content[0].text);
    
    // Test partial update if supported
    if (process.env.USE_OPTIMIZED_SERVICES === 'true') {
      logger.info('Testing partial update...');
      await server.handleToolCall({
        name: 'asset_update_script_partial',
        arguments: {
          fileName: 'TestUpdateScript',
          patches: [{
            start: 108,
            end: 123,
            replacement: 'Updated version 2!'
          }]
        }
      });
      
      const partialResult = await server.handleToolCall({
        name: 'asset_read_script',
        arguments: { fileName: 'TestUpdateScript' }
      });
      logger.info('After partial update:', partialResult.content[0].text);
    }
    
  } catch (error) {
    logger.error('Test failed:', error);
  }
}

// Add handleToolCall method to server for testing
UnityMCPServer.prototype.handleToolCall = async function(request) {
  const handler = this.server._requestHandlers.get('tools/call');
  if (!handler) {
    throw new Error('Tool call handler not found');
  }
  
  return await handler({ method: 'tools/call', params: request });
};

testScriptUpdate().catch(console.error);