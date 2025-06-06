import path from 'path';
import fs from 'fs/promises';
import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import { UnityProjectValidator } from '../validators/unity-project-validator.js';
import { findFiles, ensureDirectory } from '../utils/file-utils.js';
import { FileNotFoundError } from '../errors/index.js';
import { MetaFileManager } from '../utils/meta-file-manager.js';

export class ScriptService extends BaseService {
  private validator: UnityProjectValidator;
  private metaFileManager: MetaFileManager;

  constructor(logger: Logger) {
    super(logger);
    this.validator = new UnityProjectValidator();
    this.metaFileManager = new MetaFileManager(logger);
  }

  async createScript(
    fileName: string,
    content: string,
    folder?: string
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    const scriptName = this.validator.normalizeFileName(fileName, '.cs');
    const targetFolder = folder
      ? path.join(this.unityProject!.scriptsPath, folder)
      : this.unityProject!.scriptsPath;

    await ensureDirectory(targetFolder);
    const filePath = path.join(targetFolder, scriptName);
    await fs.writeFile(filePath, content, 'utf-8');

    this.logger.info(`Script created: ${filePath}`);

    // Generate meta file for the script
    const metaGenerated = await this.metaFileManager.generateMetaFile(filePath);
    if (!metaGenerated) {
      this.logger.info(`Warning: Failed to generate meta file for: ${filePath}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Script created: ${path.relative(this.unityProject!.projectPath, filePath)}\n` +
                `Meta file generated: ${metaGenerated ? 'Yes' : 'No'}`,
        },
      ],
    };
  }

  async readScript(fileName: string): Promise<CallToolResult> {
    this.ensureProjectSet();

    const scriptFiles = await findFiles({
      directory: this.unityProject!.assetsPath,
      fileName,
      extension: '.cs'
    });
    
    if (scriptFiles.length === 0) {
      throw new FileNotFoundError(fileName, 'Script');
    }

    const content = await fs.readFile(scriptFiles[0], 'utf-8');
    
    return {
      content: [
        {
          type: 'text',
          text: content,
        },
      ],
    };
  }

  async listScripts(): Promise<CallToolResult> {
    this.ensureProjectSet();

    const scripts = await findFiles({
      directory: this.unityProject!.assetsPath,
      extension: '.cs'
    });
    
    const relativePaths = scripts.map(script =>
      path.relative(this.unityProject!.projectPath, script)
    );

    return {
      content: [
        {
          type: 'text',
          text: `Found ${scripts.length} scripts:\n${relativePaths.join('\n')}`,
        },
      ],
    };
  }

  async updateScript(
    fileName: string,
    content: string
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    const scriptFiles = await findFiles({
      directory: this.unityProject!.assetsPath,
      fileName,
      extension: '.cs'
    });
    
    if (scriptFiles.length === 0) {
      throw new FileNotFoundError(fileName, 'Script');
    }

    const scriptPath = scriptFiles[0];

    // Write new content
    await fs.writeFile(scriptPath, content, 'utf-8');
    this.logger.info(`Updated script: ${scriptPath}`);

    return {
      content: [
        {
          type: 'text',
          text: `Script updated: ${path.relative(this.unityProject!.projectPath, scriptPath)}\n\n` +
                `Note: Unity will need to recompile the script.`,
        },
      ],
    };
  }
}