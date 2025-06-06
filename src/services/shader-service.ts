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
import { UnityMetaGenerator } from '../utils/unity-meta-generator.js';

export type ShaderType = 'builtin' | 'urp' | 'hdrp' | 'urpGraph' | 'hdrpGraph';

export class ShaderService extends BaseService {
  private validator: UnityProjectValidator;
  private recentlyCreatedShaders: Map<string, string> = new Map(); // shaderName -> GUID

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

    // Create meta file for all shader types
    const guid = await UnityMetaGenerator.createMetaFile(shaderPath);
    this.logger.info(`Created shader with GUID: ${guid}`);
    
    // Store the GUID for immediate lookup
    this.recentlyCreatedShaders.set(shaderName, guid);
    
    // Determine actual shader name based on type
    let actualShaderName = shaderName;
    if (shaderType === 'builtin' || shaderType === 'urp' || shaderType === 'hdrp') {
      // For code shaders, the template uses Custom/ prefix
      actualShaderName = `Custom/${shaderName}`;
      this.recentlyCreatedShaders.set(actualShaderName, guid);
    }
    
    // For custom content, try to extract the actual shader name
    if (customContent) {
      const shaderMatch = customContent.match(/Shader\s+"([^"]+)"/i);
      if (shaderMatch) {
        actualShaderName = shaderMatch[1];
        this.recentlyCreatedShaders.set(actualShaderName, guid);
        this.logger.info(`Custom shader declares name: ${actualShaderName}`);
      }
    }

    this.logger.info(`Shader created: ${shaderPath}`);

    return {
      content: [
        {
          type: 'text',
          text: `${shaderConfig.name} shader created: ${path.relative(this.unityProject!.projectPath, shaderPath)}\nGUID: ${guid}\nShader Name: ${actualShaderName}\n\nYou can now create a material using this shader with the name: "${actualShaderName}"`,
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

  /**
   * Get shader GUID by name - searches for existing shaders or returns null
   */
  async getShaderGUID(shaderName: string): Promise<string | null> {
    this.ensureProjectSet();

    // Check recently created shaders first
    if (this.recentlyCreatedShaders.has(shaderName)) {
      const guid = this.recentlyCreatedShaders.get(shaderName)!;
      this.logger.info(`Found shader GUID in cache for ${shaderName}: ${guid}`);
      return guid;
    }

    // Remove potential shader path prefixes
    const cleanShaderName = shaderName.includes('/') ? 
      shaderName.split('/').pop()! : shaderName;
    
    this.logger.info(`Searching for shader: ${shaderName} (clean name: ${cleanShaderName})`);

    // Search for shader files
    const shaderExtensions = ['.shader', '.shadergraph'];
    
    for (const ext of shaderExtensions) {
      const files = await this.findShaderFiles(this.unityProject!.assetsPath, ext);
      this.logger.info(`Found ${files.length} ${ext} files`);
      
      for (const file of files) {
        const fileName = path.basename(file, ext);
        this.logger.info(`Checking shader file: ${fileName} at ${file}`);
        
        // For .shader files, also check the Shader declaration inside
        if (ext === '.shader') {
          try {
            const content = await fs.readFile(file, 'utf-8');
            const shaderMatch = content.match(/Shader\s+"([^"]+)"/i);
            if (shaderMatch) {
              const declaredName = shaderMatch[1];
              this.logger.info(`Shader declares name: ${declaredName}`);
              
              if (declaredName === shaderName) {
                const guid = await UnityMetaGenerator.readGUIDFromMetaFile(file);
                if (guid) {
                  this.logger.info(`Found shader GUID by declaration for ${shaderName}: ${guid}`);
                  return guid;
                }
              }
            }
          } catch (error) {
            this.logger.error(`Error reading shader file ${file}`, error);
          }
        }
        
        // Check both exact match and clean name match
        if (fileName === shaderName || fileName === cleanShaderName) {
          // Try to read GUID from meta file
          const guid = await UnityMetaGenerator.readGUIDFromMetaFile(file);
          if (guid) {
            this.logger.info(`Found shader GUID for ${shaderName}: ${guid}`);
            return guid;
          } else {
            this.logger.info(`No meta file found for shader: ${file}`);
          }
        }
      }
    }
    
    this.logger.info(`No shader found with name: ${shaderName}`);
    return null;
  }

  /**
   * Update an existing shader file
   */
  async updateShader(
    shaderName: string,
    content: string
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    // Find the shader file
    const shaderPath = await this.findShaderFile(shaderName);
    if (!shaderPath) {
      throw new Error(`Shader not found: ${shaderName}`);
    }

    // Read current content to check if it's different
    const currentContent = await fs.readFile(shaderPath, 'utf-8');
    if (currentContent === content) {
      return {
        content: [{
          type: 'text',
          text: `Shader ${shaderName} is already up to date.`
        }]
      };
    }

    // Backup current shader (optional)
    const backupPath = `${shaderPath}.backup`;
    await fs.writeFile(backupPath, currentContent, 'utf-8');

    // Update the shader
    await fs.writeFile(shaderPath, content, 'utf-8');

    // Extract the actual shader name from content
    const shaderMatch = content.match(/Shader\s+"([^"]+)"/i);
    const actualShaderName = shaderMatch ? shaderMatch[1] : shaderName;

    // Update the cache
    const guid = await UnityMetaGenerator.readGUIDFromMetaFile(shaderPath);
    if (guid) {
      this.recentlyCreatedShaders.set(actualShaderName, guid);
      if (!actualShaderName.includes('/') && content.includes('"Custom/')) {
        this.recentlyCreatedShaders.set(`Custom/${shaderName}`, guid);
      }
    }

    this.logger.info(`Shader updated: ${shaderPath}`);

    return {
      content: [{
        type: 'text',
        text: `Shader updated successfully:\n` +
              `File: ${path.relative(this.unityProject!.projectPath, shaderPath)}\n` +
              `Shader Name: ${actualShaderName}\n` +
              `Backup created: ${path.basename(backupPath)}\n\n` +
              `Note: Unity will recompile the shader automatically.`
      }]
    };
  }

  /**
   * Read shader content
   */
  async readShader(shaderName: string): Promise<CallToolResult> {
    this.ensureProjectSet();

    const shaderPath = await this.findShaderFile(shaderName);
    if (!shaderPath) {
      throw new Error(`Shader not found: ${shaderName}`);
    }

    const content = await fs.readFile(shaderPath, 'utf-8');
    const ext = path.extname(shaderPath);

    return {
      content: [{
        type: 'text',
        text: `Shader: ${shaderName}\n` +
              `File: ${path.relative(this.unityProject!.projectPath, shaderPath)}\n` +
              `Type: ${ext === '.shader' ? 'Code Shader' : 'Shader Graph'}\n\n` +
              `Content:\n${content}`
      }]
    };
  }

  /**
   * Find a shader file by name
   */
  private async findShaderFile(shaderName: string): Promise<string | null> {
    const shaderExtensions = ['.shader', '.shadergraph'];
    
    for (const ext of shaderExtensions) {
      // Try exact name with extension
      if (shaderName.endsWith(ext)) {
        const files = await this.findShaderFiles(this.unityProject!.assetsPath, ext);
        for (const file of files) {
          if (path.basename(file) === shaderName) {
            return file;
          }
        }
      }
      
      // Try without extension
      const files = await this.findShaderFiles(this.unityProject!.assetsPath, ext);
      for (const file of files) {
        const fileName = path.basename(file, ext);
        if (fileName === shaderName) {
          return file;
        }
      }
    }
    
    return null;
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