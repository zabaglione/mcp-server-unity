import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { Logger } from '../types/index.js';
import { pathExists } from './file-utils.js';

export interface UnityInstallation {
  path: string;
  version: string;
  isHub: boolean;
}

export class UnityDetector {
  private static logger: Logger;

  static setLogger(logger: Logger): void {
    this.logger = logger;
  }

  /**
   * Detect all Unity installations on the system
   */
  static async detectUnityInstallations(): Promise<UnityInstallation[]> {
    const installations: UnityInstallation[] = [];
    const platform = process.platform;

    // Define search patterns based on platform
    const searchPatterns = this.getSearchPatterns(platform);

    for (const pattern of searchPatterns) {
      try {
        const matches = await glob(pattern, { 
          windowsPathsNoEscape: platform === 'win32',
          absolute: true 
        });
        
        for (const match of matches) {
          if (await pathExists(match)) {
            const version = this.extractVersion(match);
            const isHub = match.includes('Hub');
            installations.push({ path: match, version, isHub });
          }
        }
      } catch (error) {
        this.logger?.info(`Error searching pattern ${pattern}: ${error}`);
      }
    }

    // Sort by version (newest first) and prefer Hub installations
    installations.sort((a, b) => {
      if (a.isHub !== b.isHub) return a.isHub ? -1 : 1;
      return this.compareVersions(b.version, a.version);
    });

    return installations;
  }

  /**
   * Get the best Unity installation (newest Hub version preferred)
   */
  static async getBestUnityPath(): Promise<string | null> {
    const installations = await this.detectUnityInstallations();
    
    if (installations.length === 0) {
      this.logger?.info('No Unity installations found');
      return null;
    }

    const best = installations[0];
    this.logger?.info(`Selected Unity ${best.version} at: ${best.path}`);
    
    return best.path;
  }

  /**
   * Get Unity version from project settings
   */
  static async getProjectUnityVersion(projectPath: string): Promise<string | null> {
    const versionFile = path.join(projectPath, 'ProjectSettings', 'ProjectVersion.txt');
    
    if (!await pathExists(versionFile)) {
      return null;
    }

    try {
      const content = await fs.readFile(versionFile, 'utf-8');
      const match = content.match(/m_EditorVersion:\s*(\S+)/);
      return match ? match[1] : null;
    } catch (error) {
      this.logger?.info(`Error reading project version: ${error}`);
      return null;
    }
  }

  /**
   * Find Unity installation matching project version
   */
  static async findUnityForProject(projectPath: string): Promise<string | null> {
    const projectVersion = await this.getProjectUnityVersion(projectPath);
    
    if (!projectVersion) {
      this.logger?.info('Could not determine project Unity version');
      return this.getBestUnityPath();
    }

    this.logger?.info(`Project requires Unity ${projectVersion}`);
    const installations = await this.detectUnityInstallations();

    // Try exact match first
    const exactMatch = installations.find(i => i.version === projectVersion);
    if (exactMatch) {
      this.logger?.info(`Found exact Unity version match: ${exactMatch.path}`);
      return exactMatch.path;
    }

    // Try compatible version (same major.minor)
    const [major, minor] = projectVersion.split('.');
    const compatible = installations.find(i => {
      const [iMajor, iMinor] = i.version.split('.');
      return iMajor === major && iMinor === minor;
    });

    if (compatible) {
      this.logger?.info(`Found compatible Unity version ${compatible.version}: ${compatible.path}`);
      return compatible.path;
    }

    // Fall back to newest version
    this.logger?.info(`No compatible Unity version found, using newest available`);
    return this.getBestUnityPath();
  }

  private static getSearchPatterns(platform: string): string[] {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    
    switch (platform) {
      case 'darwin':
        return [
          '/Applications/Unity/Hub/Editor/*/Unity.app/Contents/MacOS/Unity',
          '/Applications/Unity/Unity.app/Contents/MacOS/Unity',
          `${home}/Applications/Unity/Hub/Editor/*/Unity.app/Contents/MacOS/Unity`,
          '/Applications/Unity*/Unity.app/Contents/MacOS/Unity'
        ];
      
      case 'win32':
        return [
          'C:/Program Files/Unity/Hub/Editor/*/Editor/Unity.exe',
          'C:/Program Files/Unity/Editor/Unity.exe',
          'C:/Program Files/Unity*/Editor/Unity.exe',
          'C:/Program Files (x86)/Unity/Hub/Editor/*/Editor/Unity.exe',
          `${home}/Unity/Hub/Editor/*/Editor/Unity.exe`
        ];
      
      case 'linux':
        return [
          '/opt/Unity/Editor/Unity',
          '/opt/unity*/Editor/Unity',
          `${home}/Unity/Hub/Editor/*/Editor/Unity`,
          '/usr/bin/unity',
          '/usr/local/bin/unity'
        ];
      
      default:
        return [];
    }
  }

  private static extractVersion(unityPath: string): string {
    // Try to extract version from path
    const versionMatch = unityPath.match(/(\d+\.\d+\.\d+[a-zA-Z]\d+)/);
    if (versionMatch) {
      return versionMatch[1];
    }

    // For Unity installations without version in path
    return 'unknown';
  }

  private static compareVersions(a: string, b: string): number {
    if (a === 'unknown') return -1;
    if (b === 'unknown') return 1;

    const parseVersion = (v: string) => {
      const match = v.match(/(\d+)\.(\d+)\.(\d+)([a-zA-Z])(\d+)/);
      if (!match) return { major: 0, minor: 0, patch: 0, type: '', build: 0 };
      
      return {
        major: parseInt(match[1]),
        minor: parseInt(match[2]),
        patch: parseInt(match[3]),
        type: match[4],
        build: parseInt(match[5])
      };
    };

    const va = parseVersion(a);
    const vb = parseVersion(b);

    if (va.major !== vb.major) return va.major - vb.major;
    if (va.minor !== vb.minor) return va.minor - vb.minor;
    if (va.patch !== vb.patch) return va.patch - vb.patch;
    if (va.type !== vb.type) {
      const typeOrder: { [key: string]: number } = { 'a': 0, 'b': 1, 'f': 2, 'p': 3 };
      return (typeOrder[va.type] || 0) - (typeOrder[vb.type] || 0);
    }
    return va.build - vb.build;
  }
}