import path from 'path';
import fs from 'fs/promises';
import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import { ensureDirectory } from '../utils/file-utils.js';
import { getUnityRefreshHandlerTemplate } from '../templates/unity-refresh-handler-template.js';

export interface RefreshOptions {
  forceRecompile?: boolean;
  recompileScripts?: boolean;
  saveAssets?: boolean;
  specificFolders?: string[];
}

export interface BatchOperation {
  type: 'created' | 'modified' | 'deleted';
  path: string;
}

export class UnityRefreshService extends BaseService {
  private batchOperations: BatchOperation[] = [];
  private batchModeActive: boolean = false;
  private refreshTimeout?: NodeJS.Timeout;

  constructor(logger: Logger) {
    super(logger);
  }

  async setupRefreshHandler(): Promise<CallToolResult> {
    this.ensureProjectSet();

    // Create the refresh handler script in Editor folder
    const editorPath = path.join(this.unityProject!.assetsPath, 'Editor', 'MCP');
    await ensureDirectory(editorPath);

    const scriptPath = path.join(editorPath, 'UnityRefreshHandler.cs');
    const scriptContent = getUnityRefreshHandlerTemplate();
    
    await fs.writeFile(scriptPath, scriptContent, 'utf-8');

    this.logger.info('Unity refresh handler script created');

    return {
      content: [
        {
          type: 'text',
          text: `Unity refresh handler installed at: ${path.relative(this.unityProject!.projectPath, scriptPath)}\nUnity will now automatically detect and process refresh requests.`,
        },
      ],
    };
  }

  async refreshUnityAssets(options?: RefreshOptions): Promise<CallToolResult> {
    this.ensureProjectSet();

    const tempPath = path.join(this.unityProject!.projectPath, 'Temp');
    await ensureDirectory(tempPath);

    const triggerPath = path.join(tempPath, 'unity_refresh_trigger.txt');
    
    // Build refresh options content
    let content = '';
    if (options) {
      if (options.forceRecompile !== undefined) {
        content += `forceRecompile: ${options.forceRecompile}\n`;
      }
      if (options.recompileScripts !== undefined) {
        content += `recompileScripts: ${options.recompileScripts}\n`;
      }
      if (options.saveAssets !== undefined) {
        content += `saveAssets: ${options.saveAssets}\n`;
      }
      if (options.specificFolders) {
        options.specificFolders.forEach(folder => {
          // Ensure we're passing absolute paths for the handler to convert
          const absolutePath = path.isAbsolute(folder) ? folder : path.join(this.unityProject!.projectPath, folder);
          content += `folder: ${absolutePath}\n`;
        });
      }
    }

    // Write trigger file with timestamp to ensure change detection
    const timestampedContent = `timestamp: ${Date.now()}\n${content || 'refresh'}`;
    await fs.writeFile(triggerPath, timestampedContent, 'utf-8');
    
    // Also touch the file to ensure filesystem watcher triggers
    const now = new Date();
    await fs.utimes(triggerPath, now, now);

    this.logger.info('Unity refresh triggered with timestamp');

    // Create a lock file to ensure Unity processes the refresh
    const lockPath = path.join(tempPath, 'unity_refresh_lock.txt');
    await fs.writeFile(lockPath, 'processing', 'utf-8');
    
    // Remove lock after a short delay
    setTimeout(async () => {
      try {
        await fs.unlink(lockPath);
      } catch (e) {
        // Ignore if already deleted
      }
    }, 1000);

    return {
      content: [
        {
          type: 'text',
          text: `Unity asset refresh triggered${options?.forceRecompile ? ' with script recompilation' : ''}. Unity Editor will process the refresh when it gains focus or within 5 seconds.`,
        },
      ],
    };
  }

  async startBatchOperation(): Promise<CallToolResult> {
    this.batchModeActive = true;
    this.batchOperations = [];
    
    // Clear any existing timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    this.logger.info('Batch operation mode started');

    return {
      content: [
        {
          type: 'text',
          text: 'Batch operation mode activated. File operations will be queued for a single refresh.',
        },
      ],
    };
  }

  async endBatchOperation(): Promise<CallToolResult> {
    if (!this.batchModeActive) {
      return {
        content: [
          {
            type: 'text',
            text: 'No batch operation is currently active.',
          },
        ],
      };
    }

    this.batchModeActive = false;
    
    if (this.batchOperations.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'Batch operation ended with no operations to process.',
          },
        ],
      };
    }

    // Process batch operations
    await this.processBatchOperations();

    const operationCount = this.batchOperations.length;
    this.batchOperations = [];

    return {
      content: [
        {
          type: 'text',
          text: `Batch operation completed. Processed ${operationCount} operations and triggered Unity refresh.`,
        },
      ],
    };
  }

  async addBatchOperation(operation: BatchOperation): Promise<void> {
    if (this.batchModeActive) {
      this.batchOperations.push(operation);
      
      // Reset auto-end timeout
      if (this.refreshTimeout) {
        clearTimeout(this.refreshTimeout);
      }
      
      // Auto-end batch after 5 seconds of inactivity
      this.refreshTimeout = setTimeout(() => {
        this.endBatchOperation().catch(err => 
          this.logger.error('Error auto-ending batch operation', err)
        );
      }, 5000);
    }
  }

  private async processBatchOperations(): Promise<void> {
    if (!this.unityProject || this.batchOperations.length === 0) return;

    const tempPath = path.join(this.unityProject.projectPath, 'Temp');
    await ensureDirectory(tempPath);

    const batchPath = path.join(tempPath, 'unity_batch_operation.txt');
    
    // Build batch operation content
    const content = this.batchOperations
      .map(op => `${op.type}: ${op.path}`)
      .join('\n');

    // Write batch file
    await fs.writeFile(batchPath, content, 'utf-8');

    this.logger.info(`Batch operations written: ${this.batchOperations.length} operations`);
  }

  async createAssetWithRefresh<T>(
    createFn: () => Promise<T>,
    assetPath: string,
    forceRecompile: boolean = false
  ): Promise<T> {
    // If in batch mode, just add to operations
    if (this.batchModeActive) {
      const result = await createFn();
      await this.addBatchOperation({
        type: 'created',
        path: assetPath,
      });
      return result;
    }

    // Otherwise, create and refresh
    const result = await createFn();
    
    // Determine if recompilation is needed
    const needsRecompile = forceRecompile || 
      assetPath.endsWith('.cs') || 
      assetPath.endsWith('.shader') ||
      assetPath.endsWith('.cginc') ||
      assetPath.endsWith('.hlsl');

    await this.refreshUnityAssets({
      forceRecompile: needsRecompile,
      recompileScripts: needsRecompile,
      specificFolders: [path.dirname(assetPath)],
    });

    return result;
  }

  isBatchModeActive(): boolean {
    return this.batchModeActive;
  }
}