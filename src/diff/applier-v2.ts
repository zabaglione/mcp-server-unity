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
      // Apply the parsed diff directly using our own implementation
      let resultContent = contentWithoutBom;
      const applied: HunkResult[] = [];
      const rejected: RejectedHunk[] = [];
      const warnings: string[] = [];

      // Split content into lines for processing
      const lines = resultContent.split('\n');
      
      // Sort hunks by line number (reverse order for applying from bottom to top)
      const sortedHunks = [...parsedDiff.hunks].sort((a, b) => b.oldStart - a.oldStart);
      
      for (const hunk of sortedHunks) {
        // Try to apply the hunk
        const hunkResult = this.applyHunk(lines, hunk, options);
        
        if (hunkResult.applied) {
          applied.push({
            hunkIndex: parsedDiff.hunks.indexOf(hunk),
            startLine: hunk.oldStart,
            linesRemoved: hunkResult.linesRemoved,
            linesAdded: hunkResult.linesAdded
          });
        } else {
          rejected.push({
            hunkIndex: parsedDiff.hunks.indexOf(hunk),
            reason: hunkResult.reason || 'Could not apply hunk',
            expectedContext: hunkResult.expectedContext || [],
            actualContext: hunkResult.actualContext || [],
            suggestion: hunkResult.suggestion || 'Check file version or use fuzzy matching'
          });
        }
      }

      // Join lines back into content
      resultContent = lines.join('\n');

      // Restore BOM if it was present
      const finalContent = bom + resultContent;

      // Add warnings for fuzzy matches
      if (options.fuzzy && applied.length > 0) {
        warnings.push(`Applied ${applied.length} hunk(s) with fuzzy matching`);
      }

      return {
        content: finalContent,
        result: {
          success: rejected.length === 0,
          path: parsedDiff.newPath || '',
          hunksTotal: parsedDiff.hunks.length,
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
   * Apply a single hunk to the lines array
   */
  private static applyHunk(
    lines: string[],
    hunk: any,
    options: DiffApplierV2Options
  ): {
    applied: boolean;
    linesRemoved: number;
    linesAdded: number;
    reason?: string;
    expectedContext?: string[];
    actualContext?: string[];
    suggestion?: string;
  } {
    const startLine = hunk.oldStart - 1; // Convert to 0-based index
    let currentLine = startLine;
    let linesRemoved = 0;
    let linesAdded = 0;
    const expectedLines: string[] = [];
    const actualLines: string[] = [];
    const newLines: string[] = [];

    // Extract expected content and new content from hunk
    for (const line of hunk.lines) {
      switch (line.type) {
        case 'context':
          expectedLines.push(line.content);
          newLines.push(line.content);
          break;
        case 'remove':
          expectedLines.push(line.content);
          linesRemoved++;
          break;
        case 'add':
          newLines.push(line.content);
          linesAdded++;
          break;
      }
    }

    // Get actual lines from the file
    for (let i = 0; i < expectedLines.length; i++) {
      if (startLine + i < lines.length) {
        actualLines.push(lines[startLine + i]);
      }
    }

    // Check if the hunk can be applied
    let canApply = false;

    if (options.fuzzy) {
      // Fuzzy matching - look for similar content nearby
      const searchRange = Math.min(options.fuzzy || 100, 100);
      for (let offset = 0; offset <= searchRange; offset++) {
        for (const sign of [0, -1, 1]) {
          const testOffset = sign * offset;
          const testStart = startLine + testOffset;
          
          if (testStart >= 0 && testStart + expectedLines.length <= lines.length) {
            const testLines = lines.slice(testStart, testStart + expectedLines.length);
            if (this.fuzzyMatch(expectedLines, testLines, options)) {
              canApply = true;
              currentLine = testStart;
              break;
            }
          }
        }
        if (canApply) break;
      }
    } else {
      // Exact matching
      canApply = this.exactMatch(expectedLines, actualLines, options);
    }

    if (canApply) {
      // Apply the hunk
      lines.splice(currentLine, expectedLines.length, ...newLines);
      
      return {
        applied: true,
        linesRemoved,
        linesAdded
      };
    } else {
      return {
        applied: false,
        linesRemoved: 0,
        linesAdded: 0,
        reason: 'Context mismatch',
        expectedContext: expectedLines,
        actualContext: actualLines,
        suggestion: options.fuzzy 
          ? 'Try increasing fuzzy threshold or check file version'
          : 'Enable fuzzy matching with --fuzzy option'
      };
    }
  }

  /**
   * Check if lines match exactly (with optional whitespace/case ignore)
   */
  private static exactMatch(
    expectedLines: string[],
    actualLines: string[],
    options: DiffApplierV2Options
  ): boolean {
    if (expectedLines.length !== actualLines.length) {
      return false;
    }

    for (let i = 0; i < expectedLines.length; i++) {
      let expected = expectedLines[i];
      let actual = actualLines[i];

      if (options.ignoreWhitespace) {
        // Normalize all whitespace sequences to single spaces
        expected = expected.trim().replace(/\s+/g, ' ');
        actual = actual.trim().replace(/\s+/g, ' ');
      }

      if (options.ignoreCase) {
        expected = expected.toLowerCase();
        actual = actual.toLowerCase();
      }

      if (expected !== actual) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if lines match with fuzzy matching
   */
  private static fuzzyMatch(
    expectedLines: string[],
    actualLines: string[],
    options: DiffApplierV2Options
  ): boolean {
    if (expectedLines.length !== actualLines.length) {
      return false;
    }

    const threshold = (options.fuzzy || 80) / 100;

    for (let i = 0; i < expectedLines.length; i++) {
      const similarity = this.calculateSimilarity(expectedLines[i], actualLines[i], options);
      if (similarity < threshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate similarity between two strings
   */
  private static calculateSimilarity(
    str1: string,
    str2: string,
    options: DiffApplierV2Options
  ): number {
    if (options.ignoreWhitespace) {
      // Normalize all whitespace sequences to single spaces
      str1 = str1.trim().replace(/\s+/g, ' ');
      str2 = str2.trim().replace(/\s+/g, ' ');
    }

    if (options.ignoreCase) {
      str1 = str1.toLowerCase();
      str2 = str2.toLowerCase();
    }

    if (str1 === str2) {
      return 1.0;
    }

    // Use diff-match-patch to calculate similarity
    const diffs = this.dmp.diff_main(str1, str2);
    const totalLength = Math.max(str1.length, str2.length);
    
    if (totalLength === 0) {
      return 1.0;
    }

    let matchingChars = 0;
    for (const [op, text] of diffs) {
      if (op === 0) { // DIFF_EQUAL
        matchingChars += text.length;
      }
    }

    return matchingChars / totalLength;
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
          
          const similarity = this.calculateSimilarity(expected, actual, options);
          
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
    
    // Split content into lines for line-based diff
    const originalLines = originalContent.split('\n');
    const modifiedLines = modifiedContent.split('\n');
    
    // Use diff-match-patch in line mode
    const lineArray1 = originalLines.map(line => line + '\n');
    const lineArray2 = modifiedLines.map(line => line + '\n');
    
    // Convert lines to characters for diff-match-patch
    const [chars1, chars2, lineArray] = this.diff_linesToChars(lineArray1, lineArray2);
    
    // Compute diff
    const diffs = this.dmp.diff_main(chars1, chars2, false);
    
    // Convert back to lines
    this.diff_charsToLines(diffs, lineArray);
    
    // Convert to unified diff format
    return this.diffsToUnified(diffs, 'file.cs', 'file.cs', contextLines);
  }
  
  /**
   * Convert lines to characters for diff-match-patch
   */
  private static diff_linesToChars(
    lines1: string[],
    lines2: string[]
  ): [string, string, string[]] {
    const lineArray: string[] = [];
    const lineHash: { [key: string]: number } = {};
    
    const linesToChars = (lines: string[]): string => {
      let chars = '';
      for (const line of lines) {
        if (lineHash.hasOwnProperty(line)) {
          chars += String.fromCharCode(lineHash[line]);
        } else {
          lineArray.push(line);
          lineHash[line] = lineArray.length - 1;
          chars += String.fromCharCode(lineArray.length - 1);
        }
      }
      return chars;
    };
    
    const chars1 = linesToChars(lines1);
    const chars2 = linesToChars(lines2);
    return [chars1, chars2, lineArray];
  }
  
  /**
   * Convert character codes back to lines
   */
  private static diff_charsToLines(
    diffs: Array<[number, string]>,
    lineArray: string[]
  ): void {
    for (let i = 0; i < diffs.length; i++) {
      const diff = diffs[i];
      const chars = diff[1];
      const lines: string[] = [];
      for (let j = 0; j < chars.length; j++) {
        lines.push(lineArray[chars.charCodeAt(j)]);
      }
      diff[1] = lines.join('');
    }
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
      // Split into lines, but preserve the structure
      const lines = text.split('\n');
      // If text ends with newline, we'll have an extra empty string - remove it
      if (text.endsWith('\n') && lines[lines.length - 1] === '') {
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