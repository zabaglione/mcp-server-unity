import { Logger } from '../types/index.js';

export class ConsoleLogger implements Logger {
  private prefix: string;

  constructor(prefix: string = '[Unity MCP]') {
    this.prefix = prefix;
  }

  info(message: string): void {
    console.error(`${this.prefix} INFO: ${message}`);
  }

  error(message: string, error?: any): void {
    console.error(`${this.prefix} ERROR: ${message}`);
    if (error) {
      console.error(error);
    }
  }

  debug(message: string): void {
    if (process.env.DEBUG) {
      console.error(`${this.prefix} DEBUG: ${message}`);
    }
  }
}