import path from 'path';
import fs from 'fs/promises';
import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import { findFirstFile } from '../utils/optimized-file-utils.js';
import { writeFileAtomic } from '../utils/atomic-write.js';
import { hasUTF8BOM, removeUTF8BOM, ensureUTF8BOM } from '../utils/utf8-utils.js';

/**
 * Diff-based patch format for more intuitive updates
 */
export interface DiffPatch {
  // Line-based approach
  startLine?: number;
  endLine?: number;
  
  // Pattern-based approach (more flexible)
  searchPattern?: string;
  
  // Context lines for verification (optional but recommended)
  contextBefore?: string[];
  contextAfter?: string[];
  
  // The actual change
  oldContent?: string;
  newContent: string;
  
  // Options
  matchMode?: 'exact' | 'fuzzy' | 'regex';
  occurrence?: number; // Which occurrence to replace (default: 1)
}

export interface DiffUpdateOptions {
  fileName: string;
  patches: DiffPatch[];
  validateContext?: boolean; // Default: true
  dryRun?: boolean; // Preview changes without applying
}

/**
 * Service for diff-based script updates
 */
export class DiffBasedUpdateService extends BaseService {
  constructor(logger: Logger) {
    super(logger);
  }

  /**
   * Apply diff-based patches to a script
   */
  async updateScriptWithDiff(options: DiffUpdateOptions): Promise<CallToolResult> {
    this.ensureProjectSet();

    const { fileName, patches, validateContext = true, dryRun = false } = options;

    // Find the script file
    const scriptPath = await findFirstFile({
      directory: this.unityProject!.assetsPath,
      fileName: path.basename(fileName, '.cs'),
      extension: '.cs',
      useCache: true
    });
    
    if (!scriptPath) {
      throw new Error(`Script not found: ${fileName}`);
    }

    // Read current content
    const originalContent = await fs.readFile(scriptPath, 'utf-8');
    
    // Handle BOM
    const hadBOM = hasUTF8BOM(originalContent);
    let content = removeUTF8BOM(originalContent);
    
    // Split into lines for processing
    const lines = content.split('\n');
    const appliedPatches: Array<{patch: DiffPatch, location: string, preview: string}> = [];
    
    // Apply each patch
    for (const patch of patches) {
      try {
        const result = this.applyPatch(lines, patch, validateContext);
        appliedPatches.push(result);
        
        if (!dryRun) {
          lines.splice(result.startLine, result.linesToRemove, ...result.newLines);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to apply patch: ${errorMessage}\nPatch: ${JSON.stringify(patch, null, 2)}`);
      }
    }

    // Join lines back
    content = lines.join('\n');
    
    // Restore BOM if needed
    if (hadBOM) {
      content = ensureUTF8BOM(content);
    }

    if (dryRun) {
      // Return preview without writing
      return {
        content: [{
          type: 'text',
          text: this.formatDryRunResult(fileName, appliedPatches)
        }]
      };
    }

    // Write updated content atomically
    await writeFileAtomic(scriptPath, content, 'utf-8');
    
    this.logger.info(`Applied ${patches.length} diff patches to script: ${scriptPath}`);

    // Trigger Unity refresh if available
    if (this.refreshService) {
      await this.refreshService.refreshUnityAssets();
    }

    return {
      content: [{
        type: 'text',
        text: this.formatUpdateResult(fileName, appliedPatches)
      }]
    };
  }

  /**
   * Apply a single patch to lines array
   */
  private applyPatch(
    lines: string[], 
    patch: DiffPatch, 
    validateContext: boolean
  ): {patch: DiffPatch, location: string, preview: string, startLine: number, linesToRemove: number, newLines: string[]} {
    
    let startLine: number;
    let endLine: number;
    
    // Determine target location
    if (patch.startLine !== undefined) {
      // Line-based approach
      startLine = patch.startLine - 1; // Convert to 0-based
      endLine = patch.endLine !== undefined ? patch.endLine - 1 : startLine;
    } else if (patch.searchPattern) {
      // Pattern-based approach
      const searchResult = this.findPattern(lines, patch);
      startLine = searchResult.startLine;
      endLine = searchResult.endLine;
    } else if (patch.oldContent) {
      // Content-based search
      const searchResult = this.findContent(lines, patch.oldContent);
      startLine = searchResult.startLine;
      endLine = searchResult.endLine;
    } else {
      throw new Error('Patch must specify either startLine, searchPattern, or oldContent');
    }

    // Validate bounds
    if (startLine < 0 || startLine >= lines.length) {
      throw new Error(`Invalid line number: ${startLine + 1} (file has ${lines.length} lines)`);
    }

    // Validate context if requested
    if (validateContext && patch.contextBefore) {
      for (let i = 0; i < patch.contextBefore.length; i++) {
        const contextLine = startLine - patch.contextBefore.length + i;
        if (contextLine < 0 || lines[contextLine].trim() !== patch.contextBefore[i].trim()) {
          throw new Error(`Context validation failed. Expected "${patch.contextBefore[i]}" at line ${contextLine + 1}`);
        }
      }
    }

    if (validateContext && patch.contextAfter) {
      for (let i = 0; i < patch.contextAfter.length; i++) {
        const contextLine = endLine + 1 + i;
        if (contextLine >= lines.length || lines[contextLine].trim() !== patch.contextAfter[i].trim()) {
          throw new Error(`Context validation failed. Expected "${patch.contextAfter[i]}" at line ${contextLine + 1}`);
        }
      }
    }

    // Prepare new content
    const newLines = patch.newContent.split('\n');
    const linesToRemove = endLine - startLine + 1;
    
    // Create preview
    const preview = this.createPreview(lines, startLine, endLine, newLines);
    
    return {
      patch,
      location: `lines ${startLine + 1}-${endLine + 1}`,
      preview,
      startLine,
      linesToRemove,
      newLines
    };
  }

  /**
   * Find pattern in lines
   */
  private findPattern(lines: string[], patch: DiffPatch): {startLine: number, endLine: number} {
    const pattern = patch.searchPattern!;
    const mode = patch.matchMode || 'exact';
    const occurrence = patch.occurrence || 1;
    
    let found = 0;
    
    for (let i = 0; i < lines.length; i++) {
      let matches = false;
      
      switch (mode) {
        case 'exact':
          matches = lines[i].includes(pattern);
          break;
        case 'fuzzy':
          matches = lines[i].toLowerCase().includes(pattern.toLowerCase());
          break;
        case 'regex':
          matches = new RegExp(pattern).test(lines[i]);
          break;
      }
      
      if (matches) {
        found++;
        if (found === occurrence) {
          return { startLine: i, endLine: i };
        }
      }
    }
    
    throw new Error(`Pattern not found: "${pattern}" (occurrence: ${occurrence})`);
  }

  /**
   * Find multi-line content in lines
   */
  private findContent(lines: string[], content: string): {startLine: number, endLine: number} {
    const searchLines = content.split('\n');
    const searchLength = searchLines.length;
    
    // Try to find exact match first
    for (let i = 0; i <= lines.length - searchLength; i++) {
      let matches = true;
      
      for (let j = 0; j < searchLength; j++) {
        if (lines[i + j].trim() !== searchLines[j].trim()) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        return { startLine: i, endLine: i + searchLength - 1 };
      }
    }
    
    throw new Error(`Content not found: "${content.substring(0, 50)}..."`);
  }

  /**
   * Create a preview of the change
   */
  private createPreview(lines: string[], startLine: number, endLine: number, newLines: string[]): string {
    const contextSize = 2;
    const preview: string[] = [];
    
    // Before context
    for (let i = Math.max(0, startLine - contextSize); i < startLine; i++) {
      preview.push(`  ${i + 1}: ${lines[i]}`);
    }
    
    // Old lines (to be removed)
    for (let i = startLine; i <= endLine; i++) {
      preview.push(`- ${i + 1}: ${lines[i]}`);
    }
    
    // New lines (to be added)
    let lineNum = startLine + 1;
    for (const newLine of newLines) {
      preview.push(`+ ${lineNum}: ${newLine}`);
      lineNum++;
    }
    
    // After context
    for (let i = endLine + 1; i < Math.min(lines.length, endLine + 1 + contextSize); i++) {
      preview.push(`  ${i + 1}: ${lines[i]}`);
    }
    
    return preview.join('\n');
  }

  /**
   * Format dry run result
   */
  private formatDryRunResult(fileName: string, appliedPatches: Array<{patch: DiffPatch, location: string, preview: string}>): string {
    const result = [`=== DRY RUN: Changes to be applied to ${fileName} ===\n`];
    
    appliedPatches.forEach((applied, index) => {
      result.push(`\nPatch ${index + 1} at ${applied.location}:`);
      result.push(applied.preview);
      result.push('---');
    });
    
    result.push(`\nTotal patches to apply: ${appliedPatches.length}`);
    result.push('Run without dryRun=true to apply these changes.');
    
    return result.join('\n');
  }

  /**
   * Format update result
   */
  private formatUpdateResult(fileName: string, appliedPatches: Array<{patch: DiffPatch, location: string, preview: string}>): string {
    const result = [`Successfully updated ${fileName}\n`];
    
    result.push('Applied patches:');
    appliedPatches.forEach((applied, index) => {
      result.push(`  ${index + 1}. ${applied.location}`);
    });
    
    result.push(`\nTotal patches applied: ${appliedPatches.length}`);
    result.push('Unity will need to recompile the script.');
    
    return result.join('\n');
  }

  /**
   * Create a diff patch from two versions of content
   */
  async createDiffPatch(
    fileName: string,
    newContent: string
  ): Promise<DiffPatch[]> {
    this.ensureProjectSet();

    const scriptPath = await findFirstFile({
      directory: this.unityProject!.assetsPath,
      fileName: path.basename(fileName, '.cs'),
      extension: '.cs',
      useCache: true
    });
    
    if (!scriptPath) {
      throw new Error(`Script not found: ${fileName}`);
    }

    const originalContent = await fs.readFile(scriptPath, 'utf-8');
    const cleanOriginal = removeUTF8BOM(originalContent);
    const cleanNew = removeUTF8BOM(newContent);
    
    // Simple line-based diff
    const originalLines = cleanOriginal.split('\n');
    const newLines = cleanNew.split('\n');
    
    const patches: DiffPatch[] = [];
    let i = 0;
    
    while (i < Math.max(originalLines.length, newLines.length)) {
      if (i >= originalLines.length) {
        // Lines added at end
        patches.push({
          startLine: originalLines.length + 1,
          oldContent: '',
          newContent: newLines.slice(i).join('\n')
        });
        break;
      } else if (i >= newLines.length) {
        // Lines removed from end
        patches.push({
          startLine: i + 1,
          endLine: originalLines.length,
          oldContent: originalLines.slice(i).join('\n'),
          newContent: ''
        });
        break;
      } else if (originalLines[i] !== newLines[i]) {
        // Find the extent of the change
        let endOld = i;
        let endNew = i;
        
        // Simple approach: find next matching line
        while (endOld < originalLines.length && endNew < newLines.length &&
               originalLines[endOld] !== newLines[endNew]) {
          endOld++;
          endNew++;
        }
        
        patches.push({
          startLine: i + 1,
          endLine: endOld,
          oldContent: originalLines.slice(i, endOld).join('\n'),
          newContent: newLines.slice(i, endNew).join('\n'),
          contextBefore: i > 0 ? [originalLines[i - 1]] : undefined,
          contextAfter: endOld < originalLines.length ? [originalLines[endOld]] : undefined
        });
        
        i = Math.max(endOld, endNew);
      } else {
        i++;
      }
    }
    
    return patches;
  }
}