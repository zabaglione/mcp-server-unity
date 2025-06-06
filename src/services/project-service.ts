import path from 'path';
import fs from 'fs/promises';
import { UnityProject, Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import { UnityProjectValidator } from '../validators/unity-project-validator.js';
import { ensureDirectory } from '../utils/file-utils.js';

export class ProjectService extends BaseService {
  private validator: UnityProjectValidator;

  constructor(logger: Logger) {
    super(logger);
    this.validator = new UnityProjectValidator();
  }

  async setProject(projectPath: string): Promise<CallToolResult> {
    try {
      await this.validator.validate(projectPath);

      const assetsPath = path.join(projectPath, 'Assets');
      const scriptsPath = path.join(assetsPath, 'Scripts');
      
      await ensureDirectory(scriptsPath);

      this.unityProject = {
        projectPath,
        assetsPath,
        scriptsPath,
      };

      this.logger.info(`Unity project set to: ${projectPath}`);

      return {
        content: [
          {
            type: 'text',
            text: `Unity project set to: ${projectPath}`,
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Failed to set Unity project`, error);
      throw new Error(`Failed to set Unity project: ${error}`);
    }
  }

  async getProjectInfo(): Promise<CallToolResult> {
    this.ensureProjectSet();

    const projectVersionPath = path.join(
      this.unityProject!.projectPath,
      'ProjectSettings',
      'ProjectVersion.txt'
    );

    let unityVersion = 'Unknown';
    try {
      const versionContent = await fs.readFile(projectVersionPath, 'utf-8');
      const versionMatch = versionContent.match(/m_EditorVersion: (.+)/);
      if (versionMatch) {
        unityVersion = versionMatch[1];
      }
    } catch (error) {
      this.logger.debug('Version file not found');
    }

    // Detect render pipeline
    const renderPipeline = await this.detectRenderPipeline();

    return {
      content: [
        {
          type: 'text',
          text: `Unity Project Information:
Project Path: ${this.unityProject!.projectPath}
Unity Version: ${unityVersion}
Render Pipeline: ${renderPipeline}`,
        },
      ],
    };
  }

  async detectRenderPipeline(): Promise<string> {
    try {
      const graphicsSettingsPath = path.join(
        this.unityProject!.projectPath,
        'ProjectSettings',
        'GraphicsSettings.asset'
      );
      
      const content = await fs.readFile(graphicsSettingsPath, 'utf-8');
      
      // Check if a custom render pipeline is set
      if (content.includes('m_CustomRenderPipeline:') && !content.includes('m_CustomRenderPipeline: {fileID: 0}')) {
        // Check for URP-specific settings or package presence
        const packageCachePath = path.join(
          this.unityProject!.projectPath,
          'Library',
          'PackageCache'
        );
        
        try {
          const packageDirs = await fs.readdir(packageCachePath);
          const hasURP = packageDirs.some(dir => dir.includes('com.unity.render-pipelines.universal'));
          const hasHDRP = packageDirs.some(dir => dir.includes('com.unity.render-pipelines.high-definition'));
          
          if (hasURP) {
            return 'Universal Render Pipeline (URP)';
          } else if (hasHDRP) {
            return 'High Definition Render Pipeline (HDRP)';
          }
        } catch {
          // If we can't read package cache, check for render pipeline assets in Settings folder
          const settingsPath = path.join(this.unityProject!.projectPath, 'Assets', 'Settings');
          try {
            const files = await fs.readdir(settingsPath);
            // Look for common URP/HDRP asset naming patterns
            const hasURPAssets = files.some(file => 
              file.includes('URP') || 
              file.includes('UniversalRenderPipeline') ||
              file.includes('_RPAsset')
            );
            const hasHDRPAssets = files.some(file => 
              file.includes('HDRP') || 
              file.includes('HDRenderPipeline')
            );
            
            if (hasURPAssets) {
              return 'Universal Render Pipeline (URP)';
            } else if (hasHDRPAssets) {
              return 'High Definition Render Pipeline (HDRP)';
            }
          } catch {
            // Settings folder might not exist
          }
        }
        
        // If we have a custom pipeline but can't determine which one
        return 'Custom Render Pipeline';
      } else {
        return 'Built-in Render Pipeline';
      }
    } catch {
      return 'Unknown (Could not read GraphicsSettings)';
    }
  }

  getProject(): UnityProject | null {
    return this.unityProject;
  }
}