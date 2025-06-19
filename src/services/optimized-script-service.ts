import path from 'path';
import fs from 'fs/promises';
import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ScriptService } from './script-service.js';
import { 
  findFirstFile, 
  findFilesOptimized,
  initializeFileCache,
  warmUpCache
} from '../utils/optimized-file-utils.js';
import {
  shouldUseStreaming,
  readLargeFile,
  writeLargeFile
} from '../utils/stream-file-utils.js';

interface UpdatePatch {
  start: number;
  end: number;
  replacement: string;
}

/**
 * Optimized Script Service with caching and partial updates
 */
export class OptimizedScriptService extends ScriptService {
  private cacheInitialized: boolean = false;

  constructor(logger: Logger) {
    super(logger);
    initializeFileCache(logger);
  }

  /**
   * Initialize cache for the project
   */
  async initializeForProject(projectPath: string): Promise<void> {
    if (!this.cacheInitialized) {
      await warmUpCache(projectPath, this.logger);
      this.cacheInitialized = true;
    }
  }

  /**
   * Optimized script reading with caching
   */
  async readScript(fileName: string): Promise<CallToolResult> {
    this.ensureProjectSet();

    // Use optimized file search with cache
    const scriptPath = await findFirstFile({
      directory: this.unityProject!.assetsPath,
      fileName: path.basename(fileName, '.cs'),
      extension: '.cs',
      useCache: true
    });
    
    if (!scriptPath) {
      throw new Error(`Script not found: ${fileName}`);
    }

    // Read file content
    let content: string;
    const stats = await fs.stat(scriptPath);
    const fileSizeMB = Math.round(stats.size / 1024 / 1024);
    
    if (await shouldUseStreaming(scriptPath)) {
      this.logger.info(`Reading large script file (${fileSizeMB}MB) using streaming...`);
      content = await readLargeFile(scriptPath);
    } else {
      content = await fs.readFile(scriptPath, 'utf-8');
    }
    
    return {
      content: [{
        type: 'text',
        text: content
      }]
    };
  }

  /**
   * Optimized script update with caching
   */
  async updateScript(
    fileName: string,
    content: string
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    // Use optimized file search
    const scriptPath = await findFirstFile({
      directory: this.unityProject!.assetsPath,
      fileName: path.basename(fileName, '.cs'),
      extension: '.cs',
      useCache: true
    });
    
    if (!scriptPath) {
      throw new Error(`Script not found: ${fileName}`);
    }

    // Use streaming for large files (lower threshold for better performance)
    const contentSize = Buffer.byteLength(content, 'utf8');
    const streamingThreshold = 1 * 1024 * 1024; // 1MB instead of 10MB
    
    if (contentSize > streamingThreshold) {
      this.logger.info(`Updating large script file (${Math.round(contentSize / 1024 / 1024)}MB) using streaming...`);
      await writeLargeFile(scriptPath, content);
    } else {
      await fs.writeFile(scriptPath, content, 'utf-8');
    }
    
    this.logger.info(`Updated script: ${scriptPath}`);

    return {
      content: [{
        type: 'text',
        text: `Script updated: ${path.relative(this.unityProject!.projectPath, scriptPath)}\n\n` +
              `Note: Unity will need to recompile the script.`
      }]
    };
  }

  /**
   * Partial update for small changes (more efficient)
   */
  async updateScriptPartial(
    fileName: string,
    patches: UpdatePatch[]
  ): Promise<CallToolResult> {
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

    // Read current content
    let content = await fs.readFile(scriptPath, 'utf-8');
    
    // Apply patches in reverse order to maintain indices
    const sortedPatches = patches.sort((a, b) => b.start - a.start);
    
    for (const patch of sortedPatches) {
      if (patch.start < 0 || patch.end > content.length || patch.start > patch.end) {
        throw new Error(`Invalid patch range: ${patch.start}-${patch.end}`);
      }
      
      content = content.substring(0, patch.start) + 
                patch.replacement + 
                content.substring(patch.end);
    }
    
    // Write updated content
    await fs.writeFile(scriptPath, content, 'utf-8');
    
    this.logger.info(`Applied ${patches.length} patches to script: ${scriptPath}`);

    return {
      content: [{
        type: 'text',
        text: `Script partially updated: ${path.relative(this.unityProject!.projectPath, scriptPath)}\n` +
              `Applied ${patches.length} patches.\n\n` +
              `Note: Unity will need to recompile the script.`
      }]
    };
  }

  /**
   * List scripts with caching
   */
  async listScripts(): Promise<CallToolResult> {
    this.ensureProjectSet();

    const scripts = await findFilesOptimized({
      directory: this.unityProject!.assetsPath,
      extension: '.cs',
      useCache: true
    });
    
    const relativePaths = scripts.map(script =>
      path.relative(this.unityProject!.projectPath, script)
    );

    return {
      content: [{
        type: 'text',
        text: `Found ${scripts.length} scripts:\n${relativePaths.join('\n')}`
      }]
    };
  }

  /**
   * Stream transform for large files
   */
  async transformScriptStreaming(
    fileName: string,
    transformer: (chunk: string) => string
  ): Promise<CallToolResult> {
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

    // Create read and write streams
    const tempPath = `${scriptPath}.tmp`;
    const readStream = (await import('fs')).createReadStream(scriptPath, { encoding: 'utf8' });
    const writeStream = (await import('fs')).createWriteStream(tempPath, { encoding: 'utf8' });

    // Transform chunks
    readStream.on('data', (chunk) => {
      const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      writeStream.write(transformer(chunkStr));
    });

    // Wait for completion
    await new Promise<void>((resolve, reject) => {
      readStream.on('end', () => resolve());
      readStream.on('error', reject);
      writeStream.on('error', reject);
    });

    // Close streams
    writeStream.end();

    // Replace original file
    await fs.rename(tempPath, scriptPath);

    return {
      content: [{
        type: 'text',
        text: `Script transformed: ${path.relative(this.unityProject!.projectPath, scriptPath)}`
      }]
    };
  }
}