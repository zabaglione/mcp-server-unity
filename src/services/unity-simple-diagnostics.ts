import path from 'path';
import fs from 'fs/promises';
import { pathExists } from '../utils/file-utils.js';
import { Logger } from '../types/index.js';
import { CompilationError } from '../utils/compilation-analyzer.js';

/**
 * Simplified diagnostics functions that don't require Unity executable
 */
export class UnitySimpleDiagnostics {
  constructor(private logger: Logger) {}

  /**
   * Get compilation errors directly from Unity's generated files
   */
  async getDirectCompilationErrors(projectPath: string): Promise<CompilationError[]> {
    const errors: CompilationError[] = [];

    // 1. Check Unity's Temp folder for compilation output
    const tempPath = path.join(projectPath, 'Temp');
    if (await pathExists(tempPath)) {
      const tempFiles = await fs.readdir(tempPath);
      
      // Look for Unity compilation output files
      const errorFiles = tempFiles.filter(f => 
        f.includes('UnityTempFile') || 
        f.includes('CompilationCompleted') ||
        f.includes('.rsp.error') ||
        f.includes('UnityEngine.TestRunner')
      );

      for (const file of errorFiles) {
        try {
          const content = await fs.readFile(path.join(tempPath, file), 'utf-8');
          const fileErrors = this.parseCompilerErrors(content);
          errors.push(...fileErrors);
        } catch (e) {
          // Ignore read errors
          this.logger.debug(`Could not read file: ${file}`)
        }
      }
    }

    // 2. Check Unity's Library/Logs folder
    const logsPath = path.join(projectPath, 'Library', 'Logs');
    if (await pathExists(logsPath)) {
      const logFiles = await fs.readdir(logsPath);
      
      for (const logFile of logFiles) {
        if (logFile.includes('AssetImport') || logFile.includes('Build')) {
          try {
            const content = await fs.readFile(path.join(logsPath, logFile), 'utf-8');
            const logErrors = this.parseCompilerErrors(content);
            errors.push(...logErrors);
          } catch (e) {
            // Ignore read errors
          }
        }
      }
    }

    // 3. Check the standard Editor.log location
    const editorLogPath = this.getEditorLogPath();
    if (await pathExists(editorLogPath)) {
      try {
        const logContent = await fs.readFile(editorLogPath, 'utf-8');
        // Get last 1000 lines for recent errors
        const lines = logContent.split('\n');
        const recentLines = lines.slice(-1000).join('\n');
        const logErrors = this.parseCompilerErrors(recentLines);
        errors.push(...logErrors);
      } catch (e) {
        // Ignore read errors
      }
    }

    return this.deduplicateErrors(errors);
  }

  /**
   * Parse compiler errors from text content
   */
  private parseCompilerErrors(content: string): CompilationError[] {
    const errors: CompilationError[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // C# compiler error format: file(line,column): error CS0000: message
      const match = line.match(/(.+)\((\d+),(\d+)\):\s*(error|warning)\s+(\w+):\s*(.+)/);
      
      if (match) {
        errors.push({
          file: match[1].trim(),
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          severity: match[4] as 'error' | 'warning',
          errorCode: match[5],
          message: match[6].trim()
        });
      }
      
      // Alternative format without column
      const altMatch = line.match(/(.+)\((\d+)\):\s*(error|warning)\s+(\w+):\s*(.+)/);
      if (altMatch && !match) {
        errors.push({
          file: altMatch[1].trim(),
          line: parseInt(altMatch[2]),
          column: 0,
          severity: altMatch[3] as 'error' | 'warning',
          errorCode: altMatch[4],
          message: altMatch[5].trim()
        });
      }

      // Unity specific error format
      if (line.includes('error CS') || line.includes('error BCE')) {
        const unityMatch = line.match(/Assets[^:]+\.cs.*?error\s+(\w+):\s*(.+)/);
        if (unityMatch) {
          const filePath = line.match(/(Assets[^(]+\.cs)/)?.[1] || 'Unknown';
          const lineNum = line.match(/\((\d+),/)?.[1] || '0';
          
          errors.push({
            file: filePath,
            line: parseInt(lineNum),
            column: 0,
            severity: 'error',
            errorCode: unityMatch[1],
            message: unityMatch[2].trim()
          });
        }
      }
    }

    return errors;
  }

  /**
   * Get editor log path for current platform
   */
  private getEditorLogPath(): string {
    const platform = process.platform;
    const home = process.env.HOME || process.env.USERPROFILE || '';

    if (platform === 'darwin') {
      return path.join(home, 'Library', 'Logs', 'Unity', 'Editor.log');
    } else if (platform === 'win32') {
      return path.join(process.env.LOCALAPPDATA || '', 'Unity', 'Editor', 'Editor.log');
    } else {
      return path.join(home, '.config', 'unity3d', 'Editor.log');
    }
  }

  /**
   * Deduplicate errors
   */
  private deduplicateErrors(errors: CompilationError[]): CompilationError[] {
    const seen = new Set<string>();
    return errors.filter(error => {
      const key = `${error.file}:${error.line}:${error.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}