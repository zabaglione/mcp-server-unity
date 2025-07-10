// Using Node.js 18+ built-in fetch

export interface UnityHttpAdapterOptions {
  url?: string;
  timeout?: number;
}

export interface UnityResponse {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * HTTP adapter for Unity MCP Server
 * Provides a clean interface to communicate with Unity HTTP server
 */
export class UnityHttpAdapter {
  private url: string;
  private timeout: number;

  constructor(options: UnityHttpAdapterOptions = {}) {
    this.url = options.url || 'http://localhost:23457/';
    this.timeout = options.timeout || 15000;
  }

  /**
   * Call a method on the Unity server
   */
  async call(method: string, params: Record<string, any> = {}): Promise<any> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, ...params }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const result = await response.json() as UnityResponse;
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }

      return result.result;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      if (error.message?.includes('ECONNREFUSED')) {
        throw new Error('Unity HTTP server is not running');
      }
      throw error;
    }
  }

  /**
   * Check if Unity server is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      await this.call('ping');
      return true;
    } catch {
      return false;
    }
  }

  // Script operations
  async createScript(fileName: string, content?: string, folder?: string): Promise<any> {
    return this.call('script/create', { fileName, content, folder });
  }

  async readScript(path: string): Promise<any> {
    return this.call('script/read', { path });
  }

  async deleteScript(path: string): Promise<any> {
    return this.call('script/delete', { path });
  }

  // Shader operations
  async createShader(name: string, content?: string, folder?: string): Promise<any> {
    return this.call('shader/create', { name, content, folder });
  }

  async readShader(path: string): Promise<any> {
    return this.call('shader/read', { path });
  }

  async deleteShader(path: string): Promise<any> {
    return this.call('shader/delete', { path });
  }

  // Project operations
  async getProjectInfo(): Promise<any> {
    return this.call('project/info');
  }
}