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
  readLargeFile
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

    // Read original to preserve BOM if present
    let originalContent: string | null = null;
    try {
      const stats = await fs.stat(scriptPath);
      if (stats.size < 10 * 1024 * 1024) { // 10MB threshold
        originalContent = await fs.readFile(scriptPath, 'utf-8');
      }
    } catch {
      // File doesn't exist or can't be read, that's ok
    }

    // Preserve BOM if original file had it
    let finalContent = content;
    if (originalContent !== null) {
      const { preserveBOM } = await import('../utils/utf8-utils.js');
      finalContent = preserveBOM(originalContent, content);
    }

    // Use atomic write to prevent corruption
    const { writeFileAtomic } = await import('../utils/atomic-write.js');
    const contentSize = Buffer.byteLength(finalContent, 'utf8');
    const streamingThreshold = 1 * 1024 * 1024; // 1MB instead of 10MB
    
    if (contentSize > streamingThreshold) {
      this.logger.info(`Updating large script file (${Math.round(contentSize / 1024 / 1024)}MB) using streaming...`);
    }
    
    await writeFileAtomic(scriptPath, finalContent, 'utf-8');
    this.logger.info(`Updated script: ${scriptPath}`);

    // Trigger Unity refresh if available
    if (this.refreshService) {
      await this.refreshService.refreshUnityAssets();
    }

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
    const originalContent = await fs.readFile(scriptPath, 'utf-8');
    const { hasUTF8BOM, removeUTF8BOM, ensureUTF8BOM } = await import('../utils/utf8-utils.js');
    
    // Detect BOM presence but DON'T remove it yet
    const hadBOM = hasUTF8BOM(originalContent);
    
    // Apply patches directly to the original content (including BOM if present)
    let content = originalContent;
    
    // Apply patches in reverse order to maintain indices
    const sortedPatches = patches.sort((a, b) => b.start - a.start);
    
    for (const patch of sortedPatches) {
      // Validate patch boundaries
      if (patch.start < 0 || patch.end > content.length || patch.start > patch.end) {
        throw new Error(`Invalid patch range: ${patch.start}-${patch.end} (content length: ${content.length})`);
      }
      
      // Log patch details for debugging
      this.logger.debug(`Applying patch: start=${patch.start}, end=${patch.end}, replacement="${patch.replacement.substring(0, 50)}..."`);
      this.logger.debug(`Original text: "${content.substring(patch.start, patch.end)}"`);
      
      // Apply the patch
      content = content.substring(0, patch.start) + 
                patch.replacement + 
                content.substring(patch.end);
    }
    
    // Ensure BOM consistency
    if (hadBOM && !hasUTF8BOM(content)) {
      content = ensureUTF8BOM(content);
    } else if (!hadBOM && hasUTF8BOM(content)) {
      content = removeUTF8BOM(content);
    }
    
    // Write updated content atomically
    const { writeFileAtomic } = await import('../utils/atomic-write.js');
    await writeFileAtomic(scriptPath, content, 'utf-8');
    
    this.logger.info(`Applied ${patches.length} patches to script: ${scriptPath}`);

    // Trigger Unity refresh if available
    if (this.refreshService) {
      await this.refreshService.refreshUnityAssets();
    }

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

    // For streaming transforms, we need to handle UTF-8 boundaries properly
    // So we'll read the entire file and transform it
    const content = await readLargeFile(scriptPath);
    const transformedContent = transformer(content);
    
    // Write atomically
    const { writeFileAtomic } = await import('../utils/atomic-write.js');
    await writeFileAtomic(scriptPath, transformedContent, 'utf-8');
    
    // Trigger Unity refresh if available
    if (this.refreshService) {
      await this.refreshService.refreshUnityAssets();
    }

    return {
      content: [{
        type: 'text',
        text: `Script transformed: ${path.relative(this.unityProject!.projectPath, scriptPath)}`
      }]
    };
  }
}