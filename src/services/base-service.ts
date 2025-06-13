import { UnityProject, Logger } from '../types/index.js';
import { UnityProjectNotSetError } from '../errors/index.js';
import { UnityRefreshService } from './unity-refresh-service.js';
import path from 'path';

export abstract class BaseService {
  protected unityProject: UnityProject | null = null;
  protected logger: Logger;
  protected refreshService?: UnityRefreshService;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  setUnityProject(project: UnityProject): void {
    this.unityProject = project;
  }

  setRefreshService(refreshService: UnityRefreshService): void {
    this.refreshService = refreshService;
  }

  /**
   * Automatically refresh Unity assets after file operations
   * This ensures Unity recognizes file changes immediately
   */
  protected async refreshAfterFileOperation(assetPath?: string): Promise<void> {
    if (!this.refreshService) {
      this.logger.warn('RefreshService not set - Unity may not recognize file changes. Please manually refresh in Unity Editor.');
      return;
    }

    try {
      // Determine if this is a script or shader file that needs recompilation
      const needsRecompile = assetPath && 
        (assetPath.endsWith('.cs') || assetPath.endsWith('.shader') || assetPath.endsWith('.cginc'));
      
      await this.refreshService.refreshUnityAssets({ 
        specificFolders: assetPath ? [path.dirname(assetPath)] : undefined,
        forceRecompile: needsRecompile || undefined,
        recompileScripts: needsRecompile || undefined,
        saveAssets: true
      });
      
      this.logger.info(`Unity assets refreshed successfully${needsRecompile ? ' with script recompilation' : ''}`);
      
      if (needsRecompile) {
        this.logger.info('Script/shader file modified - Unity will recompile when focused');
      }
    } catch (error) {
      this.logger.error('Failed to refresh Unity assets:', error);
      this.logger.warn('Please manually refresh in Unity Editor (right-click -> Refresh) or use Tools > MCP > Force Refresh');
    }
  }

  protected ensureProjectSet(): void {
    if (!this.unityProject) {
      throw new UnityProjectNotSetError();
    }
  }
}