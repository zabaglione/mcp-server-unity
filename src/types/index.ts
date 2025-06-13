export interface UnityProject {
  projectPath: string;
  assetsPath: string;
  scriptsPath: string;
}

export interface BuildTarget {
  name: string;
  value: string;
}

export interface AssetType {
  name: string;
  extensions: string[];
}

// Remove ToolResponse as we'll use CallToolResult from MCP SDK directly

export interface FileSearchOptions {
  directory: string;
  fileName?: string | null;
  extension: string;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: any): void;
  debug(message: string): void;
}