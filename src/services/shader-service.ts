import path from 'path';
import fs from 'fs/promises';
import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import { UnityProjectValidator } from '../validators/unity-project-validator.js';
import { ensureDirectory } from '../utils/file-utils.js';
import { getBuiltInShaderTemplate } from '../templates/shader-builtin-template.js';
import { getURPShaderTemplate } from '../templates/shader-urp-template.js';
import { getHDRPShaderTemplate } from '../templates/shader-hdrp-template.js';
import { getURPShaderGraphTemplate } from '../templates/shadergraph-urp-template.js';
import { getHDRPShaderGraphTemplate } from '../templates/shadergraph-hdrp-template.js';
import { CONFIG } from '../config/index.js';

export type ShaderType = 'builtin' | 'urp' | 'hdrp' | 'urpGraph' | 'hdrpGraph';

export class ShaderService extends BaseService {
  private validator: UnityProjectValidator;

  constructor(logger: Logger) {
    super(logger);
    this.validator = new UnityProjectValidator();
  }

  async createShader(
    shaderName: string,
    shaderType: ShaderType = 'builtin',
    customContent?: string
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    // Determine file extension based on shader type
    const shaderConfig = CONFIG.unity.shaderTypes[shaderType];
    const extension = shaderConfig.extension;
    const shaderFileName = this.validator.normalizeFileName(shaderName, extension);

    // Create shaders directory
    const shadersPath = path.join(this.unityProject!.assetsPath, CONFIG.unity.defaultFolders.shaders);
    await ensureDirectory(shadersPath);

    // Get appropriate template or use custom content
    let shaderContent: string;
    if (customContent) {
      shaderContent = customContent;
    } else {
      shaderContent = this.getShaderTemplate(shaderName, shaderType);
    }

    // Write shader file
    const shaderPath = path.join(shadersPath, shaderFileName);
    await fs.writeFile(shaderPath, shaderContent, 'utf-8');

    // For Shader Graph, also create the meta file
    if (shaderType === 'urpGraph' || shaderType === 'hdrpGraph') {
      await this.createShaderGraphMetaFile(shaderPath);
    }

    this.logger.info(`Shader created: ${shaderPath}`);

    return {
      content: [
        {
          type: 'text',
          text: `${shaderConfig.name} shader created: ${path.relative(this.unityProject!.projectPath, shaderPath)}`,
        },
      ],
    };
  }

  private getShaderTemplate(shaderName: string, shaderType: ShaderType): string {
    switch (shaderType) {
      case 'builtin':
        return getBuiltInShaderTemplate(shaderName);
      case 'urp':
        return getURPShaderTemplate(shaderName);
      case 'hdrp':
        return getHDRPShaderTemplate(shaderName);
      case 'urpGraph':
        return getURPShaderGraphTemplate(shaderName);
      case 'hdrpGraph':
        return getHDRPShaderGraphTemplate(shaderName);
      default:
        throw new Error(`Unknown shader type: ${shaderType}`);
    }
  }

  private async createShaderGraphMetaFile(shaderPath: string): Promise<void> {
    const metaContent = `fileFormatVersion: 2
guid: ${this.generateGUID()}
ScriptedImporter:
  internalIDToNameTable: []
  externalObjects: {}
  serializedVersion: 2
  userData: 
  assetBundleName: 
  assetBundleVariant: 
  script: {fileID: 11500000, guid: 625f186215c104763be7675aa2d941aa, type: 3}`;

    await fs.writeFile(`${shaderPath}.meta`, metaContent, 'utf-8');
  }

  private generateGUID(): string {
    // Generate a Unity-compatible GUID
    const hex = '0123456789abcdef';
    let guid = '';
    for (let i = 0; i < 32; i++) {
      guid += hex[Math.floor(Math.random() * 16)];
    }
    return guid;
  }

  async listShaders(): Promise<CallToolResult> {
    this.ensureProjectSet();

    const shaderExtensions = CONFIG.unity.assetTypes.shaders;
    const shaders: string[] = [];

    for (const ext of shaderExtensions) {
      const files = await this.findShaderFiles(this.unityProject!.assetsPath, ext);
      shaders.push(...files);
    }

    const relativePaths = shaders.map(shader =>
      path.relative(this.unityProject!.projectPath, shader)
    );

    return {
      content: [
        {
          type: 'text',
          text: `Found ${shaders.length} shaders:\n${relativePaths.join('\n')}`,
        },
      ],
    };
  }

  private async findShaderFiles(directory: string, extension: string): Promise<string[]> {
    const files: string[] = [];

    async function scanDirectory(dir: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && entry.name.endsWith(extension)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    await scanDirectory(directory);
    return files;
  }
}