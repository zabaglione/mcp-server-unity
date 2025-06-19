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
  // MCP response size limit (50MB) - files larger than this may cause issues
  MCP_RESPONSE_LIMIT: 50 * 1024 * 1024, // 50MB
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
  const fileSize = await getFileSizeWithValidation(filePath);
  
  // Warn if file size exceeds MCP response limit
  if (fileSize > FILE_SIZE_THRESHOLDS.MCP_RESPONSE_LIMIT) {
    console.warn(
      `[StreamFileUtils] WARNING: File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds MCP response limit (${Math.round(FILE_SIZE_THRESHOLDS.MCP_RESPONSE_LIMIT / 1024 / 1024)}MB). ` +
      `This may cause issues when returning the content through MCP.`
    );
  }
  
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  let chunkCount = 0;
  
  // Use Buffer mode (no encoding) to properly handle binary data and UTF-8 boundaries
  const readStream = fs.createReadStream(filePath, {
    highWaterMark: FILE_SIZE_THRESHOLDS.CHUNK_SIZE,
    // Important: do not specify encoding here to get raw Buffers
  });
  
  return new Promise((resolve, reject) => {
    let streamEnded = false;
    let streamClosed = false;
    let hasError = false;
    
    readStream.on('data', (chunk) => {
      // chunk is a Buffer when no encoding is specified
      const buffer = chunk as Buffer;
      chunks.push(buffer);
      totalBytes += buffer.length;
      chunkCount++;
      
      // Log progress for large files
      if (fileSize > FILE_SIZE_THRESHOLDS.STREAMING_THRESHOLD && (chunkCount % 100 === 0 || totalBytes === fileSize)) {
        const progress = (totalBytes / fileSize * 100).toFixed(1);
        console.log(`[StreamFileUtils] Reading large file: ${progress}% (${totalBytes}/${fileSize} bytes)`);
      }
    });
    
    readStream.on('end', () => {
      streamEnded = true;
      
      if (!hasError && !streamClosed) {
        try {
          const buffer = Buffer.concat(chunks);
          const result = buffer.toString('utf8');
          
          // Final validation
          if (totalBytes !== fileSize) {
            console.warn(
              `[StreamFileUtils] File size mismatch. Expected: ${fileSize} bytes, Read: ${totalBytes} bytes. ` +
              `Difference: ${Math.abs(fileSize - totalBytes)} bytes`
            );
          }
          
          console.log(`[StreamFileUtils] Successfully read file: ${totalBytes} bytes`);
          resolve(result);
        } catch (error) {
          console.error(`[StreamFileUtils] Error concatenating/decoding buffers: ${error}`);
          reject(error);
        }
      }
    });
    
    readStream.on('close', () => {
      streamClosed = true;
      if (!streamEnded && !hasError) {
        // Stream was closed before ending - this might indicate truncation
        const error = new Error(
          `Stream closed prematurely. Read ${totalBytes}/${fileSize} bytes (${(totalBytes/fileSize*100).toFixed(1)}%)`
        );
        console.error(`[StreamFileUtils] ${error.message}`);
        reject(error);
      }
    });
    
    readStream.on('error', (error) => {
      hasError = true;
      console.error(`[StreamFileUtils] Stream error: ${error.message}`);
      reject(error);
    });
    
    // Add a timeout for very large files
    const timeoutMs = Math.max(30000, fileSize / 1024); // At least 30s, or 1ms per KB
    const timeout = setTimeout(() => {
      if (!streamEnded) {
        hasError = true;
        readStream.destroy();
        reject(new Error(
          `Timeout reading file after ${timeoutMs}ms. Read ${totalBytes}/${fileSize} bytes (${(totalBytes/fileSize*100).toFixed(1)}%)`
        ));
      }
    }, timeoutMs);
    
    // Clear timeout when done
    readStream.on('end', () => clearTimeout(timeout));
    readStream.on('error', () => clearTimeout(timeout));
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

/**
 * Read a portion of a large file (useful for previewing large files)
 */
export async function readFilePartial(
  filePath: string,
  options: {
    start?: number;
    end?: number;
    maxBytes?: number;
  } = {}
): Promise<{ content: string; truncated: boolean; totalSize: number }> {
  const stats = await fsPromises.stat(filePath);
  const fileSize = stats.size;
  
  // Determine byte range to read
  const start = options.start || 0;
  let end = options.end;
  
  if (options.maxBytes && !end) {
    end = start + options.maxBytes - 1;
  }
  
  if (!end || end >= fileSize) {
    end = fileSize - 1;
  }
  
  const truncated = end < fileSize - 1;
  
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    
    const readStream = fs.createReadStream(filePath, {
      start,
      end,
      highWaterMark: FILE_SIZE_THRESHOLDS.CHUNK_SIZE,
    });
    
    readStream.on('data', (chunk) => {
      chunks.push(chunk as Buffer);
      totalBytes += (chunk as Buffer).length;
    });
    
    readStream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const content = buffer.toString('utf8');
      
      resolve({
        content,
        truncated,
        totalSize: fileSize,
      });
    });
    
    readStream.on('error', reject);
  });
}