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
    const startTime = Date.now();
    console.error(`[Unity HTTP] Calling method: ${method}`);
    
    const maxRetries = 3;
    let lastError: any;
    
    for (let retry = 0; retry < maxRetries; retry++) {
      if (retry > 0) {
        console.error(`[Unity HTTP] Retry ${retry}/${maxRetries - 1} for method: ${method}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retry)); // Exponential backoff
      }
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.error(`[Unity HTTP] Request timeout after ${this.timeout}ms for method: ${method}`);
          controller.abort();
        }, this.timeout);

        const response = await fetch(this.url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json; charset=utf-8',
            'Accept': 'application/json; charset=utf-8'
          },
          body: JSON.stringify({ method, ...params }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        const elapsed = Date.now() - startTime;
        console.error(`[Unity HTTP] Response received in ${elapsed}ms for method: ${method}`);

        const result = await response.json() as UnityResponse;
        
        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }

        return result.result;
        
      } catch (error: any) {
        lastError = error;
        
        if (error.name === 'AbortError') {
          lastError = new Error('Request timeout');
        } else if (error.message?.includes('ECONNREFUSED')) {
          lastError = new Error('Unity HTTP server is not running');
        } else if (error.message?.includes('Failed to fetch')) {
          lastError = new Error('Failed to connect to Unity HTTP server');
        }
        
        console.error(`[Unity HTTP] Error on attempt ${retry + 1}: ${lastError.message}`);
        
        // Don't retry on certain errors
        if (error.message?.includes('Method not found')) {
          throw error;
        }
      }
    }
    
    // All retries failed
    throw lastError || new Error('Unknown error after retries');
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
  
  async applyDiff(path: string, diff: string, options?: any): Promise<any> {
    return this.call('script/applyDiff', { path, diff, options });
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