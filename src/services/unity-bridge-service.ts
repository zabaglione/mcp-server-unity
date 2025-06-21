import { BaseService } from './base-service.js';
import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import net from 'net';
import { EventEmitter } from 'events';

/**
 * Unity 6 Bridge Service
 * Communicates with Unity Editor via TCP/Named Pipes for direct API access
 */
export class UnityBridgeService extends BaseService {
  private socket: net.Socket | null = null;
  private eventEmitter = new EventEmitter();
  private isConnected = false;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (result: any) => void;
    reject: (error: Error) => void;
  }>();

  constructor(logger: Logger) {
    super(logger);
  }

  /**
   * Connect to Unity Editor Bridge
   */
  async connect(): Promise<boolean> {
    if (this.isConnected) return true;

    return new Promise((resolve, reject) => {
      // Unity 6 uses named pipes on Windows, domain sockets on Mac/Linux
      const pipeName = process.platform === 'win32' 
        ? '\\\\.\\pipe\\Unity.MCPBridge'
        : '/tmp/Unity.MCPBridge.sock';

      this.socket = net.createConnection(pipeName, () => {
        this.isConnected = true;
        this.logger.info('Connected to Unity Editor Bridge');
        this.setupSocketHandlers();
        resolve(true);
      });

      this.socket.on('error', (error) => {
        this.logger.error('Unity Bridge connection error:', error);
        this.isConnected = false;
        reject(error);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Unity Bridge connection timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketHandlers(): void {
    if (!this.socket) return;

    let buffer = '';

    this.socket.on('data', (data) => {
      buffer += data.toString();
      
      // Process complete messages (newline delimited JSON)
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            this.handleMessage(message);
          } catch (error) {
            this.logger.error('Failed to parse Unity message:', error);
          }
        }
      }
    });

    this.socket.on('close', () => {
      this.isConnected = false;
      this.logger.info('Unity Bridge connection closed');
      this.rejectAllPendingRequests('Connection closed');
    });
  }

  /**
   * Handle incoming messages from Unity
   */
  private handleMessage(message: any): void {
    if (message.type === 'response' && message.requestId !== undefined) {
      const pending = this.pendingRequests.get(message.requestId);
      if (pending) {
        this.pendingRequests.delete(message.requestId);
        if (message.error) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve(message.result);
        }
      }
    } else if (message.type === 'event') {
      this.eventEmitter.emit(message.event, message.data);
    }
  }

  /**
   * Send request to Unity and wait for response
   */
  private async sendRequest(method: string, params: any): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }

    const requestId = this.requestId++;
    const request = {
      id: requestId,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });

      this.socket!.write(JSON.stringify(request) + '\n', (error) => {
        if (error) {
          this.pendingRequests.delete(requestId);
          reject(error);
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 30000);
    });
  }

  /**
   * Reject all pending requests
   */
  private rejectAllPendingRequests(reason: string): void {
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }

  /**
   * Unity AssetDatabase Operations
   */

  async createAsset(content: string, path: string, type: string): Promise<CallToolResult> {
    try {
      await this.sendRequest('AssetDatabase.CreateAsset', {
        content,
        path,
        type
      });

      return {
        content: [{
          type: 'text',
          text: `Asset created via Unity API: ${path}`
        }]
      };
    } catch (error) {
      throw new Error(`Failed to create asset: ${error}`);
    }
  }

  async importAsset(path: string, options?: any): Promise<CallToolResult> {
    try {
      await this.sendRequest('AssetDatabase.ImportAsset', {
        path,
        options: options || {}
      });

      return {
        content: [{
          type: 'text',
          text: `Asset imported: ${path}`
        }]
      };
    } catch (error) {
      throw new Error(`Failed to import asset: ${error}`);
    }
  }

  async deleteAsset(path: string): Promise<CallToolResult> {
    try {
      const result = await this.sendRequest('AssetDatabase.DeleteAsset', { path });
      
      if (!result.success) {
        throw new Error(result.error || 'Delete failed');
      }

      return {
        content: [{
          type: 'text',
          text: `Asset deleted via Unity API: ${path}`
        }]
      };
    } catch (error) {
      throw new Error(`Failed to delete asset: ${error}`);
    }
  }

  async moveAsset(oldPath: string, newPath: string): Promise<CallToolResult> {
    try {
      const result = await this.sendRequest('AssetDatabase.MoveAsset', {
        oldPath,
        newPath
      });

      if (result.error) {
        throw new Error(result.error);
      }

      return {
        content: [{
          type: 'text',
          text: `Asset moved from ${oldPath} to ${newPath}`
        }]
      };
    } catch (error) {
      throw new Error(`Failed to move asset: ${error}`);
    }
  }

  /**
   * Unity Editor Operations
   */

  async executeMenuItem(menuPath: string): Promise<CallToolResult> {
    try {
      await this.sendRequest('EditorApplication.ExecuteMenuItem', { menuPath });
      
      return {
        content: [{
          type: 'text',
          text: `Executed menu item: ${menuPath}`
        }]
      };
    } catch (error) {
      throw new Error(`Failed to execute menu item: ${error}`);
    }
  }

  async compileScripts(): Promise<CallToolResult> {
    try {
      await this.sendRequest('CompilationPipeline.RequestScriptCompilation', {});
      
      return {
        content: [{
          type: 'text',
          text: 'Script compilation requested via Unity API'
        }]
      };
    } catch (error) {
      throw new Error(`Failed to compile scripts: ${error}`);
    }
  }

  /**
   * Advanced Unity 6 Features
   */

  async createScriptWithTemplate(
    className: string,
    namespaceName: string,
    path: string,
    templateType: string
  ): Promise<CallToolResult> {
    try {
      // Unity 6's new template system
      await this.sendRequest('CodeGeneration.CreateFromTemplate', {
        className,
        namespaceName,
        path,
        templateType,
        unityVersion: '6000.0'
      });

      return {
        content: [{
          type: 'text',
          text: `Script created using Unity 6 template: ${path}`
        }]
      };
    } catch (error) {
      throw new Error(`Failed to create script from template: ${error}`);
    }
  }

  async analyzeCodeContext(scriptPath: string): Promise<any> {
    try {
      // Unity 6's code analysis API
      const result = await this.sendRequest('CodeAnalysis.AnalyzeScript', {
        scriptPath,
        includeReferences: true,
        includeUsages: true
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to analyze code context: ${error}`);
    }
  }

  /**
   * Listen for Unity events
   */
  on(event: string, handler: (data: any) => void): void {
    this.eventEmitter.on(event, handler);
  }

  /**
   * Disconnect from Unity
   */
  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
    this.isConnected = false;
    this.rejectAllPendingRequests('Disconnected');
  }
}