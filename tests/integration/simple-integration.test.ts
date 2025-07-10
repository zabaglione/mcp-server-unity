import { describe, it, expect, beforeAll, afterAll, test } from 'vitest';
import { spawn } from 'child_process';
import { UnityHttpAdapter } from '../../src/adapters/unity-http-adapter.js';

describe('Unity MCP Integration Tests', () => {
  let adapter: UnityHttpAdapter;

  beforeAll(() => {
    adapter = new UnityHttpAdapter();
  });

  describe('Connection', () => {
    it('should check connection status', async () => {
      // This test will pass if Unity is running with the HTTP server
      // or fail gracefully if not
      const connected = await adapter.isConnected();
      console.log('Unity connection status:', connected);
      expect(typeof connected).toBe('boolean');
    });
  });

  describe('Script Operations (if connected)', () => {
    it.skipIf(async () => !(await adapter.isConnected()))('should create, read, and delete a script', async () => {
      // Test will only run if connected

      // Create
      const createResult = await adapter.createScript(
        'IntegrationTestScript',
        'public class IntegrationTestScript : MonoBehaviour { }',
        'Assets/Scripts/Tests'
      );
      expect(createResult.path).toContain('IntegrationTestScript.cs');
      expect(createResult.guid).toBeTruthy();

      // Read
      const readResult = await adapter.readScript(createResult.path);
      expect(readResult.content).toContain('IntegrationTestScript');
      expect(readResult.path).toBe(createResult.path);

      // Delete
      const deleteResult = await adapter.deleteScript(createResult.path);
      expect(deleteResult.message).toContain('successfully');
    });
  });

  describe('Shader Operations (if connected)', () => {
    it.skipIf(async () => !(await adapter.isConnected()))('should create, read, and delete a shader', async () => {

      // Create
      const createResult = await adapter.createShader(
        'IntegrationTestShader',
        'Shader "Custom/IntegrationTest" { SubShader { Pass { } } }',
        'Assets/Shaders/Tests'
      );
      expect(createResult.path).toContain('IntegrationTestShader.shader');

      // Read
      const readResult = await adapter.readShader(createResult.path);
      expect(readResult.content).toContain('IntegrationTest');

      // Delete
      const deleteResult = await adapter.deleteShader(createResult.path);
      expect(deleteResult.message).toContain('successfully');
    });
  });

  describe('Project Operations (if connected)', () => {
    it.skipIf(async () => !(await adapter.isConnected()))('should get project info', async () => {

      const info = await adapter.getProjectInfo();
      expect(info.projectPath).toBeTruthy();
      expect(info.unityVersion).toMatch(/\d{4}\.\d+\.\d+/);
      expect(info.platform).toBeTruthy();
    });
  });
});

describe('MCP Server Integration', () => {
  let mcpProcess: any;

  beforeAll(async () => {
    // Start MCP server
    mcpProcess = spawn('node', ['build/simple-index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(() => {
    mcpProcess?.kill();
  });

  it('should start without errors', () => {
    expect(mcpProcess.pid).toBeTruthy();
  });

  it('should respond to MCP protocol', async () => {
    // Send initialize request
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {}
      }
    };

    mcpProcess.stdin.write(JSON.stringify(request) + '\n');

    // Wait for response with timeout
    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for response'));
      }, 5000);
      
      mcpProcess.stdout.once('data', (data: Buffer) => {
        clearTimeout(timeout);
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              resolve(parsed);
              break;
            } catch {
              // Continue if not JSON
            }
          }
        }
      });
      
      mcpProcess.stderr.once('data', (data: Buffer) => {
        console.error('MCP server error:', data.toString());
      });
    });

    console.log('MCP response:', response);
    expect(response).toBeDefined();
    expect((response as any).jsonrpc).toBe('2.0');
  });
});