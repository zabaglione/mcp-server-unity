/**
 * Script Diff API for Unity MCP Bridge
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { UnityBridgeClient } from '../../unity-bridge/unity-bridge-client.js';
import { Logger } from '../../types/index.js';
import { 
  DiffOptions, 
  DiffResult, 
  PatchOptions, 
  PatchResult,
  PatchFile,
  CreateDiffOptions,
  ValidationResult,
  DiffError,
  DiffErrorCode
} from '../../diff/types.js';
import { DiffParser } from '../../diff/parser.js';
import { DiffApplierV2 as DiffApplier } from '../../diff/applier-v2.js';
import path from 'path';

export class ScriptDiffAPI {
  constructor(
    private bridge: UnityBridgeClient,
    private logger: Logger
  ) {}

  /**
   * Update a single file with diff
   */
  async updateDiff(
    filePath: string,
    diff: string,
    options: DiffOptions = {}
  ): Promise<CallToolResult> {
    this.logger.info(`Applying diff to: ${filePath}`);
    
    // Set defaults
    const opts: DiffOptions = {
      createBackup: true,
      validateSyntax: true,
      dryRun: false,
      partial: false,
      stopOnError: true,
      refreshAssets: true,
      reimportAssets: true,
      recompile: true,
      ...options
    };

    try {
      // Validate file path
      if (!filePath.startsWith('Assets/')) {
        throw new DiffError(
          DiffErrorCode.PERMISSION_DENIED,
          'File path must be within Assets folder',
          filePath
        );
      }

      // Read current file content
      this.logger.info(`Reading file for diff: ${filePath}`);
      
      let readResult;
      try {
        readResult = await this.bridge.sendRequest('Unity.Script.Read', {
          path: filePath
        });
        this.logger.info(`Unity.Script.Read completed, success: ${readResult?.success}`);
      } catch (error) {
        this.logger.error(`Unity.Script.Read failed: ${error}`);
        throw error;
      }

      if (!readResult.success || !readResult.content) {
        throw new DiffError(
          DiffErrorCode.FILE_NOT_FOUND,
          `File not found: ${filePath}`,
          filePath
        );
      }
      
      this.logger.info(`File read successfully, content length: ${readResult.content.length}`)

      const originalContent = readResult.content;
      let backupPath: string | undefined;

      // Create backup if requested
      if (opts.createBackup && !opts.dryRun) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        backupPath = `${filePath}.backup.${timestamp}`;
        
        await this.bridge.sendRequest('Unity.Script.Create', {
          fileName: path.basename(backupPath),
          content: originalContent,
          folder: path.dirname(backupPath)
        });
        
        this.logger.info(`Created backup: ${backupPath}`);
      }

      // Apply diff
      const { content: newContent, result } = DiffApplier.apply(
        originalContent,
        diff,
        opts
      );

      // Prepare result
      const diffResult: DiffResult = {
        success: result.success || false,
        path: filePath,
        hunksTotal: result.hunksTotal || 0,
        hunksApplied: result.hunksApplied || 0,
        hunksRejected: result.hunksRejected || 0,
        applied: result.applied || [],
        rejected: result.rejected || [],
        warnings: result.warnings || [],
        backupPath
      };

      // Dry run - return preview
      if (opts.dryRun) {
        diffResult.preview = newContent;
        
        return {
          content: [{
            type: 'text',
            text: this.formatDiffResult(diffResult, true)
          }]
        };
      }

      // Apply changes
      if (diffResult.success || (opts.partial && diffResult.hunksApplied > 0)) {
        // Write updated content
        await this.bridge.sendRequest('Unity.Script.Create', {
          fileName: path.basename(filePath),
          content: newContent,
          folder: path.dirname(filePath)
        });

        // Validate syntax if requested
        if (opts.validateSyntax) {
          const validationResult = await this.validateScript(filePath);
          diffResult.syntaxValid = validationResult.valid;
          diffResult.compileErrors = validationResult.errors;
        }

        // Unity integration
        if (opts.refreshAssets) {
          await this.bridge.sendRequest('Unity.AssetDatabase.Refresh', {});
        }

        if (opts.reimportAssets) {
          await this.bridge.sendRequest('Unity.AssetDatabase.ImportAsset', {
            path: filePath
          });
        }

        if (opts.recompile) {
          await this.bridge.sendRequest('Unity.CompilationPipeline.RequestScriptCompilation', {});
        }
      }

      return {
        content: [{
          type: 'text',
          text: this.formatDiffResult(diffResult, false)
        }]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to apply diff: ${errorMessage}`);
    }
  }

  /**
   * Apply patch to multiple files
   */
  async applyPatch(
    patch: string | PatchFile[],
    options: PatchOptions = {}
  ): Promise<CallToolResult> {
    this.logger.info('Applying patch to multiple files');

    const opts: PatchOptions = {
      atomic: true,
      continueOnError: false,
      createBackup: true,
      ...options
    };

    let patchFiles: PatchFile[];
    
    if (typeof patch === 'string') {
      // Check if it's a JSON array string
      if (patch.trim().startsWith('[')) {
        try {
          patchFiles = JSON.parse(patch);
          this.logger.info(`Parsed ${patchFiles.length} patch files from JSON`);
        } catch (e) {
          // If not JSON, try to parse as Git patch
          patchFiles = this.parsePatchString(patch);
          this.logger.info(`Parsed ${patchFiles.length} patch files from Git format`);
        }
      } else {
        patchFiles = this.parsePatchString(patch);
        this.logger.info(`Parsed ${patchFiles.length} patch files from Git format`);
      }
    } else {
      patchFiles = patch;
    }

    // Sort by priority
    patchFiles.sort((a, b) => (a.priority || 0) - (b.priority || 0));

    const results = new Map<string, DiffResult>();
    const backupPaths: string[] = [];
    let filesProcessed = 0;
    let filesSucceeded = 0;
    let filesFailed = 0;

    try {
      for (const patchFile of patchFiles) {
        if (opts.onProgress) {
          opts.onProgress(filesProcessed, patchFiles.length, patchFile.path);
        }

        try {
          const result = await this.updateDiff(
            patchFile.path,
            patchFile.diff,
            { ...opts, dryRun: false }
          );

          // Extract DiffResult from CallToolResult
          const text = (result.content[0] as any).text as string;
          const diffResult: DiffResult = JSON.parse(
            text.split('\n').slice(1).join('\n')
          );

          results.set(patchFile.path, diffResult);
          
          if (diffResult.backupPath) {
            backupPaths.push(diffResult.backupPath);
          }

          if (diffResult.success) {
            filesSucceeded++;
          } else {
            filesFailed++;
          }

        } catch (error) {
          filesFailed++;
          
          if (!opts.continueOnError) {
            // Rollback if atomic
            if (opts.atomic && backupPaths.length > 0) {
              await this.rollbackChanges(backupPaths, results);
            }
            throw error;
          }

          // Continue with error recorded
          results.set(patchFile.path, {
            success: false,
            path: patchFile.path,
            hunksTotal: 0,
            hunksApplied: 0,
            hunksRejected: 0,
            applied: [],
            rejected: [],
            warnings: [error instanceof Error ? error.message : String(error)]
          });
        }

        filesProcessed++;
      }

      const patchResult: PatchResult = {
        success: filesFailed === 0,
        filesTotal: patchFiles.length,
        filesProcessed,
        filesSucceeded,
        filesFailed,
        results,
        rollbackAvailable: backupPaths.length > 0,
        rollbackPaths: backupPaths
      };

      return {
        content: [{
          type: 'text',
          text: this.formatPatchResult(patchResult)
        }]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to apply patch: ${errorMessage}`);
    }
  }

  /**
   * Create diff between two contents or files
   */
  async createDiff(
    original: string | { path: string },
    modified: string | { path: string },
    options: CreateDiffOptions = {}
  ): Promise<CallToolResult> {
    const opts: CreateDiffOptions = {
      contextLines: 3,
      includeHeader: true,
      ...options
    };

    try {
      // Get content
      const originalContent = typeof original === 'string' 
        ? original 
        : await this.readFileContent(original.path);
      
      const modifiedContent = typeof modified === 'string'
        ? modified
        : await this.readFileContent(modified.path);

      const oldPath = typeof original === 'string' ? 'original' : original.path;
      const newPath = typeof modified === 'string' ? 'modified' : modified.path;

      const diff = DiffParser.createDiff(
        originalContent,
        modifiedContent,
        oldPath,
        newPath,
        opts.contextLines
      );

      return {
        content: [{
          type: 'text',
          text: diff
        }]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create diff: ${errorMessage}`);
    }
  }

  /**
   * Validate diff before applying
   */
  async validateDiff(
    filePath: string,
    diff: string
  ): Promise<CallToolResult> {
    this.logger.info(`Starting diff validation for: ${filePath}`);
    this.logger.info(`Diff length: ${diff.length} characters`);
    
    try {
      // Validate diff format
      this.logger.info('Validating diff format...');
      const formatValidation = DiffParser.validate(diff);
      
      if (!formatValidation.valid) {
        this.logger.warn('Diff format validation failed');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              valid: false,
              applicable: false,
              conflicts: [],
              warnings: formatValidation.errors
            } as ValidationResult, null, 2)
          }]
        };
      }
      
      this.logger.info('Diff format is valid, proceeding with dry run...');

      // Try dry run
      const dryRunResult = await this.updateDiff(filePath, diff, {
        dryRun: true,
        createBackup: false,
        validateSyntax: false,
        refreshAssets: false
      });
      
      this.logger.info('Dry run completed, parsing results...');

      // Parse dry run result
      const dryRunText = (dryRunResult.content[0] as any).text as string;
      const result = JSON.parse(
        dryRunText.split('\n').slice(1).join('\n')
      ) as DiffResult;

      const validation: ValidationResult = {
        valid: formatValidation.valid,
        applicable: result.success,
        conflicts: result.rejected.map((r) => ({
          hunkIndex: r.hunkIndex,
          line: result.applied[0]?.startLine || 0,
          description: r.reason
        })),
        warnings: result.warnings
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(validation, null, 2)
        }]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to validate diff: ${errorMessage}`);
    }
  }

  /**
   * Format diff result for display
   */
  private formatDiffResult(result: DiffResult, isDryRun: boolean): string {
    const lines: string[] = [];
    
    lines.push(`Diff ${isDryRun ? 'Preview' : 'Result'}: ${result.path}`);
    lines.push(`Success: ${result.success}`);
    lines.push(`Hunks: ${result.hunksApplied}/${result.hunksTotal} applied`);
    
    if (result.hunksRejected > 0) {
      lines.push(`Rejected: ${result.hunksRejected} hunks`);
      result.rejected.forEach(r => {
        lines.push(`  - Hunk ${r.hunkIndex}: ${r.reason}`);
        if (r.suggestion) {
          lines.push(`    Suggestion: ${r.suggestion}`);
        }
      });
    }
    
    if (result.warnings.length > 0) {
      lines.push('Warnings:');
      result.warnings.forEach(w => lines.push(`  - ${w}`));
    }
    
    if (result.backupPath) {
      lines.push(`Backup: ${result.backupPath}`);
    }
    
    if (result.syntaxValid !== undefined) {
      lines.push(`Syntax: ${result.syntaxValid ? 'Valid' : 'Invalid'}`);
      if (result.compileErrors && result.compileErrors.length > 0) {
        lines.push('Compile errors:');
        result.compileErrors.forEach(e => lines.push(`  - ${e}`));
      }
    }
    
    if (isDryRun && result.preview) {
      lines.push('\nPreview (first 20 lines):');
      const previewLines = result.preview.split('\n').slice(0, 20);
      previewLines.forEach((line, i) => lines.push(`${i + 1}: ${line}`));
      if (result.preview.split('\n').length > 20) {
        lines.push('... (truncated)');
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Format patch result for display
   */
  private formatPatchResult(result: PatchResult): string {
    const lines: string[] = [];
    
    lines.push(`Patch Result: ${result.filesSucceeded}/${result.filesTotal} files succeeded`);
    lines.push(`Success: ${result.success}`);
    lines.push(`Files processed: ${result.filesProcessed}`);
    lines.push(`Files failed: ${result.filesFailed}`);
    
    if (result.rollbackAvailable) {
      lines.push(`Rollback available: ${result.rollbackPaths?.length} backups`);
    }
    
    lines.push('\nFile Results:');
    result.results.forEach((fileResult, filePath) => {
      lines.push(`  ${filePath}: ${fileResult.success ? 'SUCCESS' : 'FAILED'}`);
      lines.push(`    Hunks: ${fileResult.hunksApplied}/${fileResult.hunksTotal}`);
      if (fileResult.warnings.length > 0) {
        lines.push(`    Warnings: ${fileResult.warnings.join(', ')}`);
      }
    });
    
    return lines.join('\n');
  }

  /**
   * Parse Git-style patch string into PatchFile array
   */
  private parsePatchString(patch: string): PatchFile[] {
    const patchFiles: PatchFile[] = [];
    const lines = patch.split('\n');
    let currentFile: PatchFile | null = null;
    let currentDiff: string[] = [];

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        // Save previous file if exists
        if (currentFile && currentDiff.length > 0) {
          currentFile.diff = currentDiff.join('\n');
          patchFiles.push(currentFile);
        }

        // Extract file path from git diff header
        const match = line.match(/diff --git a\/(.*) b\/(.*)/);
        if (match) {
          currentFile = {
            path: match[2] || match[1],
            diff: ''
          };
          currentDiff = [];
        }
      } else if (currentFile) {
        currentDiff.push(line);
      }
    }

    // Save last file
    if (currentFile && currentDiff.length > 0) {
      currentFile.diff = currentDiff.join('\n');
      patchFiles.push(currentFile);
    }

    return patchFiles;
  }

  /**
   * Read file content
   */
  private async readFileContent(filePath: string): Promise<string> {
    const result = await this.bridge.sendRequest('Unity.Script.Read', {
      path: filePath
    });

    if (!result.success || !result.content) {
      throw new DiffError(
        DiffErrorCode.FILE_NOT_FOUND,
        `File not found: ${filePath}`,
        filePath
      );
    }

    return result.content;
  }

  /**
   * Validate script syntax
   */
  private async validateScript(filePath: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const result = await this.bridge.sendRequest('Unity.Script.ValidateSyntax', {
        path: filePath
      });

      return {
        valid: result.valid || false,
        errors: result.errors || []
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Rollback changes using backups
   */
  private async rollbackChanges(
    backupPaths: string[],
    results: Map<string, DiffResult>
  ): Promise<void> {
    this.logger.info('Rolling back changes...');

    for (const backupPath of backupPaths) {
      try {
        // Find original file from results
        const originalPath = Array.from(results.entries())
          .find(([_, result]) => result.backupPath === backupPath)?.[0];

        if (originalPath) {
          // Read backup content
          const backupContent = await this.readFileContent(backupPath);
          
          // Restore original content
          await this.bridge.sendRequest('Unity.Script.Create', {
            fileName: path.basename(originalPath),
            content: backupContent,
            folder: path.dirname(originalPath)
          });

          // Delete backup
          await this.bridge.sendRequest('Unity.Script.Delete', {
            path: backupPath
          });

          this.logger.info(`Rolled back: ${originalPath}`);
        }
      } catch (error) {
        this.logger.error(`Failed to rollback ${backupPath}: ${error}`);
      }
    }
  }
}