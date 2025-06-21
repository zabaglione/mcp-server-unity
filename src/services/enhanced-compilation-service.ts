import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CompilationService } from './compilation-service.js';
import { pathExists } from '../utils/file-utils.js';
import path from 'path';
import fs from 'fs/promises';

interface CompilationError {
  file: string;
  line: number;
  column: number;
  errorCode: string;
  message: string;
  severity: 'error' | 'warning';
  context?: string[];
}

interface CompilationCache {
  errors: CompilationError[];
  timestamp: number;
  source: string;
}

export class EnhancedCompilationService extends CompilationService {
  private compilationCache: CompilationCache | null = null;
  private readonly CACHE_DURATION = 5000; // 5 seconds cache

  /**
   * Get compilation errors using multiple methods for reliability
   * Overrides the base implementation for enhanced error detection
   */
  override async getCompilationErrors(forceCompile: boolean = false): Promise<CallToolResult> {
    this.ensureProjectSet();

    let errors: CompilationError[] = [];
    const sources: string[] = [];

    // Check cache first
    if (!forceCompile && this.compilationCache && 
        Date.now() - this.compilationCache.timestamp < this.CACHE_DURATION) {
      this.logger.info('Using cached compilation results');
      return this.formatErrorsResult(this.compilationCache.errors, [this.compilationCache.source]);
    }

    // Method 1: Try Unity's compilation results from CompilationHelper
    const helperErrors = await this.getErrorsFromCompilationHelper();
    if (helperErrors.length > 0) {
      errors.push(...helperErrors);
      sources.push('CompilationHelper');
    }

    // Method 2: Parse Unity's compiler output files
    const compilerErrors = await this.getErrorsFromCompilerOutput();
    if (compilerErrors.length > 0) {
      // Merge with existing errors, avoiding duplicates
      for (const error of compilerErrors) {
        if (!this.isDuplicateError(error, errors)) {
          errors.push(error);
        }
      }
      sources.push('Compiler Output');
    }

    // Method 3: Parse Editor.log with improved patterns
    const logErrors = await this.getErrorsFromEditorLog();
    if (logErrors.length > 0) {
      for (const error of logErrors) {
        if (!this.isDuplicateError(error, errors)) {
          errors.push(error);
        }
      }
      sources.push('Editor Log');
    }

    // Method 4: Check Library/Bee for compilation logs (2022.2+)
    const beeErrors = await this.getErrorsFromBeeCompiler();
    if (beeErrors.length > 0) {
      for (const error of beeErrors) {
        if (!this.isDuplicateError(error, errors)) {
          errors.push(error);
        }
      }
      sources.push('Bee Compiler');
    }

    // If forceCompile and no errors found, try to trigger compilation
    if (forceCompile && errors.length === 0) {
      this.logger.info('Force compile requested, attempting to trigger Unity compilation');
      await this.triggerUnityCompilation();
      
      // Wait a bit for compilation to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to get errors again
      errors = await this.getAllCompilationErrors();
    }

    // Enhance errors with code context
    const enhancedErrors = await this.enhanceErrorsWithContext(errors);

    // Cache the results
    this.compilationCache = {
      errors: enhancedErrors,
      timestamp: Date.now(),
      source: sources.join(', ')
    };

    return this.formatErrorsResult(enhancedErrors, sources);
  }

  /**
   * Get errors from CompilationHelper results
   */
  private async getErrorsFromCompilationHelper(): Promise<CompilationError[]> {
    const compilationResultPath = path.join(
      this.unityProject!.projectPath,
      'Temp',
      'UnityTempFile-CompilationResults.json'
    );

    try {
      if (await pathExists(compilationResultPath)) {
        const content = await fs.readFile(compilationResultPath, 'utf-8');
        const results = JSON.parse(content);
        return this.parseCompilationResults(results);
      }
    } catch (error) {
      this.logger.debug('Could not read CompilationHelper results');
    }

    return [];
  }

  /**
   * Get errors from Unity's compiler output files
   */
  private async getErrorsFromCompilerOutput(): Promise<CompilationError[]> {
    const errors: CompilationError[] = [];
    const tempPath = path.join(this.unityProject!.projectPath, 'Temp');

    try {
      // Look for compiler output files
      const files = await fs.readdir(tempPath);
      const compilerFiles = files.filter(f => 
        f.startsWith('UnityTempFile-') && 
        (f.includes('Compiler') || f.includes('Assembly'))
      );

      for (const file of compilerFiles) {
        try {
          const content = await fs.readFile(path.join(tempPath, file), 'utf-8');
          const fileErrors = this.parseCompilerOutput(content);
          errors.push(...fileErrors);
        } catch {
          // Skip files we can't read
        }
      }
    } catch {
      this.logger.debug('Could not access Temp directory for compiler output');
    }

    return errors;
  }

  /**
   * Parse compiler output text
   */
  private parseCompilerOutput(content: string): CompilationError[] {
    const errors: CompilationError[] = [];
    const lines = content.split('\n');

    // Multiple patterns to catch different error formats
    const patterns = [
      // Standard C# compiler format: file(line,col): error CS0000: message
      /^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(\w+):\s*(.+)$/,
      // Alternative format without column
      /^(.+?)\((\d+)\):\s*(error|warning)\s+(\w+):\s*(.+)$/,
      // Unity-specific format
      /^(.+?):(\d+):\s*(error|warning):\s*(.+)$/,
    ];

    for (const line of lines) {
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          if (pattern === patterns[0]) {
            errors.push({
              file: match[1],
              line: parseInt(match[2]),
              column: parseInt(match[3]),
              errorCode: match[5],
              message: match[6],
              severity: match[4] as 'error' | 'warning'
            });
          } else if (pattern === patterns[1]) {
            errors.push({
              file: match[1],
              line: parseInt(match[2]),
              column: 0,
              errorCode: match[4],
              message: match[5],
              severity: match[3] as 'error' | 'warning'
            });
          } else if (pattern === patterns[2]) {
            errors.push({
              file: match[1],
              line: parseInt(match[2]),
              column: 0,
              errorCode: 'CS0000',
              message: match[4],
              severity: match[3] as 'error' | 'warning'
            });
          }
          break;
        }
      }
    }

    return errors;
  }

  /**
   * Get errors from Editor.log with improved parsing
   */
  private async getErrorsFromEditorLog(): Promise<CompilationError[]> {
    const errors: CompilationError[] = [];

    try {
      const logPath = this.getEditorLogPath();
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.split('\n');

      let inCompilationSection = false;
      let currentError: Partial<CompilationError> | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for compilation start markers
        if (line.includes('-----CompilerOutput:-stdout') || 
            line.includes('Compilation failed:')) {
          inCompilationSection = true;
          continue;
        }

        // Check for compilation end markers
        if (line.includes('-----EndCompilerOutput') ||
            line.includes('Compilation succeeded')) {
          inCompilationSection = false;
          continue;
        }

        if (inCompilationSection) {
          // Parse error lines
          const errorMatch = line.match(/^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(\w+):\s*(.+)$/);
          if (errorMatch) {
            if (currentError) {
              errors.push(currentError as CompilationError);
            }
            currentError = {
              file: errorMatch[1],
              line: parseInt(errorMatch[2]),
              column: parseInt(errorMatch[3]),
              errorCode: errorMatch[5],
              message: errorMatch[6],
              severity: errorMatch[4] as 'error' | 'warning'
            };
          } else if (currentError && line.trim() && !line.startsWith(' ')) {
            // This might be a continuation of the error message
            currentError.message += '\n' + line.trim();
          }
        }
      }

      if (currentError) {
        errors.push(currentError as CompilationError);
      }
    } catch (error) {
      this.logger.debug('Could not parse Editor.log');
    }

    return errors;
  }

  /**
   * Get errors from Bee compiler (Unity 2022.2+)
   */
  private async getErrorsFromBeeCompiler(): Promise<CompilationError[]> {
    const errors: CompilationError[] = [];
    const beePath = path.join(this.unityProject!.projectPath, 'Library', 'Bee');

    try {
      // Check for Bee compilation results
      const diagnosticsPath = path.join(beePath, 'diagnostics.json');
      if (await pathExists(diagnosticsPath)) {
        const content = await fs.readFile(diagnosticsPath, 'utf-8');
        const diagnostics = JSON.parse(content);
        
        if (diagnostics.diagnostics) {
          for (const diag of diagnostics.diagnostics) {
            errors.push({
              file: diag.file || 'Unknown',
              line: diag.line || 0,
              column: diag.column || 0,
              errorCode: diag.id || 'CS0000',
              message: diag.message || 'Unknown error',
              severity: diag.severity === 'error' ? 'error' : 'warning'
            });
          }
        }
      }

      // Also check fullprofile.json
      const fullProfilePath = path.join(beePath, 'fullprofile.json');
      if (await pathExists(fullProfilePath)) {
        const content = await fs.readFile(fullProfilePath, 'utf-8');
        const profile = JSON.parse(content);
        
        // Parse build steps for errors
        if (profile.traceEvents) {
          for (const event of profile.traceEvents) {
            if (event.args && event.args.detail && event.args.detail.includes('error')) {
              const errorMatch = event.args.detail.match(/(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(\w+):\s*(.+)/);
              if (errorMatch) {
                errors.push({
                  file: errorMatch[1],
                  line: parseInt(errorMatch[2]),
                  column: parseInt(errorMatch[3]),
                  errorCode: errorMatch[5],
                  message: errorMatch[6],
                  severity: errorMatch[4] as 'error' | 'warning'
                });
              }
            }
          }
        }
      }
    } catch (error) {
      this.logger.debug('Could not access Bee compiler output');
    }

    return errors;
  }

  /**
   * Trigger Unity compilation
   */
  private async triggerUnityCompilation(): Promise<void> {
    try {
      // Create a trigger file that Unity will detect
      const triggerPath = path.join(
        this.unityProject!.projectPath,
        'Assets',
        '_CompilationTrigger.cs'
      );

      // Write a minimal script that will trigger compilation
      const triggerContent = `// Auto-generated file to trigger compilation
// Delete this file after compilation
using UnityEngine;
public class _CompilationTrigger : MonoBehaviour { 
    // Timestamp: ${new Date().toISOString()}
}`;

      await fs.writeFile(triggerPath, triggerContent, 'utf-8');
      await this.metaFileManager.generateMetaFile(triggerPath);

      // Trigger Unity refresh
      if (this.refreshService) {
        await this.refreshService.refreshUnityAssets();
      }

      // Schedule deletion of trigger file
      setTimeout(async () => {
        try {
          await fs.unlink(triggerPath);
          await fs.unlink(triggerPath + '.meta');
        } catch {
          // Ignore if already deleted
        }
      }, 5000);
    } catch (error) {
      this.logger.warn('Could not create compilation trigger file: ' + error);
    }
  }

  /**
   * Get all compilation errors using all methods
   */
  private async getAllCompilationErrors(): Promise<CompilationError[]> {
    const allErrors: CompilationError[] = [];
    
    const [helperErrors, compilerErrors, logErrors, beeErrors] = await Promise.all([
      this.getErrorsFromCompilationHelper(),
      this.getErrorsFromCompilerOutput(),
      this.getErrorsFromEditorLog(),
      this.getErrorsFromBeeCompiler()
    ]);

    // Merge all errors, avoiding duplicates
    for (const errorSet of [helperErrors, compilerErrors, logErrors, beeErrors]) {
      for (const error of errorSet) {
        if (!this.isDuplicateError(error, allErrors)) {
          allErrors.push(error);
        }
      }
    }

    return allErrors;
  }

  /**
   * Check if an error is a duplicate
   */
  private isDuplicateError(error: CompilationError, existingErrors: CompilationError[]): boolean {
    return existingErrors.some(e => 
      e.file === error.file &&
      e.line === error.line &&
      e.errorCode === error.errorCode &&
      e.message === error.message
    );
  }

  /**
   * Parse compilation results from CompilationHelper
   * Overrides base method for type compatibility
   */
  protected parseCompilationResults(results: any): CompilationError[] {
    const errors: CompilationError[] = [];
    
    if (results.messages && Array.isArray(results.messages)) {
      for (const msg of results.messages) {
        errors.push({
          file: msg.file || 'Unknown',
          line: msg.line || 0,
          column: msg.column || 0,
          errorCode: msg.code || 'CS0000',
          message: msg.message || 'Unknown error',
          severity: msg.type === 'Error' ? 'error' : 'warning'
        });
      }
    }
    
    return errors;
  }

  /**
   * Enhance errors with code context
   * Overrides base method for enhanced context
   */
  protected async enhanceErrorsWithContext(errors: CompilationError[]): Promise<CompilationError[]> {
    const enhanced = [...errors];

    for (const error of enhanced) {
      try {
        if (error.file && error.line > 0) {
          const fullPath = path.isAbsolute(error.file) 
            ? error.file 
            : path.join(this.unityProject!.projectPath, error.file);

          if (await pathExists(fullPath)) {
            const content = await fs.readFile(fullPath, 'utf-8');
            const lines = content.split('\n');
            
            // Add context lines
            const startLine = Math.max(0, error.line - 3);
            const endLine = Math.min(lines.length, error.line + 2);
            
            error.context = [];
            for (let i = startLine; i < endLine; i++) {
              const prefix = i === error.line - 1 ? '> ' : '  ';
              error.context.push(`${prefix}${i + 1}: ${lines[i]}`);
            }
          }
        }
      } catch {
        // Skip if we can't read the file
      }
    }

    return enhanced;
  }

  /**
   * Format errors for output
   */
  private formatErrorsResult(errors: CompilationError[], sources: string[]): CallToolResult {
    if (errors.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No compilation errors found.\n\n' +
                'If you believe there are errors:\n' +
                '1. Make sure Unity Editor is open\n' +
                '2. Try saving all scripts in Unity\n' +
                '3. Use forceCompile: true to trigger compilation\n' +
                '4. Install CompilationHelper for better error detection'
        }]
      };
    }

    let output = `Found ${errors.length} compilation errors\n`;
    output += `Sources: ${sources.join(', ')}\n\n`;

    // Group errors by file
    const errorsByFile = new Map<string, CompilationError[]>();
    for (const error of errors) {
      const file = error.file || 'Unknown';
      if (!errorsByFile.has(file)) {
        errorsByFile.set(file, []);
      }
      errorsByFile.get(file)!.push(error);
    }

    // Format errors by file
    for (const [file, fileErrors] of errorsByFile) {
      const relativePath = path.relative(this.unityProject!.projectPath, file);
      output += `\n📄 ${relativePath}\n`;
      output += '─'.repeat(50) + '\n';

      for (const error of fileErrors) {
        const icon = error.severity === 'error' ? '❌' : '⚠️';
        output += `\n${icon} ${error.severity.toUpperCase()} ${error.errorCode} (Line ${error.line}:${error.column})\n`;
        output += `   ${error.message}\n`;

        if (error.context && error.context.length > 0) {
          output += '\n';
          for (const contextLine of error.context) {
            output += `   ${contextLine}\n`;
          }
        }
      }
    }

    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  }

  /**
   * Get Editor.log path based on platform
   * Overrides base method for type compatibility
   */
  protected getEditorLogPath(): string {
    const platform = process.platform;
    
    if (platform === 'win32') {
      return path.join(process.env.LOCALAPPDATA!, 'Unity', 'Editor', 'Editor.log');
    } else if (platform === 'darwin') {
      return path.join(process.env.HOME!, 'Library', 'Logs', 'Unity', 'Editor.log');
    } else {
      return path.join(process.env.HOME!, '.config', 'unity3d', 'Editor.log');
    }
  }

  /**
   * Install improved compilation helper
   * Delegates to base implementation
   */
  override async installCompilationHelper(): Promise<CallToolResult> {
    return super.installCompilationHelper();
  }

  /**
   * Get compilation status
   * Overrides base implementation with enhanced status checking
   */
  override async getCompilationStatus(): Promise<CallToolResult> {
    this.ensureProjectSet();

    const status = {
      isUnityRunning: await this.isUnityRunning(),
      isCompiling: await this.isUnityCompiling(),
      lastCompileTime: await this.getLastCompileTime(),
      hasErrors: false,
      errorCount: 0,
      warningCount: 0
    };

    // Get current errors
    const errors = await this.getAllCompilationErrors();
    status.hasErrors = errors.some(e => e.severity === 'error');
    status.errorCount = errors.filter(e => e.severity === 'error').length;
    status.warningCount = errors.filter(e => e.severity === 'warning').length;

    return {
      content: [{
        type: 'text',
        text: `Unity Compilation Status:\n` +
              `─────────────────────────\n` +
              `Unity Running: ${status.isUnityRunning ? 'Yes' : 'No'}\n` +
              `Currently Compiling: ${status.isCompiling ? 'Yes' : 'No'}\n` +
              `Last Compile: ${status.lastCompileTime || 'Unknown'}\n` +
              `Has Errors: ${status.hasErrors ? 'Yes' : 'No'}\n` +
              `Error Count: ${status.errorCount}\n` +
              `Warning Count: ${status.warningCount}\n`
      }]
    };
  }

  /**
   * Check if Unity is running
   */
  private async isUnityRunning(): Promise<boolean> {
    try {
      const lockFile = path.join(this.unityProject!.projectPath, 'Temp', 'UnityLockfile');
      return await pathExists(lockFile);
    } catch {
      return false;
    }
  }

  /**
   * Check if Unity is currently compiling
   * Overrides base method for enhanced checking
   */
  protected async isUnityCompiling(): Promise<boolean> {
    try {
      // Check for compilation lock files
      const tempPath = path.join(this.unityProject!.projectPath, 'Temp');
      const compileLock = path.join(tempPath, 'CompileLock');
      const assemblyLock = path.join(tempPath, 'Assembly-CSharp.dll.locked');
      
      return await pathExists(compileLock) || await pathExists(assemblyLock);
    } catch {
      return false;
    }
  }

  /**
   * Get last compilation time
   * Overrides base method for enhanced checking
   */
  protected async getLastCompileTime(): Promise<string | null> {
    try {
      const assemblyPath = path.join(
        this.unityProject!.projectPath,
        'Library',
        'ScriptAssemblies',
        'Assembly-CSharp.dll'
      );
      
      if (await pathExists(assemblyPath)) {
        const stats = await fs.stat(assemblyPath);
        return stats.mtime.toLocaleString();
      }
    } catch {
      // Try alternative paths
    }

    return null;
  }
}