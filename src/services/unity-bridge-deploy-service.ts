import * as fs from 'fs/promises';
import * as path from 'path';
import { EmbeddedScriptsProvider } from '../embedded-scripts.js';

interface DeploymentOptions {
  projectPath: string;
  forceUpdate?: boolean;
}

interface ScriptInfo {
  fileName: string;
  targetPath: string;
  version: string;
}

interface Logger {
  info(message: string): void;
  debug(message: string): void;
  error(message: string): void;
}

export class UnityBridgeDeployService {
  private logger: Logger = {
    info: (msg: string) => console.error(`[Unity MCP Deploy] ${msg}`),
    debug: (msg: string) => console.error(`[Unity MCP Deploy] DEBUG: ${msg}`),
    error: (msg: string) => console.error(`[Unity MCP Deploy] ERROR: ${msg}`)
  };
  
  private scriptsProvider: EmbeddedScriptsProvider = new EmbeddedScriptsProvider();
  
  private readonly SCRIPTS: ScriptInfo[] = [
    {
      fileName: 'UnityHttpServer.cs',
      targetPath: 'Assets/Editor/MCP/UnityHttpServer.cs',
      version: '1.1.0'
    },
    {
      fileName: 'UnityMCPServerWindow.cs',
      targetPath: 'Assets/Editor/MCP/UnityMCPServerWindow.cs',
      version: '1.1.0'
    }
  ];

  async deployScripts(options: DeploymentOptions): Promise<void> {
    const { projectPath, forceUpdate = false } = options;
    
    // Validate Unity project
    const projectValidation = await this.validateUnityProject(projectPath);
    if (!projectValidation.isValid) {
      throw new Error(`Invalid Unity project: ${projectValidation.error}`);
    }

    // Create Editor/MCP directory if it doesn't exist
    const editorMCPPath = path.join(projectPath, 'Assets', 'Editor', 'MCP');
    await fs.mkdir(editorMCPPath, { recursive: true });

    // Deploy each script
    for (const script of this.SCRIPTS) {
      await this.deployScript(projectPath, script, forceUpdate);
    }

    this.logger.info('Unity MCP scripts deployed successfully');
  }

  private async deployScript(projectPath: string, script: ScriptInfo, forceUpdate: boolean): Promise<void> {
    const targetPath = path.join(projectPath, script.targetPath);

    // Check if script exists and needs update
    const needsUpdate = await this.checkNeedsUpdate(targetPath, script.version, forceUpdate);
    
    if (needsUpdate) {
      // Get script from embedded provider (now async)
      const embeddedScript = await this.scriptsProvider.getScript(script.fileName);
      if (!embeddedScript) {
        throw new Error(`Embedded script not found: ${script.fileName}`);
      }
      
      this.logger.debug(`Using embedded script: ${script.fileName} (loaded from source)`);
      
      // Remove existing files if they exist (including .meta files)
      await this.removeExistingFiles(targetPath);
      
      // Write script using the embedded provider's method (handles UTF-8 BOM)
      await this.scriptsProvider.writeScriptToFile(script.fileName, targetPath);
      
      // Generate .meta file
      await this.generateMetaFile(targetPath);
      
      this.logger.info(`Deployed ${script.fileName} to ${script.targetPath}`);
    } else {
      this.logger.debug(`${script.fileName} is up to date`);
    }
  }

  private async checkNeedsUpdate(targetPath: string, currentVersion: string, forceUpdate: boolean): Promise<boolean> {
    if (forceUpdate) {
      return true;
    }

    try {
      const content = await fs.readFile(targetPath, 'utf8');
      
      // Extract version from file
      const versionMatch = content.match(/SCRIPT_VERSION\s*=\s*"([^"]+)"/);
      if (versionMatch) {
        const installedVersion = versionMatch[1];
        return this.compareVersions(currentVersion, installedVersion) > 0;
      }
      
      // If no version found, update needed
      return true;
    } catch (error) {
      // File doesn't exist, needs deployment
      return true;
    }
  }

  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  private async generateMetaFile(filePath: string): Promise<void> {
    const metaPath = filePath + '.meta';
    
    // Check if meta file already exists
    try {
      await fs.access(metaPath);
      return; // Meta file exists, don't overwrite
    } catch {
      // Meta file doesn't exist, create it
    }

    const guid = this.generateGUID();
    const metaContent = `fileFormatVersion: 2
guid: ${guid}
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
    
    await fs.writeFile(metaPath, metaContent, 'utf8');
  }

  private async removeExistingFiles(targetPath: string): Promise<void> {
    try {
      // Remove the script file if it exists
      await fs.unlink(targetPath);
      this.logger.debug(`Removed existing file: ${targetPath}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        this.logger.debug(`Failed to remove file ${targetPath}: ${error.message}`);
      }
    }

    try {
      // Remove the .meta file if it exists
      const metaPath = targetPath + '.meta';
      await fs.unlink(metaPath);
      this.logger.debug(`Removed existing meta file: ${metaPath}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        this.logger.debug(`Failed to remove meta file ${targetPath}.meta: ${error.message}`);
      }
    }
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
  
  private async validateUnityProject(projectPath: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Check if directory exists
      const stats = await fs.stat(projectPath);
      if (!stats.isDirectory()) {
        return { isValid: false, error: 'Path is not a directory' };
      }
      
      // Check for Unity project structure
      const requiredDirs = ['Assets', 'ProjectSettings'];
      for (const dir of requiredDirs) {
        try {
          const dirPath = path.join(projectPath, dir);
          const dirStats = await fs.stat(dirPath);
          if (!dirStats.isDirectory()) {
            return { isValid: false, error: `Missing ${dir} directory` };
          }
        } catch {
          return { isValid: false, error: `Missing ${dir} directory` };
        }
      }
      
      return { isValid: true };
    } catch (error: any) {
      return { isValid: false, error: error.message };
    }
  }
}