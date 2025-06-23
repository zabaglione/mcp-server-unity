/**
 * Unity MCP Bridge - Timeout Configuration
 * Centralized timeout settings for all operations
 */

export const TIMEOUT_CONFIG = {
  // Default timeouts (in milliseconds)
  DEFAULT_OPERATION: 360000,    // 6 minutes - for most operations
  QUICK_OPERATION: 60000,       // 1 minute - for simple operations (list, read small files)
  LONG_OPERATION: 600000,       // 10 minutes - for complex operations (compilation, large files)
  
  // Specific operation timeouts
  FOLDER_LIST: 360000,          // 6 minutes - folder listing can be large
  FILE_READ: 360000,            // 6 minutes - file reading can be large
  FILE_WRITE: 600000,           // 10 minutes - file writing/creation
  FILE_DELETE: 180000,          // 3 minutes - deletion operations
  ASSET_IMPORT: 600000,         // 10 minutes - Unity asset import
  COMPILATION: 600000,          // 10 minutes - script compilation
  
  // Connection timeouts
  CONNECTION_TIMEOUT: 10000,    // 10 seconds - initial connection
  RECONNECTION_INTERVAL: 10000, // 10 seconds - reconnection attempts (increased for stability)
  
  // TCP/Socket settings
  KEEP_ALIVE_INTERVAL: 60000,   // 1 minute - TCP keep-alive
  SOCKET_TIMEOUT: 0,            // Infinite - disable socket timeout
  
  // Buffer sizes
  TCP_BUFFER_SIZE: 131072,      // 128KB - TCP send/receive buffer
  READ_CHUNK_SIZE: 32768,       // 32KB - read chunk size for stability
  LARGE_FILE_THRESHOLD: 1048576 // 1MB - threshold for streaming operations
} as const;

/**
 * Get timeout for specific operation type
 */
export function getOperationTimeout(operation: string): number {
  const normalizedOp = operation.toLowerCase().replace(/\./g, '_');
  
  // Map operation names to timeout values
  const operationMap: Record<string, number> = {
    'unity_folder_list': TIMEOUT_CONFIG.FOLDER_LIST,
    'unity_script_read': TIMEOUT_CONFIG.FILE_READ,
    'unity_script_create': TIMEOUT_CONFIG.FILE_WRITE,
    'unity_script_delete': TIMEOUT_CONFIG.FILE_DELETE,
    'unity_script_validatesyntax': TIMEOUT_CONFIG.COMPILATION,
    'assetdatabase_importasset': TIMEOUT_CONFIG.ASSET_IMPORT,
    'assetdatabase_refresh': TIMEOUT_CONFIG.ASSET_IMPORT,
    'compilationpipeline_requestscriptcompilation': TIMEOUT_CONFIG.COMPILATION,
    'codegeneration_createfromtemplate': TIMEOUT_CONFIG.FILE_WRITE,
    'codeanalysis_analyzescript': TIMEOUT_CONFIG.LONG_OPERATION,
  };
  
  return operationMap[normalizedOp] || TIMEOUT_CONFIG.DEFAULT_OPERATION;
}

/**
 * Log timeout information for debugging
 */
export function logTimeoutInfo(operation: string, timeout: number): string {
  return `[TIMEOUT] ${operation}: ${timeout}ms (${(timeout/1000/60).toFixed(1)}min)`;
}