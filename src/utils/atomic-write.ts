import fs from 'fs/promises';
import crypto from 'crypto';
import { writeLargeFile } from './stream-file-utils.js';
import { FILE_SIZE_THRESHOLDS } from './stream-file-utils.js';

/**
 * Write file atomically to prevent corruption
 * Uses a temporary file and renames it to ensure atomicity
 */
export async function writeFileAtomic(
  filePath: string,
  content: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<void> {
  // Generate unique temp file name
  const tempSuffix = crypto.randomBytes(6).toString('hex');
  const tempPath = `${filePath}.tmp.${tempSuffix}`;
  
  try {
    // Check file size to determine write method
    const contentSize = Buffer.byteLength(content, encoding);
    
    if (contentSize > FILE_SIZE_THRESHOLDS.STREAMING_THRESHOLD) {
      // Use streaming for large files
      await writeLargeFile(tempPath, content);
    } else {
      // Use standard write for smaller files
      await fs.writeFile(tempPath, content, encoding);
    }
    
    // Atomic rename - this is atomic on most filesystems
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Update file atomically with a transformer function
 * Reads the file, applies transformation, and writes atomically
 */
export async function updateFileAtomic(
  filePath: string,
  transformer: (content: string) => string | Promise<string>,
  encoding: BufferEncoding = 'utf-8'
): Promise<void> {
  // Read current content
  const currentContent = await fs.readFile(filePath, encoding);
  
  // Apply transformation
  const newContent = await transformer(currentContent);
  
  // Write atomically
  await writeFileAtomic(filePath, newContent, encoding);
}

/**
 * Copy file atomically
 */
export async function copyFileAtomic(
  sourcePath: string,
  destPath: string
): Promise<void> {
  const tempSuffix = crypto.randomBytes(6).toString('hex');
  const tempPath = `${destPath}.tmp.${tempSuffix}`;
  
  try {
    // Copy to temp file first
    await fs.copyFile(sourcePath, tempPath);
    
    // Atomic rename
    await fs.rename(tempPath, destPath);
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}