/**
 * Diff-based update types and interfaces
 */

export interface DiffOptions {
  // Matching settings
  fuzzy?: number;              // Fuzzy matching tolerance (0-100, default: 0)
  ignoreWhitespace?: boolean;  // Ignore whitespace (default: false)
  ignoreCase?: boolean;        // Ignore case (default: false)

  // Safety settings
  createBackup?: boolean;      // Create backup before applying (default: true)
  validateSyntax?: boolean;    // Validate syntax after applying (default: true)
  dryRun?: boolean;           // Don't actually apply (default: false)

  // Error handling
  partial?: boolean;          // Allow partial application (default: false)
  stopOnError?: boolean;      // Stop on error (default: true)

  // Unity integration
  refreshAssets?: boolean;      // AssetDatabase.Refresh() (default: true)
  reimportAssets?: boolean;     // Reimport changed files (default: true)
  recompile?: boolean;          // Recompile scripts (default: true)
}

export interface DiffResult {
  success: boolean;           // Overall success/failure
  path: string;              // Processed file path
  hunksTotal: number;        // Total number of hunks
  hunksApplied: number;      // Successfully applied hunks
  hunksRejected: number;     // Rejected hunks

  // Detailed information
  applied: HunkResult[];     // Applied hunk details
  rejected: RejectedHunk[];  // Rejected hunk details
  warnings: string[];        // Warning messages

  // Backup information
  backupPath?: string;       // Backup file path

  // Preview (dryRun only)
  preview?: string;          // Preview of file content after applying

  // Validation results
  syntaxValid?: boolean;     // Syntax check result
  compileErrors?: string[];  // Compile errors
}

export interface HunkResult {
  hunkIndex: number;         // Hunk index
  startLine: number;         // Apply start line
  linesRemoved: number;      // Number of lines removed
  linesAdded: number;        // Number of lines added
}

export interface RejectedHunk {
  hunkIndex: number;         // Hunk index
  reason: string;            // Rejection reason
  expectedContext: string[]; // Expected context
  actualContext: string[];   // Actual context
  suggestion?: string;       // Fix suggestion
}

export interface PatchFile {
  path: string;                 // File path
  diff: string;                 // Diff for that file
  priority?: number;            // Apply priority (smaller = first)
}

export interface PatchOptions extends DiffOptions {
  // Transaction settings
  atomic?: boolean;             // All succeed or all rollback (default: true)
  continueOnError?: boolean;    // Continue on error (default: false)

  // Progress callback
  onProgress?: (current: number, total: number, file: string) => void;
}

export interface PatchResult {
  success: boolean;             // Overall success/failure
  filesTotal: number;           // Total files
  filesProcessed: number;       // Processed files
  filesSucceeded: number;       // Succeeded files
  filesFailed: number;          // Failed files

  // Individual results
  results: Map<string, DiffResult>;  // Results per file path

  // Rollback information
  rollbackAvailable: boolean;   // Can rollback
  rollbackPaths?: string[];     // Rollback target paths
}

export enum DiffErrorCode {
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  INVALID_DIFF_FORMAT = "INVALID_DIFF_FORMAT",
  CONTEXT_MISMATCH = "CONTEXT_MISMATCH",
  SYNTAX_ERROR = "SYNTAX_ERROR",
  COMPILE_ERROR = "COMPILE_ERROR",
  BACKUP_FAILED = "BACKUP_FAILED",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class DiffError extends Error {
  constructor(
    public code: DiffErrorCode,
    message: string,
    public file?: string,
    public line?: number,
    public hunk?: number
  ) {
    super(message);
    this.name = 'DiffError';
  }
}

export interface CreateDiffOptions {
  contextLines?: number;        // Context lines (default: 3)
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
  includeHeader?: boolean;      // Include file header (default: true)
}

export interface ValidationResult {
  valid: boolean;
  applicable: boolean;          // Can be applied
  conflicts: ConflictInfo[];    // Expected conflicts
  warnings: string[];
}

export interface ConflictInfo {
  hunkIndex: number;
  line: number;
  description: string;
}

// Parsed diff structures
export interface ParsedDiff {
  oldPath: string;
  newPath: string;
  hunks: ParsedHunk[];
}

export interface ParsedHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  context?: string;  // Optional method/class name
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'add' | 'remove';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}