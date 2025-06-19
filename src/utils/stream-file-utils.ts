import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';

// File size thresholds
export const FILE_SIZE_THRESHOLDS = {
  // Use streaming for files larger than 10MB
  STREAMING_THRESHOLD: 10 * 1024 * 1024, // 10MB
  // Maximum file size we'll handle (1GB)
  MAX_FILE_SIZE: 1024 * 1024 * 1024, // 1GB
  // Chunk size for streaming operations
  CHUNK_SIZE: 64 * 1024, // 64KB chunks
};

/**
 * Check if a file should use streaming based on its size
 */
export async function shouldUseStreaming(filePath: string): Promise<boolean> {
  try {
    const stats = await fsPromises.stat(filePath);
    return stats.size > FILE_SIZE_THRESHOLDS.STREAMING_THRESHOLD;
  } catch {
    // If file doesn't exist, assume it won't need streaming
    return false;
  }
}

/**
 * Get file size with validation
 */
export async function getFileSizeWithValidation(filePath: string): Promise<number> {
  const stats = await fsPromises.stat(filePath);
  
  if (stats.size > FILE_SIZE_THRESHOLDS.MAX_FILE_SIZE) {
    throw new Error(
      `File size (${Math.round(stats.size / 1024 / 1024)}MB) exceeds maximum allowed size of ${Math.round(FILE_SIZE_THRESHOLDS.MAX_FILE_SIZE / 1024 / 1024)}MB`
    );
  }
  
  return stats.size;
}

/**
 * Read a large file using streams
 */
export async function readLargeFile(filePath: string): Promise<string> {
  await getFileSizeWithValidation(filePath);
  
  const chunks: Buffer[] = [];
  const readStream = fs.createReadStream(filePath, {
    encoding: 'utf8',
    highWaterMark: FILE_SIZE_THRESHOLDS.CHUNK_SIZE,
  });
  
  return new Promise((resolve, reject) => {
    readStream.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    
    readStream.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    
    readStream.on('error', reject);
  });
}

/**
 * Write a large file using streams
 */
export async function writeLargeFile(filePath: string, content: string): Promise<void> {
  const contentSize = Buffer.byteLength(content, 'utf8');
  
  if (contentSize > FILE_SIZE_THRESHOLDS.MAX_FILE_SIZE) {
    throw new Error(
      `Content size (${Math.round(contentSize / 1024 / 1024)}MB) exceeds maximum allowed size of ${Math.round(FILE_SIZE_THRESHOLDS.MAX_FILE_SIZE / 1024 / 1024)}MB`
    );
  }
  
  // For content that's already in memory, check if we should use streaming
  if (contentSize > FILE_SIZE_THRESHOLDS.STREAMING_THRESHOLD) {
    const writeStream = fs.createWriteStream(filePath, {
      encoding: 'utf8',
      highWaterMark: FILE_SIZE_THRESHOLDS.CHUNK_SIZE,
    });
    
    // Create a readable stream from the content
    const { Readable } = await import('stream');
    const readableStream = Readable.from([content]);
    
    await pipeline(readableStream, writeStream);
  } else {
    // For smaller files, use the standard writeFile
    await fsPromises.writeFile(filePath, content, 'utf-8');
  }
}

/**
 * Copy a large file using streams
 */
export async function copyLargeFile(sourcePath: string, destPath: string): Promise<void> {
  await getFileSizeWithValidation(sourcePath);
  
  const readStream = fs.createReadStream(sourcePath, {
    highWaterMark: FILE_SIZE_THRESHOLDS.CHUNK_SIZE,
  });
  
  const writeStream = fs.createWriteStream(destPath, {
    highWaterMark: FILE_SIZE_THRESHOLDS.CHUNK_SIZE,
  });
  
  await pipeline(readStream, writeStream);
}

/**
 * Transform file content using streams (useful for large file modifications)
 */
export async function transformLargeFile(
  inputPath: string,
  outputPath: string,
  transformFn: (chunk: string) => string
): Promise<void> {
  await getFileSizeWithValidation(inputPath);
  
  const transformStream = new Transform({
    encoding: 'utf8',
    transform(chunk, _encoding, callback) {
      try {
        const transformed = transformFn(chunk.toString());
        callback(null, transformed);
      } catch (error) {
        callback(error as Error);
      }
    },
  });
  
  const readStream = fs.createReadStream(inputPath, {
    encoding: 'utf8',
    highWaterMark: FILE_SIZE_THRESHOLDS.CHUNK_SIZE,
  });
  
  const writeStream = fs.createWriteStream(outputPath, {
    encoding: 'utf8',
    highWaterMark: FILE_SIZE_THRESHOLDS.CHUNK_SIZE,
  });
  
  await pipeline(readStream, transformStream, writeStream);
}