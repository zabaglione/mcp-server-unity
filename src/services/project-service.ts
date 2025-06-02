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

    return {
      content: [
        {
          type: 'text',
          text: `Unity Project Information:
Project Path: ${this.unityProject!.projectPath}
Unity Version: ${unityVersion}`,
        },
      ],
    };
  }

  getProject(): UnityProject | null {
    return this.unityProject;
  }
}