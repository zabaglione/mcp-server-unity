/**
 * Unity 6 MCP Bridge v3.0 Type Definitions
 * Minimal types required for the Unity Bridge architecture
 */

/**
 * Logger interface for Unity Bridge components
 */
export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: any): void;
  debug(message: string): void;
}