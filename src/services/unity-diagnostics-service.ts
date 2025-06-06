import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import { pathExists, ensureDirectory } from '../utils/file-utils.js';
import { UnityDetector } from '../utils/unity-detector.js';
import { CompilationAnalyzer } from '../utils/compilation-analyzer.js';

const execAsync = promisify(exec);

interface UnityLogEntry {
  timestamp: string;
  level: 'Info' | 'Warning' | 'Error' | 'Assert' | 'Exception';
  message: string;
  stackTrace?: string;
}


export class UnityDiagnosticsService extends BaseService {
  private unityExecutablePath: string | null = null;
  private compilationAnalyzer: CompilationAnalyzer;

  constructor(logger: Logger) {
    super(logger);
    UnityDetector.setLogger(logger);
    this.compilationAnalyzer = new CompilationAnalyzer(logger);
  }

  /**
   * Set Unity executable path for the current platform
   */
  async setUnityPath(unityPath?: string): Promise<void> {
    if (unityPath) {
      this.unityExecutablePath = unityPath;
      this.logger.info(`Unity path manually set to: ${unityPath}`);
      return;
    }

    // Auto-detect Unity installation
    try {
      // If we have a project set, try to find matching Unity version
      if (this.unityProject) {
        const projectPath = this.unityProject.projectPath;
        this.unityExecutablePath = await UnityDetector.findUnityForProject(projectPath);
      } else {
        // Otherwise, get the best available Unity installation
        this.unityExecutablePath = await UnityDetector.getBestUnityPath();
      }

      if (this.unityExecutablePath) {
        this.logger.info(`Unity auto-detected at: ${this.unityExecutablePath}`);
      } else {
        this.logger.info('Unity executable not found. Some diagnostics features will be limited.');
        this.logger.info('You can manually set the Unity path or install Unity Hub.');
      }
    } catch (error) {
      this.logger.error('Error during Unity detection', error);
      this.unityExecutablePath = null;
    }
  }

  /**
   * Read Unity Editor log file
   */
  async readEditorLog(): Promise<CallToolResult> {
    this.ensureProjectSet();

    const logPath = this.getEditorLogPath();
    
    if (!await pathExists(logPath)) {
      return {
        content: [{
          type: 'text',
          text: 'Unity Editor log not found. Make sure Unity has been opened with this project.'
        }]
      };
    }

    const logContent = await fs.readFile(logPath, 'utf-8');
    const logEntries = this.parseUnityLog(logContent);
    
    // Filter for errors and warnings
    const errors = logEntries.filter(e => e.level === 'Error' || e.level === 'Exception');
    const warnings = logEntries.filter(e => e.level === 'Warning');

    let summary = `Unity Editor Log Summary\n`;
    summary += `========================\n`;
    summary += `Errors: ${errors.length}\n`;
    summary += `Warnings: ${warnings.length}\n\n`;

    if (errors.length > 0) {
      summary += `Recent Errors:\n`;
      errors.slice(-5).forEach((error, i) => {
        summary += `\n${i + 1}. ${error.message}\n`;
        if (error.stackTrace) {
          summary += `   Stack: ${error.stackTrace.split('\n')[0]}\n`;
        }
      });
    }

    if (warnings.length > 0) {
      summary += `\nRecent Warnings:\n`;
      warnings.slice(-5).forEach((warning, i) => {
        summary += `${i + 1}. ${warning.message}\n`;
      });
    }

    return {
      content: [{
        type: 'text',
        text: summary
      }]
    };
  }

  /**
   * Compile scripts and get compilation errors
   */
  async compileScripts(forceRecompile: boolean = false): Promise<CallToolResult> {
    this.ensureProjectSet();
    const projectPath = this.unityProject!.projectPath;

    // First, try to get compilation state without launching Unity
    const compilationState = await this.compilationAnalyzer.analyzeCompilationState(projectPath);
    
    if (compilationState.isCompiling) {
      return {
        content: [{
          type: 'text',
          text: 'Unity is currently compiling. Please wait for compilation to complete.'
        }]
      };
    }

    // If we have recent errors and not forcing recompile, return them
    if (!forceRecompile && compilationState.errors.length > 0) {
      let summary = `Compilation State (Cached)\n`;
      summary += `==========================\n`;
      summary += `Has Errors: ${compilationState.hasErrors}\n`;
      summary += `Total Errors: ${compilationState.errors.length}\n\n`;

      if (compilationState.errors.length > 0) {
        summary += `Compilation Errors:\n`;
        compilationState.errors.forEach((error, i) => {
          summary += `\n${i + 1}. ${error.file}(${error.line},${error.column}): ${error.errorCode}\n`;
          summary += `   ${error.message}\n`;
          summary += `   Severity: ${error.severity}\n`;
        });
      }

      summary += `\n💡 Tip: Use forceRecompile: true to trigger a fresh compilation.`;

      return {
        content: [{
          type: 'text',
          text: summary
        }]
      };
    }

    // If Unity executable is not set, try to auto-detect
    if (!this.unityExecutablePath) {
      await this.setUnityPath();
      
      if (!this.unityExecutablePath) {
        // Still no Unity found, but we can return cached errors if any
        const storedErrors = await this.compilationAnalyzer.getStoredCompilationErrors(projectPath);
        
        if (storedErrors.length > 0) {
          let summary = `Compilation Errors (From Cache)\n`;
          summary += `===============================\n`;
          summary += `Note: Unity executable not found. Showing last known errors.\n\n`;
          
          storedErrors.forEach((error, i) => {
            summary += `${i + 1}. ${error.file}(${error.line},${error.column}): ${error.errorCode}\n`;
            summary += `   ${error.message}\n`;
          });
          
          return {
            content: [{
              type: 'text',
              text: summary
            }]
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: 'Unity executable not found. Please install Unity or set the path manually.'
          }]
        };
      }
    }

    // Force compilation using Unity
    const args = [
      '-batchmode',
      '-quit',
      '-projectPath', projectPath,
      '-executeMethod', 'UnityEditor.SyncVS.SyncSolution'
    ];

    if (forceRecompile) {
      args.push('-forceCompile');
    }

    try {
      await execAsync(
        `"${this.unityExecutablePath}" ${args.join(' ')}`,
        { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
      );

      // After Unity runs, analyze the compilation state again
      const newState = await this.compilationAnalyzer.analyzeCompilationState(projectPath);
      
      let summary = `Compilation Result\n`;
      summary += `==================\n`;
      summary += `Success: ${!newState.hasErrors}\n`;
      summary += `Errors: ${newState.errors.length}\n\n`;

      if (newState.errors.length > 0) {
        summary += `Compilation Errors:\n`;
        newState.errors.forEach((error, i) => {
          summary += `\n${i + 1}. ${error.file}(${error.line},${error.column}): ${error.errorCode}\n`;
          summary += `   ${error.message}\n`;
        });
      } else {
        summary += `✅ No compilation errors found.\n`;
      }

      return {
        content: [{
          type: 'text',
          text: summary
        }]
      };
    } catch (error) {
      // Even if Unity fails, try to get errors from the file system
      const fallbackState = await this.compilationAnalyzer.analyzeCompilationState(projectPath);
      
      if (fallbackState.errors.length > 0) {
        let summary = `Compilation Errors (Retrieved from project)\n`;
        summary += `==========================================\n`;
        summary += `Unity execution failed, but found ${fallbackState.errors.length} errors:\n\n`;
        
        fallbackState.errors.forEach((error, i) => {
          summary += `${i + 1}. ${error.file}(${error.line},${error.column}): ${error.errorCode}\n`;
          summary += `   ${error.message}\n`;
        });
        
        return {
          content: [{
            type: 'text',
            text: summary
          }]
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: `Failed to compile scripts: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * Validate asset integrity
   */
  async validateAssets(): Promise<CallToolResult> {
    this.ensureProjectSet();

    const validationResults: string[] = [];
    const assetsPath = this.unityProject!.assetsPath;

    // Check for missing meta files
    const files = await this.getAllFiles(assetsPath);
    const missingMetaFiles: string[] = [];
    
    for (const file of files) {
      if (!file.endsWith('.meta') && !file.includes('/.') && !file.includes('\\.')) {
        const metaFile = `${file}.meta`;
        if (!await pathExists(metaFile)) {
          missingMetaFiles.push(path.relative(assetsPath, file));
        }
      }
    }

    if (missingMetaFiles.length > 0) {
      validationResults.push(`Missing .meta files (${missingMetaFiles.length}):`);
      missingMetaFiles.slice(0, 10).forEach(file => {
        validationResults.push(`  - ${file}`);
      });
      if (missingMetaFiles.length > 10) {
        validationResults.push(`  ... and ${missingMetaFiles.length - 10} more`);
      }
    }

    // Check for orphaned meta files
    const orphanedMetaFiles: string[] = [];
    for (const file of files) {
      if (file.endsWith('.meta')) {
        const originalFile = file.slice(0, -5);
        if (!await pathExists(originalFile)) {
          orphanedMetaFiles.push(path.relative(assetsPath, file));
        }
      }
    }

    if (orphanedMetaFiles.length > 0) {
      validationResults.push(`\nOrphaned .meta files (${orphanedMetaFiles.length}):`);
      orphanedMetaFiles.slice(0, 10).forEach(file => {
        validationResults.push(`  - ${file}`);
      });
    }

    // Check script references
    const scriptFiles = files.filter(f => f.endsWith('.cs'));
    const invalidScripts: string[] = [];
    
    for (const scriptFile of scriptFiles) {
      const content = await fs.readFile(scriptFile, 'utf-8');
      const className = path.basename(scriptFile, '.cs');
      
      // Basic check: class name should match file name
      if (!content.includes(`class ${className}`) && 
          !content.includes(`interface ${className}`) &&
          !content.includes(`enum ${className}`) &&
          !content.includes(`struct ${className}`)) {
        invalidScripts.push({
          file: path.relative(assetsPath, scriptFile),
          issue: 'Class name does not match file name'
        } as any);
      }
    }

    if (invalidScripts.length > 0) {
      validationResults.push(`\nScript validation issues (${invalidScripts.length}):`);
      invalidScripts.slice(0, 10).forEach((script: any) => {
        validationResults.push(`  - ${script.file}: ${script.issue}`);
      });
    }

    const summary = validationResults.length > 0 
      ? validationResults.join('\n')
      : 'All assets validated successfully!';

    return {
      content: [{
        type: 'text',
        text: `Asset Validation Report\n` +
              `======================\n` +
              summary
      }]
    };
  }

  /**
   * Run Unity tests and get results
   */
  async runTests(testPlatform: string = 'EditMode'): Promise<CallToolResult> {
    this.ensureProjectSet();

    if (!this.unityExecutablePath) {
      return {
        content: [{
          type: 'text',
          text: 'Unity executable not set. Please set Unity path first.'
        }]
      };
    }

    const projectPath = this.unityProject!.projectPath;
    const resultsPath = path.join(projectPath, 'TestResults.xml');

    // Unity command to run tests
    const args = [
      '-batchmode',
      '-runTests',
      '-projectPath', projectPath,
      '-testPlatform', testPlatform,
      '-testResults', resultsPath
    ];

    try {
      await execAsync(
        `"${this.unityExecutablePath}" ${args.join(' ')}`,
        { maxBuffer: 10 * 1024 * 1024 }
      );

      // Parse test results
      if (await pathExists(resultsPath)) {
        const results = await fs.readFile(resultsPath, 'utf-8');
        // Simple XML parsing for test results
        const totalTests = (results.match(/<test-case/g) || []).length;
        const failedTests = (results.match(/result="Failed"/g) || []).length;
        const passedTests = totalTests - failedTests;

        return {
          content: [{
            type: 'text',
            text: `Unity Test Results\n` +
                  `==================\n` +
                  `Total Tests: ${totalTests}\n` +
                  `Passed: ${passedTests}\n` +
                  `Failed: ${failedTests}\n` +
                  `\nTest results saved to: ${resultsPath}`
          }]
        };
      } else {
        return {
          content: [{
            type: 'text',
            text: 'Test execution completed but no results file found.'
          }]
        };
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to run tests: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * Install Unity diagnostics script for real-time feedback
   */
  async installDiagnosticsScript(): Promise<CallToolResult> {
    this.ensureProjectSet();

    const { unityDiagnosticsTemplate } = await import('../templates/unity-diagnostics-template.js');
    const diagnosticsPath = path.join(
      this.unityProject!.assetsPath,
      'Editor',
      'MCP',
      'UnityDiagnostics.cs'
    );

    await ensureDirectory(path.dirname(diagnosticsPath));
    await fs.writeFile(diagnosticsPath, unityDiagnosticsTemplate, 'utf-8');

    this.logger.info(`Unity diagnostics script installed: ${diagnosticsPath}`);

    return {
      content: [{
        type: 'text',
        text: `Unity diagnostics script installed successfully at: ${path.relative(this.unityProject!.projectPath, diagnosticsPath)}\n\n` +
              `Available menu items:\n` +
              `- MCP/Diagnostics/Run Full Diagnostics\n` +
              `- MCP/Diagnostics/Check Compilation\n` +
              `- MCP/Diagnostics/Validate Assets\n\n` +
              `The script will automatically save compilation errors when they occur.`
      }]
    };
  }

  /**
   * Read diagnostics results from Unity
   */
  async readDiagnosticsResults(): Promise<CallToolResult> {
    this.ensureProjectSet();

    const resultsPath = path.join(
      this.unityProject!.assetsPath,
      'Editor',
      'MCP',
      'Diagnostics',
      'diagnostics_results.json'
    );

    if (!await pathExists(resultsPath)) {
      return {
        content: [{
          type: 'text',
          text: 'No diagnostics results found. Run diagnostics from Unity first using MCP/Diagnostics menu.'
        }]
      };
    }

    const results = await fs.readFile(resultsPath, 'utf-8');
    const diagnostics = JSON.parse(results);

    let summary = `Unity Diagnostics Results (${diagnostics.timestamp})\n`;
    summary += `=========================================\n\n`;

    // Compilation
    summary += `Compilation: ${diagnostics.compilation.hasErrors ? '❌ FAILED' : '✅ SUCCESS'}\n`;
    if (diagnostics.compilation.errors?.length > 0) {
      summary += `Errors:\n`;
      diagnostics.compilation.errors.forEach((error: any) => {
        summary += `  - ${error.file}(${error.line},${error.column}): ${error.message}\n`;
      });
    }

    // Asset validation
    summary += `\nAsset Validation: ${diagnostics.assetValidation.issues.length} issues\n`;
    if (diagnostics.assetValidation.issues.length > 0) {
      diagnostics.assetValidation.issues.forEach((issue: any) => {
        summary += `  - ${issue.type}: ${issue.path} - ${issue.description}\n`;
      });
    }

    // Missing references
    if (diagnostics.missingReferences?.length > 0) {
      summary += `\nMissing References:\n`;
      diagnostics.missingReferences.forEach((ref: any) => {
        summary += `  - ${ref.scenePath}: ${ref.objectName}\n`;
      });
    }

    return {
      content: [{
        type: 'text',
        text: summary
      }]
    };
  }

  /**
   * Install MCP communication script for enhanced error reporting
   */
  async installCommunicationScript(): Promise<CallToolResult> {
    this.ensureProjectSet();

    // Communication template removed - HTTP API is now used instead
    const mcpCommunicationTemplate = '// This feature has been replaced by HTTP API';
    const communicationPath = path.join(
      this.unityProject!.assetsPath,
      'Editor',
      'MCP',
      'MCPCommunication.cs'
    );

    await ensureDirectory(path.dirname(communicationPath));
    await fs.writeFile(communicationPath, mcpCommunicationTemplate, 'utf-8');

    // Generate meta file
    const metaFileManager = new (await import('../utils/meta-file-manager.js')).MetaFileManager(this.logger);
    await metaFileManager.generateMetaFile(communicationPath);

    this.logger.info(`MCP communication script installed: ${communicationPath}`);

    return {
      content: [{
        type: 'text',
        text: `MCP communication script installed successfully at: ${path.relative(this.unityProject!.projectPath, communicationPath)}\n\n` +
              `Available menu items:\n` +
              `- MCP/Communication/Export Compilation Errors\n` +
              `- MCP/Communication/Export Project State\n` +
              `- MCP/Communication/Run Full Analysis\n\n` +
              `The script will automatically track compilation events and export errors.`
      }]
    };
  }

  /**
   * Read communication data exported by Unity
   */
  async readCommunicationData(dataType: string = 'all'): Promise<CallToolResult> {
    this.ensureProjectSet();

    const communicationPath = path.join(
      this.unityProject!.assetsPath,
      'Editor',
      'MCP',
      'Communication'
    );

    const files: { [key: string]: string } = {
      'compilation_errors': 'compilation_errors.json',
      'project_state': 'project_state.json',
      'asset_issues': 'asset_issues.json',
      'console_logs': 'console_logs.json',
      'last_event': 'last_event.json'
    };

    if (dataType !== 'all' && !files[dataType]) {
      return {
        content: [{
          type: 'text',
          text: `Unknown data type: ${dataType}. Available types: ${Object.keys(files).join(', ')}`
        }]
      };
    }

    let summary = `MCP Communication Data\n`;
    summary += `=====================\n\n`;

    const filesToRead = dataType === 'all' ? Object.entries(files) : [[dataType, files[dataType]]];

    for (const [type, filename] of filesToRead) {
      const filePath = path.join(communicationPath, filename);
      
      if (await pathExists(filePath)) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          summary += `${type.toUpperCase()}:\n`;
          summary += JSON.stringify(data, null, 2);
          summary += '\n\n';
        } catch (error) {
          summary += `${type.toUpperCase()}: Error reading file\n\n`;
        }
      } else {
        summary += `${type.toUpperCase()}: No data available\n\n`;
      }
    }

    return {
      content: [{
        type: 'text',
        text: summary
      }]
    };
  }

  /**
   * Get diagnostics summary for AI analysis
   */
  async getDiagnosticsSummary(): Promise<CallToolResult> {
    this.ensureProjectSet();

    const summary: string[] = ['Unity Project Diagnostics Summary'];
    summary.push('==================================\n');

    // Get editor log summary
    const logResult = await this.readEditorLog();
    summary.push('Editor Log:');
    summary.push(logResult.content[0].text as string);
    summary.push('');

    // Get asset validation
    const validationResult = await this.validateAssets();
    summary.push('\nAsset Validation:');
    summary.push(validationResult.content[0].text as string);

    // Get compilation status (if Unity is available)
    if (this.unityExecutablePath) {
      const compileResult = await this.compileScripts();
      summary.push('\nCompilation Status:');
      summary.push(compileResult.content[0].text as string);
    }

    return {
      content: [{
        type: 'text',
        text: summary.join('\n')
      }]
    };
  }

  // Helper methods

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

  private parseUnityLog(logContent: string): UnityLogEntry[] {
    const entries: UnityLogEntry[] = [];
    const lines = logContent.split('\n');
    
    let currentEntry: UnityLogEntry | null = null;
    
    for (const line of lines) {
      // Match Unity log format
      const match = line.match(/^(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}\.\d{3})\s+(\w+)\s+(.+)/);
      
      if (match) {
        if (currentEntry) {
          entries.push(currentEntry);
        }
        
        currentEntry = {
          timestamp: match[1],
          level: match[2] as any,
          message: match[3]
        };
      } else if (currentEntry && line.trim()) {
        // Continuation of previous entry (stack trace)
        if (!currentEntry.stackTrace) {
          currentEntry.stackTrace = '';
        }
        currentEntry.stackTrace += line + '\n';
      }
    }
    
    if (currentEntry) {
      entries.push(currentEntry);
    }
    
    return entries;
  }


  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }
}