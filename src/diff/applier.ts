/**
 * Diff applier engine
 */

import { 
  DiffOptions, 
  DiffResult, 
  HunkResult, 
  RejectedHunk,
  DiffError,
  DiffErrorCode,
  ParsedHunk
} from './types.js';
import { DiffParser } from './parser.js';

export class DiffApplier {
  /**
   * Apply diff to file content
   */
  static apply(
    content: string,
    diff: string,
    options: DiffOptions = {}
  ): { content: string; result: Partial<DiffResult> } {
    // Parse diff
    const parsedDiffs = DiffParser.parse(diff);
    if (parsedDiffs.length === 0) {
      throw new DiffError(
        DiffErrorCode.INVALID_DIFF_FORMAT,
        'No valid diff content found'
      );
    }

    const parsedDiff = parsedDiffs[0]; // For single file diff
    const lines = content.split('\n');
    const applied: HunkResult[] = [];
    const rejected: RejectedHunk[] = [];
    const warnings: string[] = [];

    // Sort hunks by line number (reverse order to apply from bottom to top)
    const hunks = [...parsedDiff.hunks].sort((a, b) => b.oldStart - a.oldStart);

    for (let hunkIndex = 0; hunkIndex < hunks.length; hunkIndex++) {
      const hunk = hunks[hunkIndex];
      const originalHunkIndex = parsedDiff.hunks.indexOf(hunk);
      
      try {
        const result = this.applyHunk(lines, hunk, originalHunkIndex, options);
        
        if (result.applied) {
          applied.push({
            hunkIndex: originalHunkIndex,
            startLine: hunk.oldStart,
            linesRemoved: result.linesRemoved,
            linesAdded: result.linesAdded
          });
        } else {
          rejected.push({
            hunkIndex: originalHunkIndex,
            reason: result.reason || 'Unknown error',
            expectedContext: result.expectedContext || [],
            actualContext: result.actualContext || [],
            suggestion: result.suggestion
          });

          if (options.stopOnError) {
            break;
          }
        }

        if (result.warning) {
          warnings.push(result.warning);
        }
      } catch (error) {
        rejected.push({
          hunkIndex: originalHunkIndex,
          reason: error instanceof Error ? error.message : String(error),
          expectedContext: [],
          actualContext: []
        });

        if (options.stopOnError) {
          break;
        }
      }
    }

    const modifiedContent = lines.join('\n');

    return {
      content: modifiedContent,
      result: {
        hunksTotal: parsedDiff.hunks.length,
        hunksApplied: applied.length,
        hunksRejected: rejected.length,
        applied,
        rejected,
        warnings,
        success: rejected.length === 0 || (options.partial && applied.length > 0)
      }
    };
  }

  /**
   * Apply a single hunk
   */
  private static applyHunk(
    lines: string[],
    hunk: ParsedHunk,
    _hunkIndex: number,
    options: DiffOptions
  ): {
    applied: boolean;
    linesRemoved: number;
    linesAdded: number;
    reason?: string;
    expectedContext?: string[];
    actualContext?: string[];
    suggestion?: string;
    warning?: string;
  } {
    const startLine = hunk.oldStart - 1; // Convert to 0-based index
    let currentLine = startLine;
    let linesRemoved = 0;
    let linesAdded = 0;
    const expectedContext: string[] = [];
    const actualContext: string[] = [];
    const newLines: string[] = [];

    // Collect context and remove lines
    for (const diffLine of hunk.lines) {
      if (diffLine.type === 'context' || diffLine.type === 'remove') {
        const expectedLine = this.normalizeLineForComparison(diffLine.content, options);
        expectedContext.push(diffLine.content);

        if (currentLine >= lines.length) {
          return {
            applied: false,
            linesRemoved: 0,
            linesAdded: 0,
            reason: 'Hunk extends beyond end of file',
            expectedContext,
            actualContext
          };
        }

        const actualLine = this.normalizeLineForComparison(lines[currentLine], options);
        actualContext.push(lines[currentLine]);

        // Check if lines match
        if (!this.linesMatch(expectedLine, actualLine, options)) {
          // Try fuzzy matching if enabled
          if (options.fuzzy && options.fuzzy > 0) {
            const similarity = this.calculateSimilarity(expectedLine, actualLine);
            if (similarity < options.fuzzy / 100) {
              return {
                applied: false,
                linesRemoved: 0,
                linesAdded: 0,
                reason: `Context mismatch at line ${currentLine + 1}`,
                expectedContext,
                actualContext,
                suggestion: `Line similarity: ${Math.round(similarity * 100)}% (required: ${options.fuzzy}%)`
              };
            }
          } else {
            return {
              applied: false,
              linesRemoved: 0,
              linesAdded: 0,
              reason: `Context mismatch at line ${currentLine + 1}`,
              expectedContext,
              actualContext
            };
          }
        }

        if (diffLine.type === 'remove') {
          linesRemoved++;
          // Don't add removed lines to newLines
        } else {
          newLines.push(lines[currentLine]);
        }
        
        currentLine++;
      }
    }

    // Add new lines
    for (const diffLine of hunk.lines) {
      if (diffLine.type === 'add') {
        newLines.push(diffLine.content);
        linesAdded++;
      }
    }

    // Apply the changes
    lines.splice(startLine, linesRemoved, ...newLines);

    return {
      applied: true,
      linesRemoved,
      linesAdded
    };
  }

  /**
   * Normalize line for comparison based on options
   */
  private static normalizeLineForComparison(line: string, options: DiffOptions): string {
    let normalized = line;

    if (options.ignoreWhitespace) {
      normalized = normalized.trim();
      // Replace multiple spaces with single space
      normalized = normalized.replace(/\s+/g, ' ');
    }

    if (options.ignoreCase) {
      normalized = normalized.toLowerCase();
    }

    return normalized;
  }

  /**
   * Check if two lines match based on options
   */
  private static linesMatch(expected: string, actual: string, _options: DiffOptions): boolean {
    return expected === actual;
  }

  /**
   * Calculate similarity between two strings (0-1)
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    // Simple Levenshtein distance based similarity
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Apply multiple hunks with transaction support
   */
  static applyWithTransaction(
    content: string,
    diff: string,
    options: DiffOptions = {}
  ): { content: string; result: Partial<DiffResult>; rollback: () => string } {
    const originalContent = content;
    const { content: newContent, result } = this.apply(content, diff, options);

    const rollback = () => originalContent;

    return {
      content: newContent,
      result,
      rollback
    };
  }
}