/**
 * Diff parser for unified diff format
 */

import { ParsedDiff, ParsedHunk, DiffLine, DiffError, DiffErrorCode } from './types.js';

export class DiffParser {
  /**
   * Parse unified diff format
   */
  static parse(diff: string): ParsedDiff[] {
    const lines = diff.split('\n');
    const diffs: ParsedDiff[] = [];
    let currentDiff: ParsedDiff | null = null;
    let currentHunk: ParsedHunk | null = null;
    let oldLineNum = 0;
    let newLineNum = 0;
    let remainingOldLines = 0;
    let remainingNewLines = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // File header
      if (line.startsWith('--- ')) {
        const oldPath = this.extractPath(line.substring(4));
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.startsWith('+++ ')) {
          const newPath = this.extractPath(nextLine.substring(4));
          currentDiff = {
            oldPath,
            newPath,
            hunks: []
          };
          diffs.push(currentDiff);
          i++; // Skip the +++ line
          continue;
        }
      }

      // Hunk header
      if (line.startsWith('@@')) {
        const hunkMatch = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/);
        if (!hunkMatch) {
          throw new DiffError(
            DiffErrorCode.INVALID_DIFF_FORMAT,
            `Invalid hunk header: ${line}`,
            currentDiff?.newPath,
            i + 1
          );
        }

        oldLineNum = parseInt(hunkMatch[1], 10);
        remainingOldLines = parseInt(hunkMatch[2] || '1', 10);
        newLineNum = parseInt(hunkMatch[3], 10);
        remainingNewLines = parseInt(hunkMatch[4] || '1', 10);

        currentHunk = {
          oldStart: oldLineNum,
          oldLines: remainingOldLines,
          newStart: newLineNum,
          newLines: remainingNewLines,
          context: hunkMatch[5]?.trim(),
          lines: []
        };

        if (currentDiff) {
          currentDiff.hunks.push(currentHunk);
        }
        continue;
      }

      // Process diff lines
      if (currentHunk && line.length > 0) {
        const firstChar = line[0];
        const content = line.substring(1);

        let diffLine: DiffLine | null = null;

        switch (firstChar) {
          case ' ': // Context line
            diffLine = {
              type: 'context',
              content,
              oldLineNumber: oldLineNum++,
              newLineNumber: newLineNum++
            };
            remainingOldLines--;
            remainingNewLines--;
            break;

          case '-': // Removed line
            diffLine = {
              type: 'remove',
              content,
              oldLineNumber: oldLineNum++
            };
            remainingOldLines--;
            break;

          case '+': // Added line
            diffLine = {
              type: 'add',
              content,
              newLineNumber: newLineNum++
            };
            remainingNewLines--;
            break;

          case '\\': // No newline at end of file
            // Skip this line
            continue;
        }

        if (diffLine) {
          currentHunk.lines.push(diffLine);
        }
      }
    }

    return diffs;
  }

  /**
   * Extract file path from diff header
   */
  private static extractPath(pathLine: string): string {
    // Remove 'a/' or 'b/' prefix if present
    if (pathLine.startsWith('a/') || pathLine.startsWith('b/')) {
      return pathLine.substring(2);
    }
    return pathLine;
  }

  /**
   * Validate diff format
   */
  static validate(diff: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const parsed = this.parse(diff);
      
      if (parsed.length === 0) {
        errors.push('No valid diff content found');
      }

      for (const parsedDiff of parsed) {
        if (parsedDiff.hunks.length === 0) {
          errors.push(`No hunks found for ${parsedDiff.newPath}`);
        }

        for (let i = 0; i < parsedDiff.hunks.length; i++) {
          const hunk = parsedDiff.hunks[i];
          
          // Validate line counts
          const contextLines = hunk.lines.filter(l => l.type === 'context').length;
          const removedLines = hunk.lines.filter(l => l.type === 'remove').length;
          const addedLines = hunk.lines.filter(l => l.type === 'add').length;

          if (contextLines + removedLines !== hunk.oldLines) {
            errors.push(`Hunk ${i + 1}: Old line count mismatch`);
          }

          if (contextLines + addedLines !== hunk.newLines) {
            errors.push(`Hunk ${i + 1}: New line count mismatch`);
          }
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create unified diff from two contents
   */
  static createDiff(
    oldContent: string,
    newContent: string,
    oldPath: string,
    newPath: string,
    contextLines: number = 3
  ): string {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    // Simple diff algorithm (for MVP - can be improved with better algorithms)
    const diff: string[] = [];
    
    // Add file headers
    diff.push(`--- ${oldPath}`);
    diff.push(`+++ ${newPath}`);

    // Find differences using a simple algorithm
    const changes = this.findChanges(oldLines, newLines);
    
    for (const change of changes) {
      const hunkLines: string[] = [];
      
      // Add context before
      for (let i = Math.max(0, change.oldStart - contextLines); i < change.oldStart; i++) {
        hunkLines.push(` ${oldLines[i]}`);
      }
      
      // Add removed lines
      for (let i = change.oldStart; i < change.oldStart + change.oldLength; i++) {
        hunkLines.push(`-${oldLines[i]}`);
      }
      
      // Add added lines
      for (let i = change.newStart; i < change.newStart + change.newLength; i++) {
        hunkLines.push(`+${newLines[i]}`);
      }
      
      // Add context after
      const contextEnd = Math.min(
        oldLines.length,
        change.oldStart + change.oldLength + contextLines
      );
      for (let i = change.oldStart + change.oldLength; i < contextEnd; i++) {
        hunkLines.push(` ${oldLines[i]}`);
      }
      
      // Create hunk header
      const oldCount = change.oldLength + (contextEnd - change.oldStart - change.oldLength) + 
                      (change.oldStart - Math.max(0, change.oldStart - contextLines));
      const newCount = change.newLength + (contextEnd - change.oldStart - change.oldLength) + 
                      (change.oldStart - Math.max(0, change.oldStart - contextLines));
      
      diff.push(`@@ -${change.oldStart + 1},${oldCount} +${change.newStart + 1},${newCount} @@`);
      diff.push(...hunkLines);
    }
    
    return diff.join('\n');
  }

  /**
   * Find changes between two arrays of lines (simplified)
   */
  private static findChanges(
    oldLines: string[],
    newLines: string[]
  ): Array<{ oldStart: number; oldLength: number; newStart: number; newLength: number }> {
    const changes: Array<{ oldStart: number; oldLength: number; newStart: number; newLength: number }> = [];
    
    // Simple line-by-line comparison (can be improved with LCS algorithm)
    let i = 0, j = 0;
    
    while (i < oldLines.length || j < newLines.length) {
      if (i >= oldLines.length) {
        // Remaining new lines
        changes.push({ oldStart: i, oldLength: 0, newStart: j, newLength: newLines.length - j });
        break;
      }
      
      if (j >= newLines.length) {
        // Remaining old lines
        changes.push({ oldStart: i, oldLength: oldLines.length - i, newStart: j, newLength: 0 });
        break;
      }
      
      if (oldLines[i] === newLines[j]) {
        i++;
        j++;
        continue;
      }
      
      // Find the extent of the change
      const changeStart = { old: i, new: j };
      
      // Look ahead to find matching lines
      let found = false;
      for (let lookAhead = 1; lookAhead < 10 && !found; lookAhead++) {
        if (i + lookAhead < oldLines.length && oldLines[i + lookAhead] === newLines[j]) {
          changes.push({
            oldStart: changeStart.old,
            oldLength: lookAhead,
            newStart: changeStart.new,
            newLength: 0
          });
          i += lookAhead;
          found = true;
        } else if (j + lookAhead < newLines.length && oldLines[i] === newLines[j + lookAhead]) {
          changes.push({
            oldStart: changeStart.old,
            oldLength: 0,
            newStart: changeStart.new,
            newLength: lookAhead
          });
          j += lookAhead;
          found = true;
        }
      }
      
      if (!found) {
        // Assume both changed
        changes.push({
          oldStart: changeStart.old,
          oldLength: 1,
          newStart: changeStart.new,
          newLength: 1
        });
        i++;
        j++;
      }
    }
    
    return this.mergeAdjacentChanges(changes);
  }

  /**
   * Merge adjacent changes
   */
  private static mergeAdjacentChanges(
    changes: Array<{ oldStart: number; oldLength: number; newStart: number; newLength: number }>
  ): Array<{ oldStart: number; oldLength: number; newStart: number; newLength: number }> {
    if (changes.length <= 1) return changes;
    
    const merged: Array<{ oldStart: number; oldLength: number; newStart: number; newLength: number }> = [];
    let current = changes[0];
    
    for (let i = 1; i < changes.length; i++) {
      const next = changes[i];
      
      // Check if changes are adjacent
      if (current.oldStart + current.oldLength >= next.oldStart - 3) {
        // Merge changes
        current = {
          oldStart: current.oldStart,
          oldLength: next.oldStart + next.oldLength - current.oldStart,
          newStart: current.newStart,
          newLength: next.newStart + next.newLength - current.newStart
        };
      } else {
        merged.push(current);
        current = next;
      }
    }
    
    merged.push(current);
    return merged;
  }
}