import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import { pathExists } from '../utils/file-utils.js';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface CompilerInfo {
  name: string;
  path: string;
  type: 'roslyn' | 'dotnet' | 'mono' | 'unity';
  version?: string;
}

interface CompilationError {
  file: string;
  line: number;
  column: number;
  errorCode: string;
  message: string;
  severity: 'error' | 'warning';
}

interface CompilationResult {
  success: boolean;
  errors: CompilationError[];
  warnings: CompilationError[];
  outputPath?: string;
  compilationTime: number;
  compiler: CompilerInfo;
}

export class StandaloneCompilationService extends BaseService {
  private availableCompilers: CompilerInfo[] = [];
  private unityAssemblies: string[] = [];
  private packageAssemblies: string[] = [];
  
  constructor(logger: any) {
    super(logger);
  }

  /**
   * Initialize the service and discover available compilers and assemblies
   */
  async initialize(): Promise<void> {
    this.ensureProjectSet();
    
    // Discover available compilers
    this.availableCompilers = await this.discoverCompilers();
    this.logger.info(`Found ${this.availableCompilers.length} C# compilers`);
    
    // Discover Unity assemblies
    this.unityAssemblies = await this.discoverUnityAssemblies();
    this.logger.info(`Found ${this.unityAssemblies.length} Unity assemblies`);
    
    // Discover package assemblies
    this.packageAssemblies = await this.discoverPackageAssemblies();
    this.logger.info(`Found ${this.packageAssemblies.length} package assemblies`);
  }

  /**
   * Compile Unity scripts directly using system C# compiler
   */
  async compileScripts(options: {
    outputPath?: string;
    targetFramework?: string;
    additionalReferences?: string[];
    defines?: string[];
    includeTestAssemblies?: boolean;
  } = {}): Promise<CallToolResult> {
    try {
      if (this.availableCompilers.length === 0) {
        await this.initialize();
      }

      const compiler = this.getBestCompiler();
      if (!compiler) {
        throw new Error('No suitable C# compiler found');
      }

      const startTime = Date.now();
      const result = await this.performCompilation(compiler, options);
      result.compilationTime = Date.now() - startTime;

      return this.formatCompilationResult(result);
    } catch (error) {
      this.logger.error('Standalone compilation failed:', error);
      throw error;
    }
  }

  /**
   * Get compilation capabilities (available compilers and references)
   */
  async getCompilationCapabilities(): Promise<CallToolResult> {
    if (this.availableCompilers.length === 0) {
      await this.initialize();
    }

    return {
      content: [{
        type: 'text',
        text: `Standalone C# Compilation Capabilities\n` +
              `=====================================\n\n` +
              `Available Compilers:\n` +
              `${this.availableCompilers.map((c, i) => 
                `${i + 1}. ${c.name} (${c.type}) - ${c.path}\n` +
                `   Version: ${c.version || 'Unknown'}`
              ).join('\n')}\n\n` +
              `Unity Assemblies: ${this.unityAssemblies.length}\n` +
              `Package Assemblies: ${this.packageAssemblies.length}\n\n` +
              `Primary Compiler: ${this.getBestCompiler()?.name || 'None'}\n` +
              `Unity Installation: ${await this.getUnityInstallPath() || 'Not found'}`
      }]
    };
  }

  /**
   * Discover available C# compilers on the system
   */
  private async discoverCompilers(): Promise<CompilerInfo[]> {
    const compilers: CompilerInfo[] = [];

    // 1. Try Roslyn (preferred)
    try {
      const { stdout } = await execAsync('where csc', { timeout: 5000 }).catch(() => 
        execAsync('which csc', { timeout: 5000 })
      );
      if (stdout.trim()) {
        const cscPath = stdout.trim().split('\n')[0];
        const version = await this.getCompilerVersion(cscPath, 'roslyn');
        compilers.push({
          name: 'Roslyn (csc)',
          path: cscPath,
          type: 'roslyn',
          version
        });
      }
    } catch (e) {
      // Roslyn not found
    }

    // 2. Try .NET Core/5+ compiler
    try {
      const { stdout } = await execAsync('dotnet --version', { timeout: 5000 });
      if (stdout.trim()) {
        compilers.push({
          name: '.NET CLI',
          path: 'dotnet',
          type: 'dotnet',
          version: stdout.trim()
        });
      }
    } catch (e) {
      // .NET CLI not found
    }

    // 3. Try Mono compiler
    try {
      const { stdout } = await execAsync('mcs --version', { timeout: 5000 });
      if (stdout.trim()) {
        const version = stdout.split('\n')[0];
        compilers.push({
          name: 'Mono (mcs)',
          path: 'mcs',
          type: 'mono',
          version
        });
      }
    } catch (e) {
      // Mono not found
    }

    // 4. Try Unity bundled compiler
    const unityCompilerPath = await this.findUnityBundledCompiler();
    if (unityCompilerPath) {
      const version = await this.getCompilerVersion(unityCompilerPath, 'unity');
      compilers.push({
        name: 'Unity Bundled',
        path: unityCompilerPath,
        type: 'unity',
        version
      });
    }

    return compilers;
  }

  /**
   * Discover Unity assemblies
   */
  private async discoverUnityAssemblies(): Promise<string[]> {
    const assemblies: string[] = [];
    const unityInstallPath = await this.getUnityInstallPath();
    
    if (!unityInstallPath) {
      this.logger.warn('Unity installation not found');
      return assemblies;
    }

    // Common Unity assembly paths
    const assemblyPaths = [
      path.join(unityInstallPath, 'Managed'),
      path.join(unityInstallPath, 'UnityExtensions/Unity'),
      path.join(unityInstallPath, 'PlaybackEngines')
    ];

    for (const assemblyPath of assemblyPaths) {
      if (await pathExists(assemblyPath)) {
        const dlls = await this.findDllsRecursive(assemblyPath);
        assemblies.push(...dlls);
      }
    }

    // Essential Unity assemblies (fallback if not found)
    const essentialAssemblies = [
      'UnityEngine.dll',
      'UnityEngine.CoreModule.dll',
      'UnityEditor.dll',
      'mscorlib.dll',
      'System.dll',
      'System.Core.dll'
    ];

    // Try to find essential assemblies if not already found
    for (const essential of essentialAssemblies) {
      if (!assemblies.some(a => a.endsWith(essential))) {
        const found = await this.findAssemblyInUnityInstall(essential);
        if (found) {
          assemblies.push(found);
        }
      }
    }

    return assemblies;
  }

  /**
   * Discover package assemblies from Unity packages
   */
  private async discoverPackageAssemblies(): Promise<string[]> {
    const assemblies: string[] = [];
    const packageCachePath = path.join(this.unityProject!.projectPath, 'Library', 'PackageCache');
    
    if (await pathExists(packageCachePath)) {
      const dlls = await this.findDllsRecursive(packageCachePath);
      assemblies.push(...dlls);
    }

    return assemblies;
  }

  /**
   * Find all DLL files recursively in a directory
   */
  private async findDllsRecursive(directory: string): Promise<string[]> {
    const dlls: string[] = [];
    
    try {
      const items = await fs.readdir(directory, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(directory, item.name);
        
        if (item.isDirectory()) {
          const subDlls = await this.findDllsRecursive(fullPath);
          dlls.push(...subDlls);
        } else if (item.isFile() && item.name.endsWith('.dll')) {
          dlls.push(fullPath);
        }
      }
    } catch (error) {
      // Directory not accessible
    }
    
    return dlls;
  }

  /**
   * Get the best available compiler (prioritize Roslyn > .NET > Mono > Unity)
   */
  private getBestCompiler(): CompilerInfo | null {
    const priority = ['roslyn', 'dotnet', 'mono', 'unity'];
    
    for (const type of priority) {
      const compiler = this.availableCompilers.find(c => c.type === type);
      if (compiler) {
        return compiler;
      }
    }
    
    return this.availableCompilers[0] || null;
  }

  /**
   * Perform the actual compilation
   */
  private async performCompilation(
    compiler: CompilerInfo, 
    options: {
      outputPath?: string;
      targetFramework?: string;
      additionalReferences?: string[];
      defines?: string[];
      includeTestAssemblies?: boolean;
    }
  ): Promise<CompilationResult> {
    // Gather all C# files
    const scriptFiles = await this.gatherScriptFiles(options.includeTestAssemblies);
    
    if (scriptFiles.length === 0) {
      throw new Error('No C# script files found to compile');
    }

    // Build compilation arguments
    const args = await this.buildCompilerArguments(compiler, scriptFiles, options);
    
    // Execute compilation
    const { success, output } = await this.executeCompilation(compiler, args);
    
    // Parse errors and warnings
    const errors = this.parseCompilerOutput(output, 'error');
    const warnings = this.parseCompilerOutput(output, 'warning');
    
    return {
      success,
      errors,
      warnings,
      outputPath: options.outputPath,
      compilationTime: 0, // Will be set by caller
      compiler
    };
  }

  /**
   * Gather all C# script files in the project
   */
  private async gatherScriptFiles(includeTestAssemblies: boolean = false): Promise<string[]> {
    const scriptFiles: string[] = [];
    const assetsPath = this.unityProject!.assetsPath;
    
    const files = await this.findFilesRecursive(assetsPath, '.cs');
    
    for (const file of files) {
      // Skip Editor scripts unless specifically requested
      if (!includeTestAssemblies && file.includes('/Editor/')) {
        continue;
      }
      
      // Skip test assemblies unless specifically requested
      if (!includeTestAssemblies && (
        file.includes('/Tests/') || 
        file.includes('/Test/') ||
        file.toLowerCase().includes('test')
      )) {
        continue;
      }
      
      scriptFiles.push(file);
    }
    
    return scriptFiles;
  }

  /**
   * Find files with specific extension recursively
   */
  private async findFilesRecursive(directory: string, extension: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const items = await fs.readdir(directory, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(directory, item.name);
        
        if (item.isDirectory()) {
          const subFiles = await this.findFilesRecursive(fullPath, extension);
          files.push(...subFiles);
        } else if (item.isFile() && item.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory not accessible
    }
    
    return files;
  }

  /**
   * Build compiler arguments
   */
  private async buildCompilerArguments(
    compiler: CompilerInfo,
    scriptFiles: string[],
    options: any
  ): Promise<string[]> {
    const args: string[] = [];
    
    if (compiler.type === 'dotnet') {
      // Use dotnet build approach
      return this.buildDotnetArguments(scriptFiles, options);
    }
    
    // Standard compiler arguments
    args.push('-target:library');
    args.push('-platform:anycpu');
    
    // Output path
    const outputPath = options.outputPath || path.join(
      this.unityProject!.projectPath, 
      'Temp', 
      'StandaloneCompilation.dll'
    );
    args.push(`-out:${outputPath}`);
    
    // References
    const allReferences = [
      ...this.unityAssemblies,
      ...this.packageAssemblies,
      ...(options.additionalReferences || [])
    ];
    
    for (const reference of allReferences) {
      args.push(`-reference:${reference}`);
    }
    
    // Defines
    const defines = [
      'UNITY_EDITOR',
      'UNITY_STANDALONE',
      'UNITY_2021_1_OR_NEWER',
      ...(options.defines || [])
    ];
    
    if (defines.length > 0) {
      args.push(`-define:${defines.join(';')}`);
    }
    
    // Warning level
    args.push('-warn:4');
    args.push('-nowarn:0169,0649'); // Disable common Unity warnings
    
    // Script files
    args.push(...scriptFiles);
    
    return args;
  }

  /**
   * Build .NET CLI specific arguments
   */
  private buildDotnetArguments(_scriptFiles: string[], _options: any): string[] {
    // For .NET CLI, we create a temporary project file
    return ['build', '--no-restore', '--verbosity', 'normal'];
  }

  /**
   * Execute the compilation
   */
  private async executeCompilation(
    compiler: CompilerInfo, 
    args: string[]
  ): Promise<{ success: boolean; output: string }> {
    try {
      const command = `"${compiler.path}" ${args.join(' ')}`;
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 60000,
        maxBuffer: 1024 * 1024 // 1MB buffer
      });
      
      const output = stdout + stderr;
      const success = !output.toLowerCase().includes('error');
      
      return { success, output };
    } catch (error: any) {
      return { 
        success: false, 
        output: error.stdout + error.stderr || error.message 
      };
    }
  }

  /**
   * Parse compiler output for errors and warnings
   */
  private parseCompilerOutput(output: string, type: 'error' | 'warning'): CompilationError[] {
    const results: CompilationError[] = [];
    const lines = output.split('\n');
    
    // Pattern for C# compiler errors/warnings
    const pattern = new RegExp(
      `^(.+?)\\((\\d+),(\\d+)\\):\\s*(${type})\\s+(\\w+):\\s*(.+)$`,
      'i'
    );
    
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        results.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          errorCode: match[5],
          message: match[6].trim(),
          severity: type
        });
      }
    }
    
    return results;
  }

  /**
   * Format compilation result for output
   */
  private formatCompilationResult(result: CompilationResult): CallToolResult {
    let output = `Standalone C# Compilation Results\n`;
    output += `================================\n\n`;
    output += `Compiler: ${result.compiler.name} (${result.compiler.type})\n`;
    output += `Success: ${result.success ? 'Yes' : 'No'}\n`;
    output += `Compilation Time: ${result.compilationTime}ms\n`;
    output += `Errors: ${result.errors.length}\n`;
    output += `Warnings: ${result.warnings.length}\n`;
    
    if (result.outputPath) {
      output += `Output: ${result.outputPath}\n`;
    }
    
    output += '\n';
    
    // Format errors
    if (result.errors.length > 0) {
      output += 'COMPILATION ERRORS:\n';
      output += '──────────────────\n';
      
      for (const error of result.errors) {
        const relativePath = path.relative(this.unityProject!.projectPath, error.file);
        output += `\n❌ ${error.severity.toUpperCase()} ${error.errorCode}\n`;
        output += `   File: ${relativePath}:${error.line}:${error.column}\n`;
        output += `   ${error.message}\n`;
      }
    }
    
    // Format warnings
    if (result.warnings.length > 0) {
      output += '\nCOMPILATION WARNINGS:\n';
      output += '───────────────────\n';
      
      for (const warning of result.warnings) {
        const relativePath = path.relative(this.unityProject!.projectPath, warning.file);
        output += `\n⚠️ ${warning.severity.toUpperCase()} ${warning.errorCode}\n`;
        output += `   File: ${relativePath}:${warning.line}:${warning.column}\n`;
        output += `   ${warning.message}\n`;
      }
    }
    
    if (result.success && result.errors.length === 0) {
      output += '\n✅ Compilation completed successfully!\n';
    }
    
    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  }

  /**
   * Get Unity installation path
   */
  private async getUnityInstallPath(): Promise<string | null> {
    const platform = process.platform;
    const commonPaths = [];
    
    if (platform === 'win32') {
      commonPaths.push(
        'C:/Program Files/Unity/Hub/Editor',
        'C:/Program Files/Unity/Editor',
        'C:/Program Files (x86)/Unity/Editor'
      );
    } else if (platform === 'darwin') {
      commonPaths.push(
        '/Applications/Unity/Hub/Editor',
        '/Applications/Unity'
      );
    } else {
      commonPaths.push(
        '/opt/Unity/Editor',
        '/usr/share/Unity/Editor'
      );
    }
    
    for (const basePath of commonPaths) {
      if (await pathExists(basePath)) {
        // Try to find the latest version
        try {
          const versions = await fs.readdir(basePath);
          const latestVersion = versions
            .filter(v => v.match(/^\d+\.\d+\.\d+/))
            .sort()
            .pop();
          
          if (latestVersion) {
            const fullPath = path.join(basePath, latestVersion);
            if (await pathExists(fullPath)) {
              return fullPath;
            }
          }
        } catch (error) {
          // Continue to next path
        }
        
        return basePath;
      }
    }
    
    return null;
  }

  /**
   * Find Unity bundled compiler
   */
  private async findUnityBundledCompiler(): Promise<string | null> {
    const unityPath = await this.getUnityInstallPath();
    if (!unityPath) return null;
    
    const platform = process.platform;
    let compilerName = 'csc.exe';
    
    if (platform === 'darwin' || platform === 'linux') {
      compilerName = 'csc';
    }
    
    const possiblePaths = [
      path.join(unityPath, 'Data', 'MonoBleedingEdge', 'lib', 'mono', '4.5', compilerName),
      path.join(unityPath, 'Data', 'Tools', compilerName),
      path.join(unityPath, 'Contents', 'MonoBleedingEdge', 'lib', 'mono', '4.5', compilerName)
    ];
    
    for (const compilerPath of possiblePaths) {
      if (await pathExists(compilerPath)) {
        return compilerPath;
      }
    }
    
    return null;
  }

  /**
   * Find assembly in Unity installation
   */
  private async findAssemblyInUnityInstall(assemblyName: string): Promise<string | null> {
    const unityPath = await this.getUnityInstallPath();
    if (!unityPath) return null;
    
    const searchPaths = [
      path.join(unityPath, 'Data', 'Managed'),
      path.join(unityPath, 'Data', 'UnityExtensions', 'Unity'),
      path.join(unityPath, 'Contents', 'Managed'),
      path.join(unityPath, 'Contents', 'UnityExtensions', 'Unity')
    ];
    
    for (const searchPath of searchPaths) {
      const assemblyPath = path.join(searchPath, assemblyName);
      if (await pathExists(assemblyPath)) {
        return assemblyPath;
      }
    }
    
    return null;
  }

  /**
   * Get compiler version
   */
  private async getCompilerVersion(compilerPath: string, type: string): Promise<string | undefined> {
    try {
      let versionCommand = '';
      
      switch (type) {
        case 'roslyn':
        case 'unity':
          versionCommand = `"${compilerPath}" -version`;
          break;
        case 'mono':
          versionCommand = `"${compilerPath}" --version`;
          break;
        default:
          return undefined;
      }
      
      const { stdout } = await execAsync(versionCommand, { timeout: 5000 });
      return stdout.trim().split('\n')[0];
    } catch (error) {
      return undefined;
    }
  }
}