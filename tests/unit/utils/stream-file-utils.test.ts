import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  shouldUseStreaming, 
  getFileSizeWithValidation,
  readLargeFile,
  writeLargeFile,
  FILE_SIZE_THRESHOLDS 
} from '../../../src/utils/stream-file-utils.js';

describe('StreamFileUtils', () => {
  const testDir = path.join(process.cwd(), 'test-temp-stream');
  
  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });
  
  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  describe('shouldUseStreaming', () => {
    it('should return false for non-existent files', async () => {
      const result = await shouldUseStreaming(path.join(testDir, 'nonexistent.txt'));
      expect(result).toBe(false);
    });
    
    it('should return false for small files', async () => {
      const filePath = path.join(testDir, 'small.txt');
      await fs.writeFile(filePath, 'small content');
      
      const result = await shouldUseStreaming(filePath);
      expect(result).toBe(false);
    });
    
    it('should return true for large files', async () => {
      const filePath = path.join(testDir, 'large.txt');
      // Create a file just over the threshold
      const largeContent = 'x'.repeat(FILE_SIZE_THRESHOLDS.STREAMING_THRESHOLD + 1);
      await fs.writeFile(filePath, largeContent);
      
      const result = await shouldUseStreaming(filePath);
      expect(result).toBe(true);
    });
  });
  
  describe('getFileSizeWithValidation', () => {
    it('should return file size for valid files', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'test content';
      await fs.writeFile(filePath, content);
      
      const size = await getFileSizeWithValidation(filePath);
      expect(size).toBe(Buffer.byteLength(content));
    });
    
    it('should throw error for files exceeding max size', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'test');
      
      // Mock the stat to return a very large size
      const originalStat = fs.stat;
      (fs as any).stat = async () => ({ size: FILE_SIZE_THRESHOLDS.MAX_FILE_SIZE + 1 });
      
      await expect(getFileSizeWithValidation(filePath)).rejects.toThrow(/exceeds maximum allowed size/);
      
      // Restore original
      (fs as any).stat = originalStat;
    });
  });
  
  describe('readLargeFile', () => {
    it('should read file content correctly', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'test content for reading';
      await fs.writeFile(filePath, content);
      
      const readContent = await readLargeFile(filePath);
      expect(readContent).toBe(content);
    });
    
    it('should handle large files', async () => {
      const filePath = path.join(testDir, 'large.txt');
      // Create content with multiple chunks
      const chunk = 'x'.repeat(1024); // 1KB
      const chunks = 100; // 100KB total
      const content = Array(chunks).fill(chunk).join('');
      await fs.writeFile(filePath, content);
      
      const readContent = await readLargeFile(filePath);
      expect(readContent.length).toBe(content.length);
      expect(readContent).toBe(content);
    });
  });
  
  describe('writeLargeFile', () => {
    it('should write small files directly', async () => {
      const filePath = path.join(testDir, 'small.txt');
      const content = 'small content';
      
      await writeLargeFile(filePath, content);
      
      const readContent = await fs.readFile(filePath, 'utf-8');
      expect(readContent).toBe(content);
    });
    
    it('should use streaming for large content', async () => {
      const filePath = path.join(testDir, 'large.txt');
      // Create content just over the streaming threshold
      const content = 'x'.repeat(FILE_SIZE_THRESHOLDS.STREAMING_THRESHOLD + 1);
      
      await writeLargeFile(filePath, content);
      
      const readContent = await fs.readFile(filePath, 'utf-8');
      expect(readContent.length).toBe(content.length);
      expect(readContent).toBe(content);
    });
    
    it('should throw error for content exceeding max size', async () => {
      const filePath = path.join(testDir, 'huge.txt');
      
      // Mock Buffer.byteLength to return a very large size
      const originalByteLength = Buffer.byteLength;
      (Buffer as any).byteLength = () => FILE_SIZE_THRESHOLDS.MAX_FILE_SIZE + 1;
      
      await expect(writeLargeFile(filePath, 'test')).rejects.toThrow(/exceeds maximum allowed size/);
      
      // Restore original
      (Buffer as any).byteLength = originalByteLength;
    });
  });
});