/**
 * DiffApplier v2 - Using industry-standard diff-match-patch library
 * with Unity-specific enhancements
 */

import { diff_match_patch as DiffMatchPatch } from 'diff-match-patch';
import { 
  DiffOptions, 
  DiffResult, 
  HunkResult, 
  RejectedHunk,
  DiffError,
  DiffErrorCode
} from './types.js';
import { DiffParser } from './parser.js';

export interface DiffApplierV2Options extends DiffOptions {
  // Additional options for diff-match-patch
  diffTimeout?: number;           // Timeout for diff computation (seconds)
  diffEditCost?: number;          // Cost of an empty edit operation
  matchThreshold?: number;        // At what point is no match declared (0.0 = perfection, 1.0 = very loose)
  matchDistance?: number;         // How far to search for a match (0 = exact location, 1000+ = broad match)
  patchDeleteThreshold?: number;  // When deleting a large block, how close do the contents have to be to match
  patchMargin?: number;           // Chunk size for context length
  matchMaxBits?: number;          // The number of bits in an int
}

export class DiffApplierV2 {
  private static dmp = new DiffMatchPatch();

  /**
   * Configure diff-match-patch settings
   */
  private static configureDMP(options: DiffApplierV2Options): void {
    // Set timeouts
    if (options.diffTimeout !== undefined) {
      this.dmp.Diff_Timeout = options.diffTimeout;
    }

    // Set matching thresholds
    if (options.matchThreshold !== undefined) {
      this.dmp.Match_Threshold = options.matchThreshold;
    }

    if (options.matchDistance !== undefined) {
      this.dmp.Match_Distance = options.matchDistance;
    }

    if (options.patchDeleteThreshold !== undefined) {
      this.dmp.Patch_DeleteThreshold = options.patchDeleteThreshold;
    }

    if (options.patchMargin !== undefined) {
      this.dmp.Patch_Margin = options.patchMargin;
    }
  }

  /**
   * Apply unified diff using diff-match-patch
   */
  static apply(
    content: string,
    diff: string,
    options: DiffApplierV2Options = {}
  ): { content: string; result: DiffResult } {
    // Configure DMP with options
    this.configureDMP(options);

    // Parse unified diff
    const parsedDiffs = DiffParser.parse(diff);
    if (parsedDiffs.length === 0) {
      throw new DiffError(
        DiffErrorCode.INVALID_DIFF_FORMAT,
        'No valid diff content found'
      );
    }

    const parsedDiff = parsedDiffs[0];
    
    // Detect and preserve BOM if present
    const bom = content.startsWith('\ufeff') ? '\ufeff' : '';
    const contentWithoutBom = bom ? content.substring(1) : content;

    try {
      // Convert unified diff to patch format
      const patches = this.unifiedDiffToPatches(diff, contentWithoutBom);
      
      // Configure diff-match-patch for whitespace handling
      if (options.ignoreWhitespace) {
        // Increase match threshold to be more lenient with whitespace
        this.dmp.Match_Threshold = 0.8;
        this.dmp.Match_Distance = 1000;
      }
      
      // Apply patches with fuzzy matching if enabled
      const [resultContent, results] = this.applyPatches(
        contentWithoutBom, 
        patches, 
        options
      );

      let finalContent = resultContent;

      // Restore BOM if it was present
      finalContent = bom + finalContent;

      // Convert results to our format
      const applied: HunkResult[] = [];
      const rejected: RejectedHunk[] = [];
      const warnings: string[] = [];

      results.forEach((result, index) => {
        if (result) {
          applied.push({
            hunkIndex: index,
            startLine: this.getStartLine(patches[index]),
            linesRemoved: this.getLinesRemoved(patches[index]),
            linesAdded: this.getLinesAdded(patches[index])
          });
        } else {
          rejected.push({
            hunkIndex: index,
            reason: 'Patch could not be applied',
            expectedContext: this.getExpectedContext(patches[index]),
            actualContext: this.getActualContext(contentWithoutBom, patches[index]),
            suggestion: options.fuzzy 
              ? 'Try increasing the fuzzy matching threshold'
              : 'Enable fuzzy matching with the --fuzzy option'
          });
        }
      });

      // Add warnings for fuzzy matches
      if (options.fuzzy && applied.length > 0) {
        const fuzzyCount = applied.filter((_, i) => 
          this.wasFuzzyMatch(patches[i], contentWithoutBom)
        ).length;
        if (fuzzyCount > 0) {
          warnings.push(`${fuzzyCount} hunk(s) applied with fuzzy matching`);
        }
      }

      return {
        content: finalContent,
        result: {
          success: rejected.length === 0,
          path: parsedDiff.newPath || '',
          hunksTotal: patches.length,
          hunksApplied: applied.length,
          hunksRejected: rejected.length,
          applied,
          rejected,
          warnings
        }
      };
    } catch (error) {
      throw new DiffError(
        DiffErrorCode.INVALID_DIFF_FORMAT,
        `Failed to apply diff: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Convert unified diff to diff-match-patch patches
   */
  private static unifiedDiffToPatches(
    unifiedDiff: string,
    originalContent: string
  ): any[] {
    // Parse the unified diff to extract hunks
    const parsedDiffs = DiffParser.parse(unifiedDiff);
    if (parsedDiffs.length === 0) {
      return [];
    }

    const patches: any[] = [];
    const originalLines = originalContent.split('\n');
    
    // Process each file diff
    for (const fileDiff of parsedDiffs) {
      // Sort hunks by line number
      const sortedHunks = [...fileDiff.hunks].sort((a, b) => a.oldStart - b.oldStart);
      
      // Build the modified content by applying hunks
      let modifiedLines = [...originalLines];
      let offset = 0;
      
      for (const hunk of sortedHunks) {
        const startIndex = hunk.oldStart - 1 + offset;
        let removeCount = 0;
        let insertLines: string[] = [];
        
        // Process hunk lines
        for (const line of hunk.lines) {
          switch (line.type) {
            case 'remove':
              removeCount++;
              break;
            case 'add':
              insertLines.push(line.content);
              break;
            // context lines are just for validation
          }
        }
        
        // Apply the changes
        modifiedLines.splice(startIndex, removeCount, ...insertLines);
        offset += insertLines.length - removeCount;
      }
      
      const modifiedContent = modifiedLines.join('\n');
      
      // Create patches using diff-match-patch
      const diffs = this.dmp.diff_main(originalContent, modifiedContent);
      const filePatches = this.dmp.patch_make(originalContent, diffs);
      patches.push(...filePatches);
    }

    return patches;
  }


  /**
   * Apply patches with our options
   */
  private static applyPatches(
    content: string,
    patches: any[],
    options: DiffApplierV2Options
  ): [string, boolean[]] {
    if (options.fuzzy && options.fuzzy > 0) {
      // Use fuzzy matching
      const threshold = options.fuzzy / 100;
      this.dmp.Match_Threshold = 1 - threshold; // Invert for diff-match-patch
      return this.dmp.patch_apply(patches, content);
    } else {
      // Use exact matching
      this.dmp.Match_Threshold = 0;
      return this.dmp.patch_apply(patches, content);
    }
  }



  /**
   * Helper methods for result conversion
   */
  private static getStartLine(patch: any): number {
    if (!patch || typeof patch.start1 === 'undefined') return 1;
    return patch.start1 + 1; // Convert to 1-based
  }

  private static getLinesRemoved(patch: any): number {
    if (!patch || !patch.diffs) return 0;
    return patch.diffs
      .filter(([op]: any) => op === -1) // DIFF_DELETE = -1
      .reduce((sum: number, [, text]: any) => sum + (text.match(/\n/g) || []).length, 0);
  }

  private static getLinesAdded(patch: any): number {
    if (!patch || !patch.diffs) return 0;
    return patch.diffs
      .filter(([op]: any) => op === 1) // DIFF_INSERT = 1
      .reduce((sum: number, [, text]: any) => sum + (text.match(/\n/g) || []).length, 0);
  }

  private static getExpectedContext(patch: any): string[] {
    if (!patch.diffs) return [];
    
    const context: string[] = [];
    for (const diff of patch.diffs) {
      if (!diff || diff.length < 2) continue;
      const [op, text] = diff;
      if (op === 0 || op === -1) { // DIFF_EQUAL = 0, DIFF_DELETE = -1
        const lines = text.split('\n');
        // Remove empty last line if text doesn't end with newline
        if (!text.endsWith('\n') && lines[lines.length - 1] === '') {
          lines.pop();
        }
        context.push(...lines);
      }
    }
    return context;
  }

  private static getActualContext(
    content: string,
    patch: any
  ): string[] {
    const lines = content.split('\n');
    const startLine = patch.start1 || 0;
    const contextSize = 3; // Lines of context to show
    
    const actualLines: string[] = [];
    for (let i = Math.max(0, startLine - contextSize); 
         i < Math.min(lines.length, startLine + contextSize); 
         i++) {
      actualLines.push(lines[i]);
    }
    
    return actualLines;
  }

  private static wasFuzzyMatch(
    patch: any,
    content: string
  ): boolean {
    // Check if the patch was applied with modifications
    const exactMatch = this.dmp.patch_apply([patch], content);
    return !exactMatch[1][0]; // If exact match failed, it was fuzzy
  }

  /**
   * Apply with detailed error reporting
   */
  static applyWithDetailedErrors(
    content: string,
    diff: string,
    options: DiffApplierV2Options = {}
  ): {
    content: string;
    result: DiffResult;
    detailedErrors: Array<{
      hunkIndex: number;
      lineNumber: number;
      expected: string;
      actual: string;
      similarity: number;
      suggestion: string;
    }>;
  } {
    const result = this.apply(content, diff, options);
    const detailedErrors: Array<{
      hunkIndex: number;
      lineNumber: number;
      expected: string;
      actual: string;
      similarity: number;
      suggestion: string;
    }> = [];

    // Extract detailed error information
    for (const rejected of result.result.rejected || []) {
      if (rejected.expectedContext && rejected.actualContext) {
        for (let i = 0; i < rejected.expectedContext.length; i++) {
          const expected = rejected.expectedContext[i];
          const actual = rejected.actualContext[i] || '';
          
          // Use diff-match-patch to calculate similarity
          const diffs = this.dmp.diff_main(expected, actual);
          const similarity = this.calculateSimilarityFromDiffs(diffs);
          
          if (expected !== actual) {
            detailedErrors.push({
              hunkIndex: rejected.hunkIndex,
              lineNumber: i + 1,
              expected,
              actual,
              similarity,
              suggestion: this.generateSuggestion(similarity, expected, actual)
            });
          }
        }
      }
    }

    return {
      content: result.content,
      result: result.result,
      detailedErrors
    };
  }

  /**
   * Calculate similarity from diff-match-patch diffs
   */
  private static calculateSimilarityFromDiffs(
    diffs: Array<[number, string]>
  ): number {
    let equalChars = 0;
    let totalChars = 0;

    for (const [op, text] of diffs) {
      if (op === 0) { // DIFF_EQUAL = 0
        equalChars += text.length;
      }
      totalChars += text.length;
    }

    return totalChars > 0 ? equalChars / totalChars : 0;
  }

  /**
   * Generate helpful suggestions based on similarity
   */
  private static generateSuggestion(
    similarity: number,
    expected: string,
    actual: string
  ): string {
    if (similarity > 0.9) {
      return 'Lines are very similar. Minor differences in whitespace or punctuation.';
    } else if (similarity > 0.7) {
      // Check for specific differences
      const expectedTrimmed = expected.trim();
      const actualTrimmed = actual.trim();
      
      if (expectedTrimmed === actualTrimmed) {
        return 'Difference is only in whitespace/indentation. Use --ignore-whitespace option.';
      }
      
      if (expectedTrimmed.toLowerCase() === actualTrimmed.toLowerCase()) {
        return 'Difference is only in case. Use --ignore-case option.';
      }
      
      return 'Lines have moderate similarity. Consider using fuzzy matching with --fuzzy 80.';
    } else if (similarity > 0.5) {
      return 'Lines have some similarity. Enable fuzzy matching with --fuzzy 60.';
    } else {
      return 'Lines are significantly different. Verify you have the correct file version.';
    }
  }

  /**
   * Create a diff between two contents (for testing)
   */
  static createDiff(
    originalContent: string,
    modifiedContent: string,
    options: { contextLines?: number } = {}
  ): string {
    const contextLines = options.contextLines || 3;
    
    // Use diff-match-patch to find differences
    const diffs = this.dmp.diff_main(originalContent, modifiedContent);
    this.dmp.diff_cleanupSemantic(diffs);
    
    // Convert to unified diff format
    return this.diffsToUnified(diffs, 'file.cs', 'file.cs', contextLines);
  }

  /**
   * Convert diff-match-patch diffs to unified format
   */
  private static diffsToUnified(
    diffs: Array<[number, string]>,
    oldPath: string,
    newPath: string,
    contextLines: number
  ): string {
    const hunks: string[] = [];
    let oldLine = 1;
    let newLine = 1;
    let currentHunk: string[] = [];
    let hunkOldStart = 0;
    let hunkNewStart = 0;
    let hunkOldCount = 0;
    let hunkNewCount = 0;

    for (const [op, text] of diffs) {
      const lines = text.split('\n');
      // Remove last empty line if text doesn't end with newline
      if (!text.endsWith('\n') && lines[lines.length - 1] === '') {
        lines.pop();
      }
      
      switch (op) {
        case 0: // DIFF_EQUAL
          // Handle context lines
          if (lines.length <= contextLines * 2 && currentHunk.length > 0) {
            // Small context, include in current hunk
            for (const line of lines) {
              currentHunk.push(` ${line}`);
              hunkOldCount++;
              hunkNewCount++;
            }
          } else if (currentHunk.length > 0) {
            // Large context, finish current hunk with trailing context
            const contextToAdd = Math.min(contextLines, lines.length);
            for (let i = 0; i < contextToAdd; i++) {
              currentHunk.push(` ${lines[i]}`);
              hunkOldCount++;
              hunkNewCount++;
            }
            
            // Finish current hunk
            const hunkHeader = `@@ -${hunkOldStart},${hunkOldCount} +${hunkNewStart},${hunkNewCount} @@`;
            hunks.push(hunkHeader + '\n' + currentHunk.join('\n'));
            currentHunk = [];
          }
          
          oldLine += lines.length;
          newLine += lines.length;
          break;
          
        case -1: // DIFF_DELETE
          if (currentHunk.length === 0) {
            // Start new hunk
            hunkOldStart = oldLine;
            hunkNewStart = newLine;
            hunkOldCount = 0;
            hunkNewCount = 0;
          }
          
          for (const line of lines) {
            currentHunk.push(`-${line}`);
            hunkOldCount++;
          }
          oldLine += lines.length;
          break;
          
        case 1: // DIFF_INSERT
          if (currentHunk.length === 0) {
            // Start new hunk
            hunkOldStart = oldLine;
            hunkNewStart = newLine;
            hunkOldCount = 0;
            hunkNewCount = 0;
          }
          
          for (const line of lines) {
            currentHunk.push(`+${line}`);
            hunkNewCount++;
          }
          newLine += lines.length;
          break;
      }
    }

    // Finish last hunk if any
    if (currentHunk.length > 0) {
      const hunkHeader = `@@ -${hunkOldStart},${hunkOldCount} +${hunkNewStart},${hunkNewCount} @@`;
      hunks.push(hunkHeader + '\n' + currentHunk.join('\n'));
    }

    // Build unified diff
    return `--- a/${oldPath}\n+++ b/${newPath}\n${hunks.join('\n')}`;
  }
}