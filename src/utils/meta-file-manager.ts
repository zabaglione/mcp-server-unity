import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { pathExists } from './file-utils.js';
import { Logger } from '../types/index.js';

export class MetaFileManager {
  constructor(private logger: Logger) {}

  /**
   * Generate a Unity meta file for an asset
   */
  async generateMetaFile(assetPath: string): Promise<boolean> {
    const metaPath = `${assetPath}.meta`;
    
    // Check if meta file already exists
    if (await pathExists(metaPath)) {
      this.logger.info(`Meta file already exists: ${metaPath}`);
      return true;
    }

    try {
      const guid = this.generateGUID(assetPath);
      const fileType = this.getFileType(assetPath);
      const metaContent = this.createMetaContent(guid, fileType);
      
      await fs.writeFile(metaPath, metaContent, 'utf-8');
      this.logger.info(`Generated meta file: ${metaPath}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to generate meta file for ${assetPath}`, error);
      return false;
    }
  }

  /**
   * Generate meta files for all assets in a directory
   */
  async generateMetaFilesRecursive(dirPath: string): Promise<number> {
    let generatedCount = 0;
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        // Skip hidden files, meta files, and certain directories
        if (entry.name.startsWith('.') || 
            entry.name.endsWith('.meta') ||
            entry.name === 'Library' ||
            entry.name === 'Temp' ||
            entry.name === 'Logs' ||
            entry.name === 'UserSettings') {
          continue;
        }
        
        if (entry.isDirectory()) {
          // Recursively process subdirectories
          generatedCount += await this.generateMetaFilesRecursive(fullPath);
        } else {
          // Generate meta file for regular files
          const success = await this.generateMetaFile(fullPath);
          if (success) {
            generatedCount++;
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error processing directory ${dirPath}`, error);
    }
    
    return generatedCount;
  }

  /**
   * Validate and fix meta files in a project
   */
  async validateMetaFiles(projectPath: string): Promise<{
    missing: string[];
    orphaned: string[];
    fixed: number;
  }> {
    const assetsPath = path.join(projectPath, 'Assets');
    const missing: string[] = [];
    const orphaned: string[] = [];
    let fixed = 0;

    // Find all files that should have meta files
    const files = await this.findAllAssets(assetsPath);
    
    for (const file of files) {
      const metaPath = `${file}.meta`;
      if (!await pathExists(metaPath)) {
        missing.push(path.relative(assetsPath, file));
        
        // Try to fix by generating meta file
        const success = await this.generateMetaFile(file);
        if (success) {
          fixed++;
        }
      }
    }

    // Find orphaned meta files
    const metaFiles = await this.findAllMetaFiles(assetsPath);
    
    for (const metaFile of metaFiles) {
      const assetPath = metaFile.slice(0, -5); // Remove .meta extension
      if (!await pathExists(assetPath)) {
        orphaned.push(path.relative(assetsPath, metaFile));
      }
    }

    return { missing, orphaned, fixed };
  }

  /**
   * Generate a deterministic GUID for a file path
   */
  private generateGUID(filePath: string): string {
    // Use relative path from Assets folder for consistency
    const relativePath = filePath.includes('Assets') 
      ? filePath.substring(filePath.indexOf('Assets'))
      : filePath;
    
    // Create hash from file path
    const hash = createHash('md5').update(relativePath).digest('hex');
    
    // Format as Unity GUID (32 characters)
    return hash.substring(0, 32);
  }

  /**
   * Determine Unity file type ID
   */
  private getFileType(filePath: string): number {
    const ext = path.extname(filePath).toLowerCase();
    
    const fileTypes: { [key: string]: number } = {
      '.cs': 11500000,      // MonoScript
      '.js': 11500000,      // MonoScript
      '.boo': 11500000,     // MonoScript
      '.shader': 4800000,   // Shader
      '.cginc': 4800000,    // Shader include
      '.hlsl': 4800000,     // Shader
      '.txt': 4900000,      // TextAsset
      '.xml': 4900000,      // TextAsset
      '.json': 4900000,     // TextAsset
      '.yaml': 4900000,     // TextAsset
      '.bytes': 4900000,    // TextAsset
      '.html': 4900000,     // TextAsset
      '.htm': 4900000,      // TextAsset
      '.css': 4900000,      // TextAsset
      '.csv': 4900000,      // TextAsset
      '.md': 4900000,       // TextAsset
      '.mat': 2100000,      // Material
      '.prefab': 1001480,   // Prefab
      '.unity': 102900000,  // Scene
      '.asset': 11400000,   // ScriptableObject
      '.png': 2800000,      // Texture2D
      '.jpg': 2800000,      // Texture2D
      '.jpeg': 2800000,     // Texture2D
      '.gif': 2800000,      // Texture2D
      '.bmp': 2800000,      // Texture2D
      '.tga': 2800000,      // Texture2D
      '.tiff': 2800000,     // Texture2D
      '.tif': 2800000,      // Texture2D
      '.psd': 2800000,      // Texture2D
      '.mp3': 8300000,      // AudioClip
      '.wav': 8300000,      // AudioClip
      '.ogg': 8300000,      // AudioClip
      '.aif': 8300000,      // AudioClip
      '.aiff': 8300000,     // AudioClip
      '.mod': 8300000,      // AudioClip
      '.xm': 8300000,       // AudioClip
      '.s3m': 8300000,      // AudioClip
      '.it': 8300000,       // AudioClip
      '.fbx': 7400000,      // ModelImporter
      '.obj': 7400000,      // ModelImporter
      '.3ds': 7400000,      // ModelImporter
      '.dae': 7400000,      // ModelImporter
      '.blend': 7400000,    // ModelImporter
      '.ttf': 12800000,     // Font
      '.otf': 12800000,     // Font
      '.anim': 7400003,     // AnimationClip
      '.controller': 9100000, // AnimatorController
      '.overrideController': 22100000, // AnimatorOverrideController
      '.mask': 31900000,    // AvatarMask
      '.rendertexture': 8400000, // RenderTexture
      '.flare': 12100000,   // Flare
      '.fontsettings': 12800000, // Font
      '.guiskin': 11400000, // GUISkin
      '.dll': 102900000,    // PluginImporter
    };
    
    // Handle directories
    if (!ext) {
      return 102900000; // Default folder
    }
    
    return fileTypes[ext] || 102900000; // Default type
  }

  /**
   * Create meta file content
   */
  private createMetaContent(guid: string, fileType: number): string {
    // const timestamp = Math.floor(Date.now() / 1000);
    
    // Basic meta file template
    let content = `fileFormatVersion: 2
guid: ${guid}`;

    // Add specific importer settings based on file type
    if (fileType === 11500000) { // MonoScript
      content += `
MonoImporter:
  externalObjects: {}
  serializedVersion: 2
  defaultReferences: []
  executionOrder: 0
  icon: {instanceID: 0}
  userData: 
  assetBundleName: 
  assetBundleVariant: `;
    } else if (fileType === 2800000) { // Texture2D
      content += `
TextureImporter:
  internalIDToNameTable: []
  externalObjects: {}
  serializedVersion: 11
  mipmaps:
    mipMapMode: 0
    enableMipMap: 1
    sRGBTexture: 1
    linearTexture: 0
    fadeOut: 0
    borderMipMap: 0
    mipMapsPreserveCoverage: 0
    alphaTestReferenceValue: 0.5
    mipMapFadeDistanceStart: 1
    mipMapFadeDistanceEnd: 3
  bumpmap:
    convertToNormalMap: 0
    externalNormalMap: 0
    heightScale: 0.25
    normalMapFilter: 0
  isReadable: 0
  streamingMipmaps: 0
  streamingMipmapsPriority: 0
  vTOnly: 0
  grayScaleToAlpha: 0
  generateCubemap: 6
  cubemapConvolution: 0
  seamlessCubemap: 0
  textureFormat: 1
  maxTextureSize: 2048
  textureSettings:
    serializedVersion: 2
    filterMode: -1
    aniso: -1
    mipBias: -100
    wrapU: -1
    wrapV: -1
    wrapW: -1
  nPOTScale: 1
  lightmap: 0
  compressionQuality: 50
  spriteMode: 0
  spriteExtrude: 1
  spriteMeshType: 1
  alignment: 0
  spritePivot: {x: 0.5, y: 0.5}
  spritePixelsToUnits: 100
  spriteBorder: {x: 0, y: 0, z: 0, w: 0}
  spriteGenerateFallbackPhysicsShape: 1
  alphaUsage: 1
  alphaIsTransparency: 0
  spriteTessellationDetail: -1
  textureType: 0
  textureShape: 1
  singleChannelComponent: 0
  flipbookRows: 1
  flipbookColumns: 1
  maxTextureSizeSet: 0
  compressionQualitySet: 0
  textureFormatSet: 0
  ignorePngGamma: 0
  applyGammaDecoding: 0
  platformSettings:
  - serializedVersion: 3
    buildTarget: DefaultTexturePlatform
    maxTextureSize: 2048
    resizeAlgorithm: 0
    textureFormat: -1
    textureCompression: 1
    compressionQuality: 50
    crunchedCompression: 0
    allowsAlphaSplitting: 0
    overridden: 0
    androidETC2FallbackOverride: 0
    forceMaximumCompressionQuality_BC6H_BC7: 0
  spriteSheet:
    serializedVersion: 2
    sprites: []
    outline: []
    physicsShape: []
    bones: []
    spriteID: 
    internalID: 0
    vertices: []
    indices: 
    edges: []
    weights: []
    secondaryTextures: []
  spritePackingTag: 
  pSDRemoveMatte: 0
  pSDShowRemoveMatteOption: 0
  userData: 
  assetBundleName: 
  assetBundleVariant: `;
    } else if (fileType === 102900000) { // Folder
      content += `
folderAsset: yes
DefaultImporter:
  externalObjects: {}
  userData: 
  assetBundleName: 
  assetBundleVariant: `;
    } else {
      // Default importer for other types
      content += `
DefaultImporter:
  externalObjects: {}
  userData: 
  assetBundleName: 
  assetBundleVariant: `;
    }
    
    return content;
  }

  /**
   * Find all assets in a directory (excluding meta files)
   */
  private async findAllAssets(dirPath: string, assets: string[] = []): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        // Skip hidden files, meta files, and system directories
        if (entry.name.startsWith('.') || 
            entry.name.endsWith('.meta') ||
            ['Library', 'Temp', 'Logs', 'UserSettings', 'obj'].includes(entry.name)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await this.findAllAssets(fullPath, assets);
        } else {
          assets.push(fullPath);
        }
      }
    } catch (error) {
      this.logger.error(`Error scanning directory ${dirPath}`, error);
    }
    
    return assets;
  }

  /**
   * Find all meta files in a directory
   */
  private async findAllMetaFiles(dirPath: string, metaFiles: string[] = []): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.name.endsWith('.meta')) {
          metaFiles.push(fullPath);
        } else if (entry.isDirectory() && 
                   !['Library', 'Temp', 'Logs', 'UserSettings', 'obj'].includes(entry.name)) {
          await this.findAllMetaFiles(fullPath, metaFiles);
        }
      }
    } catch (error) {
      this.logger.error(`Error scanning directory ${dirPath}`, error);
    }
    
    return metaFiles;
  }
}