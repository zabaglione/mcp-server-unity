import net from 'net';
import { EventEmitter } from 'events';
import { Logger } from '../types/index.js';
import { TIMEOUT_CONFIG, getOperationTimeout, logTimeoutInfo } from '../config/timeout-config.js';

export interface UnityRequest {
  id: number;
  method: string;
  parameters: any;
}

export interface UnityResponse {
  id: number;
  result?: any;
  error?: string;
}

export interface UnityEvent {
  type: 'event';
  event: string;
  data: any;
}

/**
 * Unity 6 Bridge Client
 * Communicates with Unity Editor via Named Pipes/Domain Sockets
 */
export class UnityBridgeClient extends EventEmitter {
  private socket: net.Socket | null = null;
  private isConnected = false;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (result: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private buffer = '';

  constructor(private logger: Logger) {
    super();
    this.setupAutoReconnect();
  }

  /**
   * Connect to Unity Editor Bridge
   */
  async connect(): Promise<boolean> {
    if (this.isConnected) return true;

    return new Promise((resolve, reject) => {
      // Unity 6 bridge TCP connection
      const connection = this.getBridgeConnection();

      this.socket = net.createConnection(connection.port, connection.host, () => {
        this.isConnected = true;
        this.logger.info('Connected to Unity 6 Editor Bridge');
        
        // Configure socket for stability and large data transfers
        this.socket!.setTimeout(TIMEOUT_CONFIG.SOCKET_TIMEOUT);
        this.socket!.setKeepAlive(true, TIMEOUT_CONFIG.KEEP_ALIVE_INTERVAL);
        this.socket!.setNoDelay(false); // Enable Nagle's algorithm for large data
        
        this.setupSocketHandlers();
        this.emit('connected');
        resolve(true);
      });

      this.socket.on('error', (error: any) => {
        this.logger.debug(`Unity Bridge connection failed: ${error.message}`);
        this.isConnected = false;
        reject(error);
      });

      // Connection timeout
      setTimeout(() => {
        if (!this.isConnected && this.socket) {
          this.socket.destroy();
          reject(new Error('Unity Bridge connection timeout - ensure Unity Editor is running with MCP Bridge on port 23456'));
        }
      }, TIMEOUT_CONFIG.CONNECTION_TIMEOUT);
    });
  }

  /**
   * Get Unity Bridge connection options
   */
  private getBridgeConnection(): { port: number; host: string } {
    // Use TCP for cross-platform compatibility
    return {
      host: '127.0.0.1',
      port: 23456 // Same port as Unity MCP Bridge
    };
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on('data', (data) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.socket.on('close', () => {
      this.isConnected = false;
      this.logger.info('Unity Bridge connection closed');
      this.rejectAllPendingRequests('Connection closed');
      this.emit('disconnected');
    });

    this.socket.on('error', (error) => {
      this.logger.error('Unity Bridge socket error:', error);
      this.handleConnectionError();
    });
  }

  /**
   * Process incoming data buffer
   */
  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

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
  }

  /**
   * Handle incoming messages from Unity
   */
  private handleMessage(message: UnityResponse | UnityEvent): void {
    if ('id' in message) {
      // Response message
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);
        
        if (message.error) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve(message.result);
        }
      }
    } else if (message.type === 'event') {
      // Event message
      this.emit('unity-event', message.event, message.data);
      this.emit(message.event, message.data);
    }
  }

  /**
   * Send request to Unity and wait for response
   */
  async sendRequest(method: string, params: any = {}, timeoutMs?: number): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }

    // Use smart timeout based on operation type
    const operationTimeout = timeoutMs || getOperationTimeout(method);
    this.logger.info(logTimeoutInfo(method, operationTimeout));

    const requestId = this.requestId++;
    const request: UnityRequest = {
      id: requestId,
      method,
      parameters: params
    };

    return new Promise((resolve, reject) => {
      // Setup timeout with operation-specific duration
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Unity request timeout: ${method} (${operationTimeout}ms)`));
      }, operationTimeout);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      // Send request
      const requestJson = JSON.stringify(request) + '\n';
      
      // Check if socket is still writable
      if (!this.socket || this.socket.destroyed || !this.socket.writable) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(new Error('Socket is not writable'));
        return;
      }
      
      this.socket.write(requestJson, (error) => {
        if (error) {
          clearTimeout(timeout);
          this.pendingRequests.delete(requestId);
          reject(error);
        }
      });
    });
  }

  /**
   * Setup automatic reconnection
   */
  private setupAutoReconnect(): void {
    this.on('disconnected', () => {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      
      // Attempt to reconnect using configured interval
      this.reconnectTimer = setTimeout(async () => {
        try {
          await this.connect();
        } catch (error) {
          // Silent retry
        }
      }, TIMEOUT_CONFIG.RECONNECTION_INTERVAL);
    });
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(): void {
    this.isConnected = false;
    this.rejectAllPendingRequests('Connection error');
    // Don't emit disconnected here to avoid immediate reconnection
    // Let the 'close' event handle proper cleanup and reconnection
  }

  /**
   * Reject all pending requests
   */
  private rejectAllPendingRequests(reason: string): void {
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }

  /**
   * Check if connected to Unity
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from Unity
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.rejectAllPendingRequests('Disconnected');
  }

  /**
   * Get connection status info
   */
  getStatus(): { connected: boolean; pendingRequests: number } {
    return {
      connected: this.isConnected,
      pendingRequests: this.pendingRequests.size
    };
  }
}