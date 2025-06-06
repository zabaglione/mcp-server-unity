import * as fs from 'fs/promises';
import * as path from 'path';
import { pathExists } from './file-utils.js';
import { Logger } from '../types/index.js';

export interface CompilationError {
  file: string;
  line: number;
  column: number;
  errorCode: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface AssemblyInfo {
  name: string;
  path: string;
  hasErrors: boolean;
  errors: CompilationError[];
  lastModified?: Date;
}

export class CompilationAnalyzer {
  constructor(private logger: Logger) {}

  /**
   * Analyze compilation state by checking Unity's Library folder
   */
  async analyzeCompilationState(projectPath: string): Promise<{
    isCompiling: boolean;
    hasErrors: boolean;
    assemblies: AssemblyInfo[];
    errors: CompilationError[];
  }> {
    const libraryPath = path.join(projectPath, 'Library');
    const scriptAssembliesPath = path.join(libraryPath, 'ScriptAssemblies');
    
    // Check if compilation is in progress
    const isCompiling = await this.isCompilationInProgress(libraryPath);
    
    // Get assembly information
    const assemblies = await this.getAssemblyInfo(scriptAssembliesPath);
    
    // Extract compilation errors from various sources
    const errors = await this.extractCompilationErrors(projectPath);
    
    return {
      isCompiling,
      hasErrors: errors.length > 0,
      assemblies,
      errors
    };
  }

  /**
   * Check if Unity is currently compiling
   */
  private async isCompilationInProgress(libraryPath: string): Promise<boolean> {
    const lockFiles = [
      'AtomicMoveToken.lock',
      'BuildPlayerData.lock',
      'ScriptCompilationBuildProgram.lock'
    ];

    for (const lockFile of lockFiles) {
      const lockPath = path.join(libraryPath, lockFile);
      if (await pathExists(lockPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get information about compiled assemblies
   */
  private async getAssemblyInfo(scriptAssembliesPath: string): Promise<AssemblyInfo[]> {
    const assemblies: AssemblyInfo[] = [];

    if (!await pathExists(scriptAssembliesPath)) {
      return assemblies;
    }

    try {
      const files = await fs.readdir(scriptAssembliesPath);
      const dllFiles = files.filter(f => f.endsWith('.dll'));

      for (const dllFile of dllFiles) {
        const dllPath = path.join(scriptAssembliesPath, dllFile);
        const stats = await fs.stat(dllPath);
        
        assemblies.push({
          name: dllFile.replace('.dll', ''),
          path: dllPath,
          hasErrors: false, // Will be updated if errors found
          errors: [],
          lastModified: stats.mtime
        });
      }
    } catch (error) {
      this.logger.error('Error reading assemblies', error);
    }

    return assemblies;
  }

  /**
   * Extract compilation errors from various Unity files
   */
  private async extractCompilationErrors(projectPath: string): Promise<CompilationError[]> {
    const errors: CompilationError[] = [];

    // 1. Check Temp/UnityTempFile-* for recent compilation errors
    const tempPath = path.join(projectPath, 'Temp');
    if (await pathExists(tempPath)) {
      const tempErrors = await this.extractErrorsFromTempFiles(tempPath);
      errors.push(...tempErrors);
    }

    // 2. Check Library/Bee/artifacts for build errors
    const beePath = path.join(projectPath, 'Library', 'Bee', 'artifacts');
    if (await pathExists(beePath)) {
      const beeErrors = await this.extractErrorsFromBeeArtifacts(beePath);
      errors.push(...beeErrors);
    }

    // 3. Check console log if available
    const consoleLogPath = path.join(projectPath, 'Library', 'ConsoleLog.txt');
    if (await pathExists(consoleLogPath)) {
      const consoleErrors = await this.extractErrorsFromConsoleLog(consoleLogPath);
      errors.push(...consoleErrors);
    }

    return errors;
  }

  /**
   * Extract errors from Unity temp files
   */
  private async extractErrorsFromTempFiles(tempPath: string): Promise<CompilationError[]> {
    const errors: CompilationError[] = [];

    try {
      const files = await fs.readdir(tempPath);
      const errorFiles = files.filter(f => 
        f.startsWith('UnityTempFile-') || 
        f.includes('CompilationLog') ||
        f.endsWith('.rsp.error')
      );

      for (const file of errorFiles) {
        const filePath = path.join(tempPath, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const fileErrors = this.parseCompilerOutput(content);
          errors.push(...fileErrors);
        } catch (err) {
          // Ignore individual file read errors
        }
      }
    } catch (error) {
      this.logger.error('Error reading temp files', error);
    }

    return errors;
  }

  /**
   * Extract errors from Bee build artifacts
   */
  private async extractErrorsFromBeeArtifacts(beePath: string): Promise<CompilationError[]> {
    const errors: CompilationError[] = [];

    // Bee stores build logs in various locations
    const logPaths = [
      path.join(beePath, 'build.log'),
      path.join(beePath, '..', 'fulllog.json')
    ];

    for (const logPath of logPaths) {
      if (await pathExists(logPath)) {
        try {
          const content = await fs.readFile(logPath, 'utf-8');
          
          // Handle JSON log format
          if (logPath.endsWith('.json')) {
            const logData = JSON.parse(content);
            if (logData.errors) {
              errors.push(...this.parseBeeJsonErrors(logData.errors));
            }
          } else {
            // Handle text log format
            const fileErrors = this.parseCompilerOutput(content);
            errors.push(...fileErrors);
          }
        } catch (err) {
          // Ignore parse errors
        }
      }
    }

    return errors;
  }

  /**
   * Extract errors from console log
   */
  private async extractErrorsFromConsoleLog(logPath: string): Promise<CompilationError[]> {
    const errors: CompilationError[] = [];

    try {
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        // Look for compilation error patterns
        if (line.includes('error CS') || line.includes('error BCE')) {
          const error = this.parseConsoleLine(line);
          if (error) {
            errors.push(error);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error reading console log', error);
    }

    return errors;
  }

  /**
   * Parse compiler output into structured errors
   */
  private parseCompilerOutput(output: string): CompilationError[] {
    const errors: CompilationError[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // C# compiler error format: file(line,column): error CS0000: message
      const errorMatch = line.match(/(.+)\((\d+),(\d+)\):\s*(error|warning)\s+(\w+):\s*(.+)/);
      
      if (errorMatch) {
        errors.push({
          file: errorMatch[1],
          line: parseInt(errorMatch[2]),
          column: parseInt(errorMatch[3]),
          severity: errorMatch[4] as 'error' | 'warning',
          errorCode: errorMatch[5],
          message: errorMatch[6].trim()
        });
      }
    }

    return errors;
  }

  /**
   * Parse Bee JSON format errors
   */
  private parseBeeJsonErrors(beeErrors: any[]): CompilationError[] {
    return beeErrors.map(err => ({
      file: err.file || 'Unknown',
      line: err.line || 0,
      column: err.column || 0,
      severity: err.severity || 'error',
      errorCode: err.code || 'Unknown',
      message: err.message || 'Unknown error'
    }));
  }

  /**
   * Parse console log line into error
   */
  private parseConsoleLine(line: string): CompilationError | null {
    const match = line.match(/(.+?)\((\d+),(\d+)\).*?(error|warning)\s+(\w+):\s*(.+)/);
    
    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        severity: match[4] as 'error' | 'warning',
        errorCode: match[5],
        message: match[6].trim()
      };
    }

    return null;
  }

  /**
   * Get recent compilation errors from memory (if stored)
   */
  async getStoredCompilationErrors(projectPath: string): Promise<CompilationError[]> {
    const errorCachePath = path.join(
      projectPath, 
      'Assets', 
      'Editor', 
      'MCP', 
      'Diagnostics',
      'compilation_errors.json'
    );

    if (!await pathExists(errorCachePath)) {
      return [];
    }

    try {
      const content = await fs.readFile(errorCachePath, 'utf-8');
      const data = JSON.parse(content);
      return data.errors || [];
    } catch (error) {
      return [];
    }
  }
}