import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import { MetaFileManager } from '../utils/meta-file-manager.js';
import { ensureDirectory, pathExists } from '../utils/file-utils.js';
import path from 'path';
import fs from 'fs/promises';

interface CompilationError {
  file: string;
  line: number;
  column: number;
  errorCode: string;
  message: string;
  severity: 'error' | 'warning';
}

export class CompilationService extends BaseService {
  protected metaFileManager: MetaFileManager;
  
  constructor(logger: Logger) {
    super(logger);
    this.metaFileManager = new MetaFileManager(logger);
  }

  /**
   * Get real-time compilation errors with detailed information
   */
  async getCompilationErrors(forceCompile: boolean = false): Promise<CallToolResult> {
    this.ensureProjectSet();

    // First, try to read from Unity's compilation results if available
    const compilationResultPath = path.join(
      this.unityProject!.projectPath,
      'Temp',
      'UnityTempFile-CompilationResults.json'
    );

    let errors: CompilationError[] = [];

    try {
      // Check if compilation results exist
      const resultsExist = await this.fileExists(compilationResultPath);
      
      if (resultsExist && !forceCompile) {
        const content = await fs.readFile(compilationResultPath, 'utf-8');
        const results = JSON.parse(content);
        errors = this.parseCompilationResults(results);
      } else if (forceCompile) {
        // Force Unity to compile
        errors = await this.forceUnityCompilation();
      }
    } catch (error) {
      this.logger.info('Could not read compilation results, trying alternative method');
      
      // Alternative: Parse Editor.log
      errors = await this.parseEditorLogForErrors();
    }

    // Enhance errors with code context
    const enhancedErrors = await this.enhanceErrorsWithContext(errors);

    return {
      content: [{
        type: 'text',
        text: this.formatCompilationErrors(enhancedErrors)
      }]
    };
  }

  /**
   * Monitor compilation in real-time (returns current status)
   */
  async getCompilationStatus(): Promise<CallToolResult> {
    this.ensureProjectSet();

    const isCompiling = await this.isUnityCompiling();
    const lastCompileTime = await this.getLastCompileTime();
    const hasErrors = await this.hasCompilationErrors();

    return {
      content: [{
        type: 'text',
        text: `Unity Compilation Status:\n` +
              `Currently compiling: ${isCompiling ? 'Yes' : 'No'}\n` +
              `Last compile time: ${lastCompileTime || 'Unknown'}\n` +
              `Has errors: ${hasErrors ? 'Yes' : 'No'}\n\n` +
              `To get detailed errors, use diagnostics_compile_scripts with forceRecompile: true`
      }]
    };
  }

  /**
   * Create a compilation helper script for Unity
   */
  async installCompilationHelper(): Promise<CallToolResult> {
    this.ensureProjectSet();

    const editorPath = path.join(this.unityProject!.assetsPath, 'Editor');
    await ensureDirectory(editorPath);

    const helperPath = path.join(editorPath, 'CompilationHelper.cs');
    
    const helperContent = `using UnityEngine;
using UnityEditor;
using UnityEditor.Compilation;
using System.IO;
using System.Linq;
using System.Collections.Generic;

namespace UnityMCP.Editor
{
    public class CompilationHelper : AssetPostprocessor
    {
        private static string ResultsPath => Path.Combine(Application.dataPath, "..", "Temp", "UnityTempFile-CompilationResults.json");

        [InitializeOnLoadMethod]
        static void Initialize()
        {
            CompilationPipeline.compilationStarted += OnCompilationStarted;
            CompilationPipeline.compilationFinished += OnCompilationFinished;
            CompilationPipeline.assemblyCompilationFinished += OnAssemblyCompilationFinished;
        }

        static void OnCompilationStarted(object obj)
        {
            Debug.Log("[MCP] Compilation started");
            SaveCompilationStatus("compiling", new List<CompilationMessage>());
        }

        static void OnCompilationFinished(object obj)
        {
            Debug.Log("[MCP] Compilation finished");
            
            // Get all compilation errors
            var messages = new List<CompilationMessage>();
            
            // Parse console for errors
            var logEntries = System.Type.GetType("UnityEditor.LogEntries, UnityEditor");
            if (logEntries != null)
            {
                var clearMethod = logEntries.GetMethod("Clear", System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public);
                var getCountMethod = logEntries.GetMethod("GetCount", System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public);
                var getEntryMethod = logEntries.GetMethod("GetEntryInternal", System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public);
                
                if (getCountMethod != null && getEntryMethod != null)
                {
                    int count = (int)getCountMethod.Invoke(null, null);
                    var entry = System.Activator.CreateInstance(System.Type.GetType("UnityEditor.LogEntry, UnityEditor"));
                    
                    for (int i = 0; i < count; i++)
                    {
                        getEntryMethod.Invoke(null, new object[] { i, entry });
                        
                        var condition = entry.GetType().GetField("condition").GetValue(entry) as string;
                        var file = entry.GetType().GetField("file").GetValue(entry) as string;
                        var line = (int)entry.GetType().GetField("line").GetValue(entry);
                        var mode = (int)entry.GetType().GetField("mode").GetValue(entry);
                        
                        if ((mode & 1) != 0 || (mode & 2) != 0) // Error or Assert
                        {
                            messages.Add(new CompilationMessage
                            {
                                message = condition,
                                file = file,
                                line = line,
                                type = "Error"
                            });
                        }
                        else if ((mode & 4) != 0) // Warning
                        {
                            messages.Add(new CompilationMessage
                            {
                                message = condition,
                                file = file,
                                line = line,
                                type = "Warning"
                            });
                        }
                    }
                }
            }
            
            SaveCompilationStatus("completed", messages);
        }

        static void OnAssemblyCompilationFinished(string assemblyPath, CompilerMessage[] messages)
        {
            Debug.Log($"[MCP] Assembly compiled: {assemblyPath} with {messages.Length} messages");
            
            var compilationMessages = messages.Select(m => new CompilationMessage
            {
                message = m.message,
                file = m.file,
                line = m.line,
                column = m.column,
                type = m.type.ToString()
            }).ToList();
            
            SaveCompilationStatus("assembly_compiled", compilationMessages, assemblyPath);
        }

        static void SaveCompilationStatus(string status, List<CompilationMessage> messages, string assembly = null)
        {
            var result = new CompilationResult
            {
                status = status,
                timestamp = System.DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                assembly = assembly,
                messages = messages,
                errorCount = messages.Count(m => m.type == "Error"),
                warningCount = messages.Count(m => m.type == "Warning")
            };
            
            var json = JsonUtility.ToJson(result, true);
            File.WriteAllText(ResultsPath, json);
        }

        [System.Serializable]
        public class CompilationResult
        {
            public string status;
            public string timestamp;
            public string assembly;
            public List<CompilationMessage> messages;
            public int errorCount;
            public int warningCount;
        }

        [System.Serializable]
        public class CompilationMessage
        {
            public string message;
            public string file;
            public int line;
            public int column;
            public string type;
        }

        [MenuItem("Tools/MCP/Force Compilation")]
        public static void ForceCompilation()
        {
            AssetDatabase.Refresh();
            CompilationPipeline.RequestScriptCompilation();
        }

        [MenuItem("Tools/MCP/Clear Compilation Results")]
        public static void ClearCompilationResults()
        {
            if (File.Exists(ResultsPath))
            {
                File.Delete(ResultsPath);
                Debug.Log("[MCP] Compilation results cleared");
            }
        }
    }
}`;

    await fs.writeFile(helperPath, helperContent, 'utf-8');
    
    // Generate meta file
    await this.metaFileManager.generateMetaFile(helperPath);

    // Trigger Unity refresh if available
    if (this.refreshService) {
      await this.refreshService.refreshUnityAssets();
    }

    return {
      content: [{
        type: 'text',
        text: `Compilation Helper installed successfully!\n` +
              `Location: Assets/Editor/CompilationHelper.cs\n\n` +
              `Features:\n` +
              `- Real-time compilation monitoring\n` +
              `- Detailed error capturing with file, line, and column info\n` +
              `- Results saved to Temp/UnityTempFile-CompilationResults.json\n` +
              `- Menu items added under Tools/MCP\n\n` +
              `Unity will need to compile this script first.`
      }]
    };
  }

  // Helper methods

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

  protected async parseEditorLogForErrors(): Promise<CompilationError[]> {
    const errors: CompilationError[] = [];
    
    try {
      const logPath = this.getEditorLogPath();
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.split('\n');
      
      // Look for compilation errors pattern
      const errorPattern = /(.+)\((\d+),(\d+)\):\s*(error|warning)\s*(\w+):\s*(.+)/;
      
      for (const line of lines) {
        const match = line.match(errorPattern);
        if (match) {
          errors.push({
            file: match[1],
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            errorCode: match[5],
            message: match[6],
            severity: match[4] as 'error' | 'warning'
          });
        }
      }
    } catch (error) {
      this.logger.info('Could not parse Editor.log for errors');
    }
    
    return errors;
  }

  protected async enhanceErrorsWithContext(errors: CompilationError[]): Promise<CompilationError[]> {
    for (const error of errors) {
      try {
        if (error.file && error.line > 0) {
          const fullPath = path.isAbsolute(error.file) 
            ? error.file 
            : path.join(this.unityProject!.projectPath, error.file);
            
          const content = await fs.readFile(fullPath, 'utf-8');
          const lines = content.split('\n');
          
          // Add context lines
          const startLine = Math.max(0, error.line - 3);
          const endLine = Math.min(lines.length, error.line + 2);
          
          const context = [];
          for (let i = startLine; i < endLine; i++) {
            const prefix = i === error.line - 1 ? '> ' : '  ';
            context.push(`${prefix}${i + 1}: ${lines[i]}`);
          }
          
          error.message += '\n\nCode context:\n' + context.join('\n');
        }
      } catch (e) {
        // Skip if can't read file
      }
    }
    
    return errors;
  }

  protected formatCompilationErrors(errors: CompilationError[]): string {
    if (errors.length === 0) {
      return 'No compilation errors found!\n\nNote: Make sure Unity has compiled recently.';
    }
    
    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;
    
    let output = `Compilation Results:\n`;
    output += `Errors: ${errorCount}, Warnings: ${warningCount}\n\n`;
    
    for (const error of errors) {
      const icon = error.severity === 'error' ? '❌' : '⚠️';
      const relativePath = path.relative(this.unityProject!.projectPath, error.file);
      
      output += `${icon} ${error.severity.toUpperCase()} ${error.errorCode}\n`;
      output += `   File: ${relativePath}:${error.line}:${error.column}\n`;
      output += `   ${error.message}\n\n`;
    }
    
    return output;
  }

  protected async forceUnityCompilation(): Promise<CompilationError[]> {
    // This would require Unity to be running or using Unity in batch mode
    // For now, return empty array and suggest using the helper script
    this.logger.info('Force compilation requested - requires Unity to be running');
    return [];
  }

  protected async isUnityCompiling(): Promise<boolean> {
    try {
      const lockFile = path.join(this.unityProject!.projectPath, 'Temp', 'UnityLockfile');
      await fs.access(lockFile);
      return true;
    } catch {
      return false;
    }
  }

  protected async getLastCompileTime(): Promise<string | null> {
    try {
      const assemblyPath = path.join(this.unityProject!.projectPath, 'Library', 'ScriptAssemblies', 'Assembly-CSharp.dll');
      const stats = await fs.stat(assemblyPath);
      return stats.mtime.toLocaleString();
    } catch {
      return null;
    }
  }

  protected async hasCompilationErrors(): Promise<boolean> {
    try {
      const failedPath = path.join(this.unityProject!.projectPath, 'Library', 'ScriptAssemblies', 'CompilationCompleted.txt');
      await fs.access(failedPath);
      return false;
    } catch {
      return true;
    }
  }

  protected getEditorLogPath(): string {
    const platform = process.platform;
    
    if (platform === 'darwin') {
      return path.join(process.env.HOME!, 'Library', 'Logs', 'Unity', 'Editor.log');
    } else if (platform === 'win32') {
      return path.join(process.env.LOCALAPPDATA!, 'Unity', 'Editor', 'Editor.log');
    } else {
      return path.join(process.env.HOME!, '.config', 'unity3d', 'Editor.log');
    }
  }

  protected async fileExists(filePath: string): Promise<boolean> {
    return pathExists(filePath);
  }
}