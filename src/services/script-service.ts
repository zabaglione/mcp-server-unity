import path from 'path';
import fs from 'fs/promises';
import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import { UnityProjectValidator } from '../validators/unity-project-validator.js';
import { findFiles, ensureDirectory } from '../utils/file-utils.js';
import { FileNotFoundError } from '../errors/index.js';

export class ScriptService extends BaseService {
  private validator: UnityProjectValidator;

  constructor(logger: Logger) {
    super(logger);
    this.validator = new UnityProjectValidator();
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

    return {
      content: [
        {
          type: 'text',
          text: `Script created: ${path.relative(this.unityProject!.projectPath, filePath)}`,
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
}