import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnityHttpAdapter } from '../../../src/adapters/unity-http-adapter.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('UnityHttpAdapter', () => {
  let adapter: UnityHttpAdapter;

  beforeEach(() => {
    adapter = new UnityHttpAdapter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('call', () => {
    it('should send POST request with correct format', async () => {
      // Arrange
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          success: true,
          result: { status: 'ok' }
        }),
        ok: true,
        status: 200
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Act
      const result = await adapter.call('ping');

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:23457/',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'ping' })
        })
      );
      expect(result).toEqual({ status: 'ok' });
    });

    it('should pass parameters correctly', async () => {
      // Arrange
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          success: true,
          result: { path: 'Assets/Scripts/Test.cs' }
        }),
        ok: true,
        status: 200
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const params = {
        fileName: 'Test',
        content: 'public class Test {}',
        folder: 'Assets/Scripts'
      };

      // Act
      await adapter.call('script/create', params);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:23457/',
        expect.objectContaining({
          body: JSON.stringify({ method: 'script/create', ...params })
        })
      );
    });

    it('should throw error when success is false', async () => {
      // Arrange
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          success: false,
          error: 'File not found'
        }),
        ok: true,
        status: 404
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Act & Assert
      await expect(adapter.call('script/read', { path: 'missing.cs' }))
        .rejects.toThrow('File not found');
    });

    it('should handle connection refused error', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      // Act & Assert
      await expect(adapter.call('ping'))
        .rejects.toThrow('Unity HTTP server is not running');
    });

    it('should handle timeout', async () => {
      // Arrange
      const abortError = new Error('The operation was aborted');
      (abortError as any).name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      // Act & Assert
      await expect(adapter.call('ping'))
        .rejects.toThrow('Request timeout');
    });
  });

  describe('isConnected', () => {
    it('should return true when ping succeeds', async () => {
      // Arrange
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          success: true,
          result: { status: 'ok' }
        }),
        ok: true,
        status: 200
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Act
      const connected = await adapter.isConnected();

      // Assert
      expect(connected).toBe(true);
    });

    it('should return false when ping fails', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      // Act
      const connected = await adapter.isConnected();

      // Assert
      expect(connected).toBe(false);
    });
  });

  describe('script operations', () => {
    it('should create script with correct parameters', async () => {
      // Arrange
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          success: true,
          result: { path: 'Assets/Scripts/Test.cs', guid: 'test-guid' }
        }),
        ok: true,
        status: 200
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Act
      const result = await adapter.createScript('Test', 'public class Test {}', 'Assets/Scripts');

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:23457/',
        expect.objectContaining({
          body: JSON.stringify({
            method: 'script/create',
            fileName: 'Test',
            content: 'public class Test {}',
            folder: 'Assets/Scripts'
          })
        })
      );
      expect(result).toEqual({ path: 'Assets/Scripts/Test.cs', guid: 'test-guid' });
    });

    it('should read script content', async () => {
      // Arrange
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          success: true,
          result: {
            path: 'Assets/Scripts/Test.cs',
            content: 'public class Test {}',
            guid: 'test-guid'
          }
        }),
        ok: true,
        status: 200
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Act
      const result = await adapter.readScript('Assets/Scripts/Test.cs');

      // Assert
      expect(result.content).toBe('public class Test {}');
    });

    it('should delete script', async () => {
      // Arrange
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          success: true,
          result: { message: 'Script deleted successfully' }
        }),
        ok: true,
        status: 200
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Act
      const result = await adapter.deleteScript('Assets/Scripts/Test.cs');

      // Assert
      expect(result.message).toBe('Script deleted successfully');
    });
  });

  describe('shader operations', () => {
    it('should create shader', async () => {
      // Arrange
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          success: true,
          result: { path: 'Assets/Shaders/Test.shader', guid: 'shader-guid' }
        }),
        ok: true,
        status: 200
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Act
      const result = await adapter.createShader('Test', 'Shader "Custom/Test" {}', 'Assets/Shaders');

      // Assert
      expect(result.path).toBe('Assets/Shaders/Test.shader');
    });
  });

  describe('project operations', () => {
    it('should get project info', async () => {
      // Arrange
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          success: true,
          result: {
            projectPath: '/Users/test/UnityProject',
            unityVersion: '2022.3.0f1',
            platform: 'StandaloneOSX'
          }
        }),
        ok: true,
        status: 200
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Act
      const result = await adapter.getProjectInfo();

      // Assert
      expect(result.unityVersion).toBe('2022.3.0f1');
    });
  });
});