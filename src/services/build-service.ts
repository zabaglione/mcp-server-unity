import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import { UnityProjectValidator } from '../validators/unity-project-validator.js';
import { BuildError } from '../errors/index.js';
import { CONFIG } from '../config/index.js';

const execAsync = promisify(exec);

export class BuildService extends BaseService {
  private validator: UnityProjectValidator;

  constructor(logger: Logger) {
    super(logger);
    this.validator = new UnityProjectValidator();
  }

  async buildProject(target: string, outputPath: string): Promise<CallToolResult> {
    this.ensureProjectSet();

    if (!this.validator.validateBuildTarget(target)) {
      throw new BuildError(`Invalid build target: ${target}`);
    }

    const unityCommand = this.getUnityCommand();
    const buildCommand = `"${unityCommand}" -batchmode -quit -projectPath "${this.unityProject!.projectPath}" -buildTarget ${target} -buildPath "${outputPath}"`;

    this.logger.info(`Starting build for target: ${target}`);

    try {
      const { stdout } = await execAsync(buildCommand);
      
      this.logger.info('Build completed successfully');

      return {
        content: [
          {
            type: 'text',
            text: `Build completed successfully!\nOutput: ${outputPath}\n${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      this.logger.error('Build failed', error);
      throw new BuildError(`Build failed: ${error.message}\n${error.stderr}`);
    }
  }

  private getUnityCommand(): string {
    const platform = process.platform as keyof typeof CONFIG.paths;
    return CONFIG.paths[platform] || CONFIG.paths.linux;
  }
}