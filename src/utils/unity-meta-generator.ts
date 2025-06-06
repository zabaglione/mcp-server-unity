import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

/**
 * Unity meta file generator for proper asset GUID management
 */
export class UnityMetaGenerator {
  /**
   * Generate a Unity-compatible GUID
   */
  static generateGUID(): string {
    // Unity uses 32 character hex GUIDs
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Create a .meta file for a shader
   */
  static async createShaderMetaFile(shaderPath: string, guid?: string): Promise<string> {
    const metaPath = `${shaderPath}.meta`;
    const generatedGuid = guid || this.generateGUID();
    
    const metaContent = `fileFormatVersion: 2
guid: ${generatedGuid}
ShaderImporter:
  externalObjects: {}
  defaultTextures: []
  nonModifiableTextures: []
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;

    await fs.writeFile(metaPath, metaContent, 'utf-8');
    return generatedGuid;
  }

  /**
   * Create a .meta file for a ShaderGraph
   */
  static async createShaderGraphMetaFile(shaderGraphPath: string, guid?: string): Promise<string> {
    const metaPath = `${shaderGraphPath}.meta`;
    const generatedGuid = guid || this.generateGUID();
    
    const metaContent = `fileFormatVersion: 2
guid: ${generatedGuid}
ScriptedImporter:
  internalIDToNameTable: []
  externalObjects: {}
  serializedVersion: 2
  userData: 
  assetBundleName: 
  assetBundleVariant: 
  script: {fileID: 11500000, guid: 625f186215c104763be7675aa2d941aa, type: 3}
`;

    await fs.writeFile(metaPath, metaContent, 'utf-8');
    return generatedGuid;
  }

  /**
   * Create a .meta file for a material
   */
  static async createMaterialMetaFile(materialPath: string, guid?: string): Promise<string> {
    const metaPath = `${materialPath}.meta`;
    const generatedGuid = guid || this.generateGUID();
    
    const metaContent = `fileFormatVersion: 2
guid: ${generatedGuid}
NativeFormatImporter:
  externalObjects: {}
  mainObjectFileID: 2100000
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;

    await fs.writeFile(metaPath, metaContent, 'utf-8');
    return generatedGuid;
  }

  /**
   * Create a .meta file for a C# script
   */
  static async createScriptMetaFile(scriptPath: string, guid?: string): Promise<string> {
    const metaPath = `${scriptPath}.meta`;
    const generatedGuid = guid || this.generateGUID();
    
    const metaContent = `fileFormatVersion: 2
guid: ${generatedGuid}
MonoImporter:
  externalObjects: {}
  serializedVersion: 2
  defaultReferences: []
  executionOrder: 0
  icon: {instanceID: 0}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;

    await fs.writeFile(metaPath, metaContent, 'utf-8');
    return generatedGuid;
  }

  /**
   * Create a .meta file for a scene
   */
  static async createSceneMetaFile(scenePath: string, guid?: string): Promise<string> {
    const metaPath = `${scenePath}.meta`;
    const generatedGuid = guid || this.generateGUID();
    
    const metaContent = `fileFormatVersion: 2
guid: ${generatedGuid}
DefaultImporter:
  externalObjects: {}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;

    await fs.writeFile(metaPath, metaContent, 'utf-8');
    return generatedGuid;
  }

  /**
   * Read GUID from existing .meta file
   */
  static async readGUIDFromMetaFile(assetPath: string): Promise<string | null> {
    const metaPath = `${assetPath}.meta`;
    
    try {
      const content = await fs.readFile(metaPath, 'utf-8');
      const guidMatch = content.match(/guid: ([a-f0-9]{32})/);
      return guidMatch ? guidMatch[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if .meta file exists
   */
  static async metaFileExists(assetPath: string): Promise<boolean> {
    const metaPath = `${assetPath}.meta`;
    
    try {
      await fs.access(metaPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create appropriate .meta file based on file extension
   */
  static async createMetaFile(assetPath: string, guid?: string): Promise<string> {
    const ext = path.extname(assetPath).toLowerCase();
    
    switch (ext) {
      case '.shader':
        return this.createShaderMetaFile(assetPath, guid);
      case '.shadergraph':
        return this.createShaderGraphMetaFile(assetPath, guid);
      case '.mat':
        return this.createMaterialMetaFile(assetPath, guid);
      case '.cs':
        return this.createScriptMetaFile(assetPath, guid);
      case '.unity':
        return this.createSceneMetaFile(assetPath, guid);
      default:
        // Generic meta file for other assets
        const metaPath = `${assetPath}.meta`;
        const generatedGuid = guid || this.generateGUID();
        
        const metaContent = `fileFormatVersion: 2
guid: ${generatedGuid}
DefaultImporter:
  externalObjects: {}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;
        
        await fs.writeFile(metaPath, metaContent, 'utf-8');
        return generatedGuid;
    }
  }
}